// 解答例に書いた発展課題(演習N-7)のコメントを検査する．
// 使い方：node tools/check-advanced.mjs <Iterationのディレクトリ>…(例：iterations/iteration-*)
//
// 発展課題の実装とテストは，解答例のsrc/とtest/に次の形のコメントで書く．
//
//   // 発展(演習0-7)：説明
//   // 発展課題のコード(行の頭に「// 」を付ける)
//   // 発展(演習0-7)ここまで
//
// 発展課題のコードで既存の行を置き換えるときは，終わりの行に置き換える行の数を書く．
//
//   // 発展(演習0-7)ここまで．次の1行の代わりに使う
//
// 発展課題で新しく作るファイルは，解答例のadvanced/に，パッケージの直下からと同じ相対パスで置く(例：advanced/src/adapters/timing-engine.ts)．
//
// 確かめること
// - 発展課題を入れた版(コメントを外し，advanced/のファイルを足したもの)が，型検査とテストを通る．
// - 演習用パッケージ(Iteration N)のコード・テスト・設計書が，Iteration N-1の解答例から発展課題を除いたものと同じ．
// 問題があれば表示し，終了コード1で終わる．
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

const START = /^(\s*)\/\/ 発展\((演習\d+-7)\)：/;
const END = /^\s*\/\/ 発展\((演習\d+-7)\)ここまで(?:．次の(\d+)行の代わりに使う)?$/;

/** ファイルの中の発展課題のブロックを，入れた版(apply)か除いた版(strip)にする． */
const transform = (text, mode, where) => {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].match(START);
    if (!start) {
      if (/\/\/ 発展\(/.test(lines[i])) throw new Error(`${where}:${i + 1}: ブロックの外に発展課題の印がある`);
      out.push(lines[i]);
      continue;
    }
    const [, indent, name] = start;
    const body = [];
    let j = i + 1;
    for (; j < lines.length && !END.test(lines[j]); j++) {
      const line = lines[j];
      if (line === `${indent}//`) body.push("");
      else if (line.startsWith(`${indent}// `)) body.push(indent + line.slice(indent.length + 3));
      else throw new Error(`${where}:${j + 1}: 発展課題のブロックの中に，コメントでない行がある`);
    }
    if (j === lines.length) throw new Error(`${where}:${i + 1}: 「発展(${name})ここまで」がない`);
    const [, endName, replaced] = lines[j].match(END);
    if (endName !== name) throw new Error(`${where}:${j + 1}: 始まりの印(${name})と終わりの印(${endName})が違う`);
    if (mode === "apply") out.push(...body);
    i = j + (mode === "apply" ? Number(replaced ?? 0) : 0);
  }
  return out.join("\n");
};

const listFiles = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true, recursive: true })
        .filter((e) => e.isFile())
        .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
    : [];

/** src/とtest/のTypeScriptのファイル(パッケージからの相対パス)． */
const sourceFiles = (pkg) =>
  ["src", "test"].flatMap((d) =>
    listFiles(path.join(pkg, d))
      .filter((f) => f.endsWith(".ts"))
      .map((f) => path.join(d, f)),
  );

/** 発展課題を入れた版を，解答例と同じ深さの一時ディレクトリに作り，型検査とテストを実行する． */
const checkApplied = (solution) => {
  const files = sourceFiles(solution);
  const texts = new Map(files.map((f) => [f, fs.readFileSync(path.join(solution, f), "utf8")]));
  const extra = listFiles(path.join(solution, "advanced"));
  const marked = [...texts.values()].some((t) => t.split("\n").some((l) => START.test(l)));
  if (!marked && extra.length === 0) return [];

  const temp = path.join(path.dirname(solution), ".solution-advanced");
  fs.rmSync(temp, { recursive: true, force: true });
  try {
    fs.cpSync(solution, temp, { recursive: true, verbatimSymlinks: true });
    fs.rmSync(path.join(temp, "advanced"), { recursive: true, force: true });
    for (const [file, text] of texts)
      fs.writeFileSync(path.join(temp, file), transform(text, "apply", path.join(solution, file)));
    for (const file of extra) {
      fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      fs.copyFileSync(path.join(solution, "advanced", file), path.join(temp, file));
    }
    const problems = [];
    for (const [name, args] of [
      ["tsc", ["-p", "tsconfig.json"]],
      ["vitest", ["run"]],
    ]) {
      try {
        execFileSync(bin(name), args, { cwd: temp, encoding: "utf8", stdio: "pipe" });
      } catch (error) {
        problems.push(`発展課題を入れた版で${name}が失敗した\n${error.stdout}${error.stderr}`);
      }
    }
    return problems;
  } finally {
    if (!process.env.KEEP_ADVANCED) fs.rmSync(temp, { recursive: true, force: true });
  }
};

// 演習と解答例で違ってよいもの．
const OWN = new Set(["package.json", "README.md", "TESTLIST.md"]);
const ownDir = (file) => ["docs", "data", "advanced", "node_modules"].includes(file.split(path.sep)[0]);

/** 演習(Iteration N)が，Iteration N-1の解答例から発展課題を除いたものと同じかを確かめる． */
const checkCarriedOver = (previousSolution, exercise) => {
  const compared = (pkg) => new Set(listFiles(pkg).filter((f) => !OWN.has(f) && !ownDir(f)));
  const expected = compared(previousSolution);
  const actual = compared(exercise);
  const problems = [];
  for (const file of new Set([...expected, ...actual])) {
    if (!expected.has(file)) problems.push(`解答例にないファイル: ${file}`);
    else if (!actual.has(file)) problems.push(`演習にないファイル: ${file}`);
    else {
      let text = fs.readFileSync(path.join(previousSolution, file), "utf8");
      if (/^(src|test)\//.test(file) && file.endsWith(".ts")) text = transform(text, "strip", file);
      if (text !== fs.readFileSync(path.join(exercise, file), "utf8")) problems.push(`内容が違う: ${file}`);
    }
  }
  return problems;
};

let status = 0;
const report = (title, problems) => {
  if (problems.length === 0) return;
  status = 1;
  console.log(title);
  for (const p of problems.sort()) console.log(`  ${p}`);
};
const dirs = process.argv.slice(2).toSorted((a, b) => Number(a.match(/\d+$/)) - Number(b.match(/\d+$/)));
for (const dir of dirs) {
  const n = Number(dir.match(/iteration-(\d+)$/)?.[1]);
  try {
    report(`${dir}/solution(発展課題を入れた版)`, checkApplied(path.join(dir, "solution")));
    const previous = path.join(path.dirname(dir), `iteration-${n - 1}`, "solution");
    if (n >= 1 && fs.existsSync(previous)) {
      report(
        `${dir}/exercise(Iteration ${n - 1}の解答例との比較)`,
        checkCarriedOver(previous, path.join(dir, "exercise")),
      );
    }
  } catch (error) {
    report(dir, [error.message]);
  }
}
process.exit(status);
