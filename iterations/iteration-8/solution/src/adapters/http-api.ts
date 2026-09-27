// 振り分けをHTTP APIで公開する，入口側のアダプタ．
// POST /triageに{"subject": …, "body": …}を送ると，振り分けの結果(Triage)をJSONで返す．

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isTicket } from "../batch.ts";
import type { DecisionEngine } from "../ports/decision-engine.ts";
import { triage, type TriageOptions } from "../triage.ts";

/** 受け付けるリクエストの本文の大きさの上限(バイト)． */
const maxBodyBytes = 64 * 1024;

const sendJson = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

const sendError = (response: ServerResponse, status: number, message: string): void =>
  sendJson(response, status, { error: message });

/** リクエストの本文を文字列として読む．上限を超えたらundefinedを返す． */
const readBody = async (request: IncomingMessage): Promise<string | undefined> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > maxBodyBytes) return undefined;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const parseTicket = (text: string) => {
  try {
    const value: unknown = JSON.parse(text);
    return isTicket(value) ? { subject: value.subject, body: value.body } : undefined;
  } catch {
    return undefined;
  }
};

/** 振り分けのHTTP APIのサーバを作る．listenで待ち受けを始める． */
export const createApi = (engine: DecisionEngine, options: TriageOptions): Server =>
  createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    // 発展(演習8-7)：パスを確かめる前に，死活確認(GET /healthz)に答える
    // if (path === "/healthz" && request.method === "GET") return sendJson(response, 200, { status: "ok" });
    // 発展(演習8-7)ここまで
    if (path !== "/triage") return sendError(response, 404, `not found: ${path}`);
    if (request.method !== "POST") return sendError(response, 405, "use POST");
    const text = await readBody(request);
    if (text === undefined) return sendError(response, 413, "request body is too large");
    const ticket = parseTicket(text);
    if (ticket === undefined)
      return sendError(response, 400, "request body must be a JSON object with subject and body");
    try {
      sendJson(response, 200, await triage(engine, ticket, options));
    } catch (error) {
      sendError(response, 502, `the decision engine failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
