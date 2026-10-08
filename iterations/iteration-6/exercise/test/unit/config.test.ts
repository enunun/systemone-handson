import { describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.ts";

const ollama = { SYSTEMONE_BASE_URL: "http://ollama:11434", SYSTEMONE_MODEL: "tev1:0.8b", SYSTEMONE_API_KEY: "ollama" };

describe("loadConfig", () => {
  test("3つの環境変数から，/v1/systemoneの判断エンジンにつなぐ設定を作る", () => {
    expect(loadConfig(ollama)).toEqual({
      ok: true,
      config: { engine: "systemone", baseURL: "http://ollama:11434", model: "tev1:0.8b", apiKey: "ollama" },
    });
  });

  test("足りない環境変数があれば，その名前を並べたメッセージを返す", () => {
    expect(loadConfig({ SYSTEMONE_MODEL: "tev1:0.8b" })).toEqual({
      ok: false,
      message: "missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_API_KEY",
    });
  });

  test("空の環境変数は，足りないものとして扱う", () => {
    expect(loadConfig({ ...ollama, SYSTEMONE_API_KEY: "" })).toEqual({
      ok: false,
      message: "missing environment variables: SYSTEMONE_API_KEY",
    });
  });

  test("DECISION_ENGINEがfakeなら，ほかの環境変数がなくても，決まった答えを返す判断エンジンの設定にする", () => {
    expect(loadConfig({ DECISION_ENGINE: "fake" })).toEqual({ ok: true, config: { engine: "fake" } });
  });

  test("DECISION_ENGINEがsystemoneなら，指定しないときと同じ", () => {
    expect(loadConfig({ ...ollama, DECISION_ENGINE: "systemone" })).toEqual(loadConfig(ollama));
  });

  test("DECISION_ENGINEが知らない値なら，メッセージを返す", () => {
    expect(loadConfig({ DECISION_ENGINE: "llm" })).toEqual({
      ok: false,
      message: "DECISION_ENGINE must be systemone or fake: llm",
    });
  });
});
