// プログラムの入口の処理．引数を読み，判断エンジンに問い合わせて，表示する文字列を作る．

import type { TypeSafeClient } from "@typesafe-ai/sdk";

/** runの結果．codeはプロセスの終了コード，outputは表示する文字列である． */
export interface RunResult {
  code: number;
  output: string;
}

/** コマンドライン引数(件名と本文)を受け取り，返金の判定を表示する文字列を返す． */
export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
  throw new Error("TODO: 件名と本文を判断エンジンに送り，formatRefundで表示する文字列を作る");
};
