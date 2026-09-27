// 設計書のComponentの図(design/03-component.md)が，実装(src/)と一致しているかを照合する．
// 使い方：node tools/check-component.mjs <パッケージのディレクトリ>…
//
// 照合すること
// - src/のモジュール(src/からの相対パス，拡張子なし)が，図にComponentとして描かれている．
// - 図の矢印(Rel)と，実装のimportが一致する．外部のパッケージへのimportは，Component_Extへの矢印と照合する．
//   node:で始まる組み込みモジュールは照合しない．
// 一致しないものがあれば表示し，終了コード1で終わる．
import fs from "node:fs";
import path from "node:path";

const listSources = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => path.join(e.parentPath, e.name));

const moduleName = (srcDir, file) => path.relative(srcDir, file).replace(/\.ts$/, "").split(path.sep).join("/");

/** 図に描かれた要素(id -> 名前)と矢印("from -> to")． */
const readDiagram = (file) => {
  const text = fs.readFileSync(file, "utf8");
  const elements = new Map();
  for (const m of text.matchAll(/^\s*(Component|Component_Ext)\((\w+),\s*"([^"]+)"/gm)) {
    elements.set(m[2], { kind: m[1], name: m[3] });
  }
  const arrows = new Set();
  for (const m of text.matchAll(/^\s*Rel\w*\((\w+),\s*(\w+)/gm)) {
    const from = elements.get(m[1]);
    const to = elements.get(m[2]);
    if (from && to) arrows.add(`${from.name} -> ${to.name}`);
  }
  return { elements: [...elements.values()], arrows };
};

/** 実装のモジュールと，importから作った矢印． */
const readImports = (srcDir) => {
  const modules = new Set();
  const arrows = new Set();
  for (const file of listSources(srcDir)) {
    const from = moduleName(srcDir, file);
    modules.add(from);
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"/gms)) {
      const spec = m[1];
      if (spec.startsWith("node:")) continue;
      const to = spec.startsWith(".")
        ? moduleName(srcDir, path.resolve(path.dirname(file), spec))
        : spec
            .split("/")
            .slice(0, spec.startsWith("@") ? 2 : 1)
            .join("/");
      arrows.add(`${from} -> ${to}`);
    }
  }
  return { modules, arrows };
};

let status = 0;
for (const dir of process.argv.slice(2)) {
  const design = path.join(dir, "design", "03-component.md");
  const diagram = readDiagram(design);
  const code = readImports(path.join(dir, "src"));
  const drawn = new Set(diagram.elements.filter((e) => e.kind === "Component").map((e) => e.name));

  const problems = [
    ...[...code.modules].filter((m) => !drawn.has(m)).map((m) => `図にないモジュール: ${m}`),
    ...[...drawn].filter((m) => !code.modules.has(m)).map((m) => `実装にないモジュール: ${m}`),
    ...[...code.arrows].filter((a) => !diagram.arrows.has(a)).map((a) => `図にない依存: ${a}`),
    ...[...diagram.arrows].filter((a) => !code.arrows.has(a)).map((a) => `実装にない依存: ${a}`),
  ];
  if (problems.length > 0) {
    status = 1;
    console.log(design);
    for (const p of problems.sort()) console.log(`  ${p}`);
  }
}
process.exit(status);
