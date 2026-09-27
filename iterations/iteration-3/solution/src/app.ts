// プログラムの入口の処理．引数を読み，問い合わせを振り分けて，表示する文字列を作る．

import { formatTriage } from "./format.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";
import { triage } from "./triage.ts";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である． */
export interface RunResult {
  code: number;
  output: string;
}

const usage = 'usage: triage "<subject>" "<body>"';

/** コマンドライン引数(件名と本文)を受け取り，振り分けの結果を表示する文字列を返す． */
export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const [subject, body] = args;
  if (subject === undefined || body === undefined) return { code: 2, output: usage };
  return { code: 0, output: formatTriage(await triage(engine, { subject, body })) };
};
