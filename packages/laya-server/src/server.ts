// TypeSafe Jevと同じHTTP API(`POST /v1/systemone`，`GET /v1/models`)でLayaを公開するサーバ．
// アプリからは接続先のURLを変えるだけで，このサーバと本家Jevを切り替えられる．

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { SystemOneResult } from "@receptron/laya";
import { type LayaQuestions, parseRequest, RequestError, toResponse } from "./translate.ts";

/** 判断を下すエンジン．本番ではLaya，テストでは差し替えたものを渡す． */
export type Engine = (state: unknown, questions: LayaQuestions) => Promise<SystemOneResult<LayaQuestions>>;

export interface ServerOptions {
  /** 準備ができたエンジンを返す．モデルの読み込み中はnullを返す． */
  engine: () => Engine | null;
  /** `GET /v1/models`で返すモデル名． */
  modelName?: string;
}

const MAX_BODY_BYTES = 1024 * 1024;

const send = (res: ServerResponse, status: number, body: object): void => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const sendError = (res: ServerResponse, status: number, message: string): void =>
  send(res, status, { error: { message } });

const readJson = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413, "request body is too large");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "request body is not valid JSON");
  }
};

export const createLayaServer = ({ engine, modelName = "laya" }: ServerOptions): Server =>
  createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://localhost").pathname;

      if (req.method === "GET" && path === "/healthz") {
        return engine() ? send(res, 200, { status: "ok" }) : send(res, 503, { status: "loading" });
      }

      if (req.method === "GET" && path === "/v1/models") {
        return send(res, 200, {
          models: [{ name: modelName, description: "Laya (convaiinnovations/laya) via ONNX Runtime", release_date: "" }],
        });
      }

      if (req.method === "POST" && path === "/v1/systemone") {
        const { state, questions } = parseRequest(await readJson(req));
        const run = engine();
        // 503は，TypeSafeのSDKが自動で再試行するステータスである．
        if (!run) return sendError(res, 503, "model is still loading");
        return send(res, 200, toResponse(await run(state, questions)));
      }

      return sendError(res, 404, `no route for ${req.method} ${path}`);
    } catch (err) {
      if (err instanceof RequestError) return sendError(res, err.status, err.message);
      console.error(err);
      return sendError(res, 500, err instanceof Error ? err.message : "internal error");
    }
  });
