// プログラムの入口の処理．引数を読み，問い合わせを振り分けて，表示する文字列を作る．

import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { parseArgs } from "node:util";
import { createApi } from "./adapters/http-api.ts";
import { batchConcurrency, mapWithConcurrency, parseTickets, summarize } from "./batch.ts";
import { compareRecords } from "./compare.ts";
import { confusionMatrix, evaluate, parseLabeledTickets, sweep } from "./evaluate.ts";
import {
  formatCalibration,
  formatComparison,
  formatConfusionMatrix,
  formatEvaluation,
  formatReport,
  formatSummary,
  formatSweep,
  formatTriage,
} from "./format.ts";
// 発展(演習10-7)：期待較正誤差も使う
// import { buildReport, calibration, expectedCalibrationError } from "./metrics.ts";
// 発展(演習10-7)ここまで．次の1行の代わりに使う
import { buildReport, calibration } from "./metrics.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";
import { type EvalRecord, formatRecords, parseRecords, toLabeledResults } from "./records.ts";
import { defaultMinConfidence, triage, type TriageOptions } from "./triage.ts";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である．serveのときは，待ち受けているserverも返す． */
export interface RunResult {
  code: number;
  output: string;
  server?: Server;
}

const usage = [
  'usage: triage [--min-confidence <0-1>] "<subject>" "<body>"',
  "       triage batch [--min-confidence <0-1>] <file>",
  "       triage eval [--min-confidence <0-1> | --sweep] [--out <file>] <file>",
  "       triage report [--min-confidence <0-1>] [--calibration] <file>",
  "       triage compare [--min-confidence <0-1>] <file A> <file B>",
  "       triage serve [--min-confidence <0-1>] [--port <0-65535>]",
].join("\n");

/** コマンドライン引数から読んだ，実行すること． */
type Command =
  | { kind: "single"; subject: string; body: string; options: TriageOptions }
  | { kind: "batch"; file: string; options: TriageOptions }
  | { kind: "eval"; file: string; options: TriageOptions; sweep: boolean; out: string | undefined }
  | { kind: "report"; file: string; options: TriageOptions; calibration: boolean }
  | { kind: "compare"; files: { a: string; b: string }; options: TriageOptions }
  | { kind: "serve"; port: number; options: TriageOptions };

/**
 * evalで，判断エンジンへ同時に送る問い合わせの数．
 * 同時に送ると，判断エンジンでの順番待ちまで所要時間に入るので，1件ずつ送って測る．
 */
const evalConcurrency = 1;

/** serveで，--portを指定しないときに待ち受けるポート． */
const defaultPort = 3000;

/** --min-confidenceの値を読む．0から1の数でなければundefinedを返す． */
const parseOptions = (value: string | undefined): TriageOptions | undefined => {
  if (value === undefined) return {};
  const minConfidence = Number(value);
  return minConfidence >= 0 && minConfidence <= 1 ? { minConfidence } : undefined;
};

/** コマンドライン引数を読む．読めなければundefinedを返す． */
const parseCommand = (args: string[]): Command | undefined => {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      options: {
        "min-confidence": { type: "string" },
        sweep: { type: "boolean" },
        out: { type: "string" },
        calibration: { type: "boolean" },
        port: { type: "string" },
      },
      allowPositionals: true,
    });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const options = parseOptions(parsed.values["min-confidence"]);
  if (options === undefined) return undefined;
  const positionals = parsed.positionals;
  const sweep = parsed.values.sweep ?? false;
  const out = parsed.values.out;
  const showCalibration = parsed.values.calibration ?? false;
  if (positionals[0] === "eval") {
    const [, file, ...rest] = positionals;
    if (file === undefined || rest.length > 0) return undefined;
    // --sweepはしきい値を変えながら評価するので，--min-confidenceとは一緒に使えない．
    if (sweep && options.minConfidence !== undefined) return undefined;
    // --calibrationはreportでだけ使える．
    if (showCalibration) return undefined;
    return { kind: "eval", file, options, sweep, out };
  }
  // --sweepと--outはevalでだけ使える．
  if (sweep || out !== undefined) return undefined;
  if (positionals[0] === "report") {
    const [, file, ...rest] = positionals;
    return file !== undefined && rest.length === 0
      ? { kind: "report", file, options, calibration: showCalibration }
      : undefined;
  }
  // --calibrationはreportでだけ使える．
  if (showCalibration) return undefined;
  if (positionals[0] === "compare") {
    const [, a, b, ...rest] = positionals;
    return a !== undefined && b !== undefined && rest.length === 0
      ? { kind: "compare", files: { a, b }, options }
      : undefined;
  }
  const portValue = parsed.values.port;
  if (positionals[0] === "serve") {
    const port = Number(portValue ?? defaultPort);
    if (positionals.length > 1 || !Number.isInteger(port) || port < 0 || port > 65535) return undefined;
    return { kind: "serve", port, options };
  }
  // --portはserveでだけ使える．
  if (portValue !== undefined) return undefined;
  if (positionals[0] === "batch") {
    const [, file, ...rest] = positionals;
    return file !== undefined && rest.length === 0 ? { kind: "batch", file, options } : undefined;
  }
  const [subject, body, ...rest] = positionals;
  if (subject === undefined || body === undefined || rest.length > 0) return undefined;
  return { kind: "single", subject, body, options };
};

/** ファイルを読む．読めなければ，表示するメッセージを返す． */
const readText = async (file: string): Promise<{ text: string } | { error: string }> => {
  try {
    return { text: await readFile(file, "utf8") };
  } catch (error) {
    return { error: `cannot read ${file}: ${error instanceof Error ? error.message : String(error)}` };
  }
};

/** ファイルの問い合わせをまとめて振り分け，読めなかった行と集計を表示する文字列を返す． */
const runBatch = async (file: string, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  const read = await readText(file);
  if ("error" in read) return { code: 1, output: read.error };
  const { tickets, errors } = parseTickets(read.text);
  const results = await mapWithConcurrency(tickets, batchConcurrency, (ticket) => triage(engine, ticket, options));
  return { code: 0, output: [...errors, formatSummary(summarize(results))].join("\n") };
};

/** 記録をファイルに書く．書けなければ，表示するメッセージを返す． */
const writeRecords = async (file: string, records: readonly EvalRecord[]): Promise<string | undefined> => {
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, formatRecords(records));
    return undefined;
  } catch (error) {
    return `cannot write ${file}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/** 正解の付いた問い合わせを振り分け，評価を表示する文字列を返す．outがあれば，評価の記録を書く． */
const runEval = async (
  file: string,
  options: TriageOptions,
  showSweep: boolean,
  out: string | undefined,
  engine: DecisionEngine,
): Promise<RunResult> => {
  const read = await readText(file);
  if ("error" in read) return { code: 1, output: read.error };
  const { tickets, errors } = parseLabeledTickets(read.text);
  const records = await mapWithConcurrency(tickets, evalConcurrency, async (ticket): Promise<EvalRecord> => {
    const start = performance.now();
    const result = await triage(engine, ticket, options);
    return { ticket, result, elapsedMs: Math.round(performance.now() - start) };
  });
  const results = toLabeledResults(records);
  const report = showSweep
    ? [formatSweep(sweep(results))]
    : [
        formatEvaluation(evaluate(results, options.minConfidence ?? defaultMinConfidence)),
        "",
        formatConfusionMatrix(confusionMatrix(results)),
      ];
  if (out === undefined) return { code: 0, output: [...errors, ...report].join("\n") };
  const writeError = await writeRecords(out, records);
  if (writeError !== undefined) return { code: 1, output: writeError };
  return { code: 0, output: [...errors, ...report, "", `wrote ${records.length} records to ${out}`].join("\n") };
};

/** 評価の記録のファイルを読む．読めなければ，表示するメッセージを返す． */
const readRecords = async (file: string): Promise<{ records: EvalRecord[]; errors: string[] } | { error: string }> => {
  const read = await readText(file);
  return "error" in read ? read : parseRecords(read.text);
};

/** 評価の記録を読み，指標を表示する文字列を返す．showCalibrationなら，確信度の区間ごとの表も表示する． */
const runReport = async (file: string, options: TriageOptions, showCalibration: boolean): Promise<RunResult> => {
  const read = await readRecords(file);
  if ("error" in read) return { code: 1, output: read.error };
  const report = buildReport(read.records, options.minConfidence ?? defaultMinConfidence);
  // 発展(演習10-7)：表の下に期待較正誤差を表示する
  // const bins = calibration(toLabeledResults(read.records));
  // const ece = expectedCalibrationError(bins);
  // const table = showCalibration
  //   ? ["", formatCalibration(bins), `expected calibration error: ${ece === undefined ? "n/a" : ece.toFixed(3)}`]
  //   : [];
  // 発展(演習10-7)ここまで．次の1行の代わりに使う
  const table = showCalibration ? ["", formatCalibration(calibration(toLabeledResults(read.records)))] : [];
  return { code: 0, output: [...read.errors, formatReport(report), ...table].join("\n") };
};

/** 2つの評価の記録を読み，指標と食い違いを並べた文字列を返す． */
const runCompare = async (files: { a: string; b: string }, options: TriageOptions): Promise<RunResult> => {
  const readA = await readRecords(files.a);
  if ("error" in readA) return { code: 1, output: readA.error };
  const readB = await readRecords(files.b);
  if ("error" in readB) return { code: 1, output: readB.error };
  const compared = compareRecords(readA.records, readB.records);
  if (!compared.ok) return { code: 1, output: compared.message };
  const minConfidence = options.minConfidence ?? defaultMinConfidence;
  const output = formatComparison(
    files,
    buildReport(readA.records, minConfidence),
    buildReport(readB.records, minConfidence),
    compared.comparison,
  );
  return { code: 0, output: [...readA.errors, ...readB.errors, output].join("\n") };
};

/** HTTP APIの待ち受けを始め，待ち受けているURLを表示する文字列を返す． */
const runServe = async (port: number, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  const server = createApi(engine, options);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  return { code: 0, output: `listening on http://localhost:${actualPort}`, server };
};

/** 判断エンジンを使えないときの理由．設定が足りないときに，判断エンジンの代わりにrunへ渡す． */
export interface EngineUnavailable {
  unavailable: string;
}

/**
 * コマンドライン引数を受け取り，振り分けの結果を表示する文字列を返す．
 * 評価の記録だけを読むコマンドは，判断エンジンを使えなくても実行する．
 */
export const run = async (args: string[], engine: DecisionEngine | EngineUnavailable): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  if (command.kind === "report") return runReport(command.file, command.options, command.calibration);
  if (command.kind === "compare") return runCompare(command.files, command.options);
  if ("unavailable" in engine) return { code: 1, output: engine.unavailable };
  if (command.kind === "batch") return runBatch(command.file, command.options, engine);
  if (command.kind === "eval") return runEval(command.file, command.options, command.sweep, command.out, engine);
  if (command.kind === "serve") return runServe(command.port, command.options, engine);
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
