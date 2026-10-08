// 環境変数から，判断エンジンの設定を読む．

/** 判断エンジンの設定． */
export type Config =
  | {
      engine: "systemone";
      baseURL: string;
      model: string;
      apiKey: string;
      /** 判断エンジンへの1回の問い合わせを待つ時間(ミリ秒)．undefinedならSDKの既定(10秒)を使う． */
      timeoutMs: number | undefined;
    }
  | { engine: "fake" };

/** 設定を読んだ結果．読めなければ，何が誤っているかをmessageに入れる． */
export type ConfigResult = { ok: true; config: Config } | { ok: false; message: string };

/**
 * 環境変数から設定を読む．
 * - DECISION_ENGINE：systemone(既定)かfake．
 * - systemoneのときは，SYSTEMONE_BASE_URL・SYSTEMONE_MODEL・SYSTEMONE_API_KEYが必要である．
 * - SYSTEMONE_TIMEOUT_MS：判断エンジンへの1回の問い合わせを待つ時間(ミリ秒，正の整数)．省略できる．
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
  const timeout = env.SYSTEMONE_TIMEOUT_MS;
  const timeoutMs = timeout ? Number(timeout) : undefined;
  if (timeoutMs !== undefined && !(Number.isInteger(timeoutMs) && timeoutMs > 0)) {
    return { ok: false, message: `SYSTEMONE_TIMEOUT_MS must be a positive integer: ${timeout}` };
  }
  return {
    ok: true,
    config: {
      engine: "systemone",
      baseURL: env.SYSTEMONE_BASE_URL ?? "",
      model: env.SYSTEMONE_MODEL ?? "",
      apiKey: env.SYSTEMONE_API_KEY ?? "",
      timeoutMs,
    },
  };
};
