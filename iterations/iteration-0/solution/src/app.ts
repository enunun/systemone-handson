// プログラムの入口の処理．引数を読み，判断エンジンに問い合わせて，表示する文字列を作る．

import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { formatRefund, refundQuestion } from "./refund.ts";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である． */
export interface RunResult {
  code: number;
  output: string;
}

const usage = 'usage: triage "<subject>" "<body>"';

/** コマンドライン引数(件名と本文)を受け取り，返金の判定を表示する文字列を返す． */
export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
  const [subject, body] = args;
  if (subject === undefined || body === undefined) return { code: 2, output: usage };
  const result = await client.systemOne({
    state: { subject, body },
    questions: { refund: refundQuestion },
  });
  return { code: 0, output: formatRefund(result.answers.refund.noul) };
};
