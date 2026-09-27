// Markdownファイルの中の```mermaidのブロックを，mermaidの構文として読めるか検査する．
// 使い方：node tools/mermaid/check.mjs <Markdownファイル>…
// 読めない図があれば，ファイル名・図の番号・エラーを表示し，終了コード1で終わる．
import fs from "node:fs";
import { JSDOM } from "jsdom";

// mermaidはブラウザで動く前提なので，DOMをjsdomで用意してから読み込む．
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false });

let errors = 0;
for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, "utf8");
  const blocks = [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const [index, block] of blocks.entries()) {
    try {
      await mermaid.parse(block);
    } catch (error) {
      errors += 1;
      const message = String(error.message ?? error)
        .split("\n")
        .slice(0, 4)
        .join("\n  ");
      console.log(`${file}: ${index + 1}番目の図を読めません\n  ${message}`);
    }
  }
}
process.exit(errors === 0 ? 0 : 1);
