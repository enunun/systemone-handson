// プログラムの入口の処理．引数を読み，問い合わせを振り分けて，表示する文字列を作る．

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { batchConcurrency, mapWithConcurrency, parseTickets, summarize } from "./batch.ts";
import { formatSummary, formatTriage } from "./format.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";
import { triage, type TriageOptions } from "./triage.ts";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である． */
export interface RunResult {
  code: number;
  output: string;
}

const usage = [
  'usage: triage [--min-confidence <0-1>] "<subject>" "<body>"',
  // 発展(演習6-7)：使い方の文に[--concurrency <n>]を足す
  // "       triage batch [--min-confidence <0-1>] [--concurrency <n>] <file>",
  // 発展(演習6-7)ここまで．次の1行の代わりに使う
  "       triage batch [--min-confidence <0-1>] <file>",
].join("\n");

/** コマンドライン引数から読んだ，実行すること． */
type Command =
  | { kind: "single"; subject: string; body: string; options: TriageOptions }
  // 発展(演習6-7)：batchに同時に送る数を持たせる
  // | { kind: "batch"; file: string; options: TriageOptions; concurrency: number };
  // 発展(演習6-7)ここまで．次の1行の代わりに使う
  | { kind: "batch"; file: string; options: TriageOptions };

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
    // 発展(演習6-7)：--concurrencyを読む
    // parsed = parseArgs({
    //   args,
    //   options: { "min-confidence": { type: "string" }, concurrency: { type: "string" } },
    //   allowPositionals: true,
    // });
    // 発展(演習6-7)ここまで．次の1行の代わりに使う
    parsed = parseArgs({ args, options: { "min-confidence": { type: "string" } }, allowPositionals: true });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const options = parseOptions(parsed.values["min-confidence"]);
  if (options === undefined) return undefined;
  const positionals = parsed.positionals;
  if (positionals[0] === "batch") {
    const [, file, ...rest] = positionals;
    // 発展(演習6-7)：同時に送る数を読む．1以上の整数でなければ，使い方を表示する
    // const concurrency = Number(parsed.values.concurrency ?? batchConcurrency);
    // if (!Number.isInteger(concurrency) || concurrency < 1) return undefined;
    // return file !== undefined && rest.length === 0 ? { kind: "batch", file, options, concurrency } : undefined;
    // 発展(演習6-7)ここまで．次の1行の代わりに使う
    return file !== undefined && rest.length === 0 ? { kind: "batch", file, options } : undefined;
  }
  const [subject, body, ...rest] = positionals;
  if (subject === undefined || body === undefined || rest.length > 0) return undefined;
  return { kind: "single", subject, body, options };
};

/** ファイルの問い合わせをまとめて振り分け，読めなかった行と集計を表示する文字列を返す． */
// 発展(演習6-7)：同時に送る数を受け取る
// const runBatch = async (
//   file: string,
//   options: TriageOptions,
//   engine: DecisionEngine,
//   concurrency: number,
// ): Promise<RunResult> => {
// 発展(演習6-7)ここまで．次の1行の代わりに使う
const runBatch = async (file: string, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    return { code: 1, output: `cannot read ${file}: ${error instanceof Error ? error.message : String(error)}` };
  }
  const { tickets, errors } = parseTickets(text);
  // 発展(演習6-7)：指定された数だけ同時に送る
  // const results = await mapWithConcurrency(tickets, concurrency, (ticket) => triage(engine, ticket, options));
  // 発展(演習6-7)ここまで．次の1行の代わりに使う
  const results = await mapWithConcurrency(tickets, batchConcurrency, (ticket) => triage(engine, ticket, options));
  return { code: 0, output: [...errors, formatSummary(summarize(results))].join("\n") };
};

/** コマンドライン引数を受け取り，振り分けの結果を表示する文字列を返す． */
export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  // 発展(演習6-7)：同時に送る数を渡す
  // if (command.kind === "batch") return runBatch(command.file, command.options, engine, command.concurrency);
  // 発展(演習6-7)ここまで．次の1行の代わりに使う
  if (command.kind === "batch") return runBatch(command.file, command.options, engine);
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
