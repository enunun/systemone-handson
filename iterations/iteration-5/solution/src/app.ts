// プログラムの入口の処理．引数を読み，問い合わせを振り分けて，表示する文字列を作る．

import { parseArgs } from "node:util";
import { formatTriage } from "./format.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";
import { triage, type TriageOptions } from "./triage.ts";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である． */
export interface RunResult {
  code: number;
  output: string;
}

const usage = 'usage: triage [--min-confidence <0-1>] "<subject>" "<body>"';

/** コマンドライン引数．読めなければundefinedを返す． */
interface Command {
  subject: string;
  body: string;
  options: TriageOptions;
}

const parseCommand = (args: string[]): Command | undefined => {
  let parsed;
  try {
    parsed = parseArgs({ args, options: { "min-confidence": { type: "string" } }, allowPositionals: true });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const [subject, body] = parsed.positionals;
  if (subject === undefined || body === undefined) return undefined;
  const value = parsed.values["min-confidence"];
  if (value === undefined) return { subject, body, options: {} };
  const minConfidence = Number(value);
  if (!(minConfidence >= 0 && minConfidence <= 1)) return undefined;
  return { subject, body, options: { minConfidence } };
};

/** コマンドライン引数(オプション，件名と本文)を受け取り，振り分けの結果を表示する文字列を返す． */
export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
