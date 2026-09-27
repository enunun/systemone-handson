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
  // 発展(演習4-7)：部署の行に確信度を表示するか
  // showConfidence: boolean;
  // 発展(演習4-7)ここまで
}

const parseCommand = (args: string[]): Command | undefined => {
  let parsed;
  try {
    // 発展(演習4-7)：--show-confidenceを読む
    // parsed = parseArgs({
    //   args,
    //   options: { "min-confidence": { type: "string" }, "show-confidence": { type: "boolean" } },
    //   allowPositionals: true,
    // });
    // 発展(演習4-7)ここまで．次の1行の代わりに使う
    parsed = parseArgs({ args, options: { "min-confidence": { type: "string" } }, allowPositionals: true });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const [subject, body] = parsed.positionals;
  if (subject === undefined || body === undefined) return undefined;
  // 発展(演習4-7)：--show-confidenceの値もCommandに入れる
  // const showConfidence = parsed.values["show-confidence"] ?? false;
  // const value = parsed.values["min-confidence"];
  // if (value === undefined) return { subject, body, options: {}, showConfidence };
  // const minConfidence = Number(value);
  // if (!(minConfidence >= 0 && minConfidence <= 1)) return undefined;
  // return { subject, body, options: { minConfidence }, showConfidence };
  // 発展(演習4-7)ここまで．次の5行の代わりに使う
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
  // 発展(演習4-7)：--show-confidenceを付けたら，部署の行に確信度を表示する
  // return { code: 0, output: formatTriage(result, command.showConfidence) };
  // 発展(演習4-7)ここまで．次の1行の代わりに使う
  return { code: 0, output: formatTriage(result) };
};
