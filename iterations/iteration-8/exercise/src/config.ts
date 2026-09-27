// 環境変数から，判断エンジンの設定を読む．

/** 判断エンジンの設定． */
export type Config = { engine: "systemone"; baseURL: string; model: string; apiKey: string } | { engine: "fake" };

/** 設定を読んだ結果．読めなければ，何が誤っているかをmessageに入れる． */
export type ConfigResult = { ok: true; config: Config } | { ok: false; message: string };

/**
 * 環境変数から設定を読む．
 * - DECISION_ENGINE：systemone(既定)かfake．
 * - systemoneのときは，SYSTEMONE_BASE_URL・SYSTEMONE_MODEL・SYSTEMONE_API_KEYが必要である．
 */
export const loadConfig = (env: Readonly<Record<string, string | undefined>>): ConfigResult => {
  const engine = env.DECISION_ENGINE ?? "systemone";
  if (engine === "fake") return { ok: true, config: { engine: "fake" } };
  if (engine !== "systemone") {
    return { ok: false, message: `DECISION_ENGINE must be systemone or fake: ${engine}` };
  }
  const names = ["SYSTEMONE_BASE_URL", "SYSTEMONE_MODEL", "SYSTEMONE_API_KEY"] as const;
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) return { ok: false, message: `missing environment variables: ${missing.join(", ")}` };
  return {
    ok: true,
    config: {
      engine: "systemone",
      baseURL: env.SYSTEMONE_BASE_URL ?? "",
      model: env.SYSTEMONE_MODEL ?? "",
      apiKey: env.SYSTEMONE_API_KEY ?? "",
    },
  };
};
