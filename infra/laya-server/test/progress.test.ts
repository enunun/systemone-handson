import assert from "node:assert/strict";
import { test } from "vitest";
import { progressLogger } from "../src/progress.ts";

// 時刻を手で進められる時計と，ログを記録する関数で試す．
const setup = () => {
  let time = 0;
  const logs: string[] = [];
  const { onProgress, done } = progressLogger({
    log: (message) => logs.push(message),
    intervalMs: 10_000,
    now: () => time,
  });
  return { onProgress, done, logs, advance: (ms: number) => (time += ms) };
};

test("取得を始めたときに，ファイル名と大きさを出す", () => {
  const { onProgress, logs } = setup();
  onProgress({ file: "laya.onnx.data", received: 1_000_000, total: 1_685_258_240 });
  assert.deepEqual(logs, ["downloading laya.onnx.data (1685 MB)"]);
});

test("間隔が過ぎるまでは，進み具合を出さない", () => {
  const { onProgress, logs, advance } = setup();
  onProgress({ file: "laya.onnx.data", received: 1_000_000, total: 1_685_258_240 });
  advance(9_999);
  onProgress({ file: "laya.onnx.data", received: 200_000_000, total: 1_685_258_240 });
  assert.equal(logs.length, 1);
});

test("間隔が過ぎるごとに，割合と取得した量を出す", () => {
  const { onProgress, logs, advance } = setup();
  onProgress({ file: "laya.onnx.data", received: 1_000_000, total: 1_685_258_240 });
  advance(10_000);
  onProgress({ file: "laya.onnx.data", received: 505_000_000, total: 1_685_258_240 });
  advance(5_000);
  onProgress({ file: "laya.onnx.data", received: 600_000_000, total: 1_685_258_240 });
  advance(5_000);
  onProgress({ file: "laya.onnx.data", received: 843_000_000, total: 1_685_258_240 });
  assert.deepEqual(logs.slice(1), [
    "downloading laya.onnx.data: 29% (505 MB / 1685 MB)",
    "downloading laya.onnx.data: 50% (843 MB / 1685 MB)",
  ]);
});

test("取得し終えたら，完了を出す", () => {
  const { onProgress, logs } = setup();
  onProgress({ file: "laya.onnx", received: 3_807_291, total: 3_807_291 });
  assert.deepEqual(logs, ["downloading laya.onnx (4 MB)", "downloaded laya.onnx"]);
});

test("1MB未満のファイルは，大きさをKBで出す", () => {
  const { onProgress, logs } = setup();
  onProgress({ file: "laya_config.json", received: 369, total: 369 });
  assert.deepEqual(logs, ["downloading laya_config.json (1 KB)", "downloaded laya_config.json"]);
});

test("大きさがわからないときは，取得した量だけを出す", () => {
  const { onProgress, logs, advance } = setup();
  onProgress({ file: "laya.onnx.data", received: 1_000_000, total: null });
  advance(10_000);
  onProgress({ file: "laya.onnx.data", received: 505_000_000, total: null });
  assert.deepEqual(logs, ["downloading laya.onnx.data", "downloading laya.onnx.data: 505 MB"]);
});

test("大きさがわからないファイルは，次のファイルに移ったときに完了を出す", () => {
  const { onProgress, logs } = setup();
  onProgress({ file: "tokenizer/tokenizer.json", received: 3_583_228, total: null });
  onProgress({ file: "tokenizer/tokenizer_config.json", received: 1_200, total: 1_200 });
  assert.deepEqual(logs, [
    "downloading tokenizer/tokenizer.json",
    "downloaded tokenizer/tokenizer.json (4 MB)",
    "downloading tokenizer/tokenizer_config.json (2 KB)",
    "downloaded tokenizer/tokenizer_config.json",
  ]);
});

test("大きさがわからないファイルは，doneで完了を出す", () => {
  const { onProgress, done, logs } = setup();
  onProgress({ file: "tokenizer/tokenizer.json", received: 3_583_228, total: null });
  done();
  done();
  assert.deepEqual(logs, ["downloading tokenizer/tokenizer.json", "downloaded tokenizer/tokenizer.json (4 MB)"]);
});

test("完了を出したファイルは，doneで重ねて出さない", () => {
  const { onProgress, done, logs } = setup();
  onProgress({ file: "laya.onnx", received: 3_807_291, total: 3_807_291 });
  done();
  assert.deepEqual(logs, ["downloading laya.onnx (4 MB)", "downloaded laya.onnx"]);
});
