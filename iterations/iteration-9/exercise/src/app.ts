// プログラムの入口の処理．引数を読み，問い合わせを振り分けて，表示する文字列を作る．

import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { parseArgs } from "node:util";
import { createApi } from "./adapters/http-api.ts";
import { batchConcurrency, mapWithConcurrency, parseTickets, summarize } from "./batch.ts";
import { confusionMatrix, evaluate, parseLabeledTickets, sweep } from "./evaluate.ts";
import { formatConfusionMatrix, formatEvaluation, formatSummary, formatSweep, formatTriage } from "./format.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";
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
  "       triage eval [--min-confidence <0-1> | --sweep] <file>",
  "       triage serve [--min-confidence <0-1>] [--port <0-65535>]",
].join("\n");

/** コマンドライン引数から読んだ，実行すること． */
type Command =
  | { kind: "single"; subject: string; body: string; options: TriageOptions }
  | { kind: "batch"; file: string; options: TriageOptions }
  | { kind: "eval"; file: string; options: TriageOptions; sweep: boolean }
  | { kind: "serve"; port: number; options: TriageOptions };

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
      options: { "min-confidence": { type: "string" }, sweep: { type: "boolean" }, port: { type: "string" } },
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
  if (positionals[0] === "eval") {
    const [, file, ...rest] = positionals;
    if (file === undefined || rest.length > 0) return undefined;
    // --sweepはしきい値を変えながら評価するので，--min-confidenceとは一緒に使えない．
    if (sweep && options.minConfidence !== undefined) return undefined;
    return { kind: "eval", file, options, sweep };
  }
  if (sweep) return undefined;
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

/** 正解の部署が付いた問い合わせを振り分け，評価を表示する文字列を返す． */
const runEval = async (
  file: string,
  options: TriageOptions,
  showSweep: boolean,
  engine: DecisionEngine,
): Promise<RunResult> => {
  const read = await readText(file);
  if ("error" in read) return { code: 1, output: read.error };
  const { tickets, errors } = parseLabeledTickets(read.text);
  const results = await mapWithConcurrency(tickets, batchConcurrency, async (ticket) => ({
    label: ticket.department,
    result: await triage(engine, ticket, options),
  }));
  const report = showSweep
    ? [formatSweep(sweep(results))]
    : [
        formatEvaluation(evaluate(results, options.minConfidence ?? defaultMinConfidence)),
        "",
        formatConfusionMatrix(confusionMatrix(results)),
      ];
  return { code: 0, output: [...errors, ...report].join("\n") };
};

/** HTTP APIの待ち受けを始め，待ち受けているURLを表示する文字列を返す． */
const runServe = async (port: number, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  const server = createApi(engine, options);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  return { code: 0, output: `listening on http://localhost:${actualPort}`, server };
};

/** コマンドライン引数を受け取り，振り分けの結果を表示する文字列を返す． */
export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  if (command.kind === "batch") return runBatch(command.file, command.options, engine);
  if (command.kind === "eval") return runEval(command.file, command.options, command.sweep, engine);
  if (command.kind === "serve") return runServe(command.port, command.options, engine);
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
