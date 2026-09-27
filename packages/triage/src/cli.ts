// 問い合わせを1件振り分けて，結果をJSONで表示する．
// 使い方：pnpm --filter @systemone-handson/triage start "件名" "本文"

import { createEngine } from "./config.ts";
import { triage } from "./domain/triage.ts";

const [subject, body] = process.argv.slice(2);
if (subject === undefined || body === undefined) {
  console.error('usage: pnpm --filter @systemone-handson/triage start "<subject>" "<body>"');
  process.exit(2);
}

try {
  const result = await triage(createEngine(), { subject, body });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  // 多くは接続先の誤りか，laya-serverが起動していない(またはモデルの読み込み中)ことによる．
  console.error(`triage failed (SYSTEMONE_BASE_URL=${process.env.SYSTEMONE_BASE_URL ?? "http://localhost:8080"})`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
