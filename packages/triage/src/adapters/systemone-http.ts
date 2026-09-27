// TypeSafe Jevの`POST /v1/systemone`を話すサーバにつなぐアダプタ．
// 接続先のURLを変えるだけで，ローカルのlaya-serverと本家Jevのどちらにもつながる．

import {
  type ChoiceQuestion as WireChoiceQuestion,
  type Fetch,
  type Question as WireQuestion,
  type ScoreQuestion as WireScoreQuestion,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import type { Answers, DecisionEngine, Question, Questions } from "../ports/decision-engine.ts";

export interface SystemOneHttpOptions {
  /** APIのルート．例：http://localhost:8080，https://api.typesafe.ai */
  baseURL: string;
  /** APIキー．laya-serverは検査しないので，任意の文字列でよい． */
  apiKey: string;
  /** モデル名．例：laya，jev-latest */
  model: string;
  /** テストで通信を差し替えるときに渡す． */
  fetch?: Fetch;
}

const toWire = (q: Question): WireQuestion => {
  switch (q.kind) {
    case "choice":
      return { type: "choice", instructions: q.prompt, criteria: q.options } satisfies WireChoiceQuestion;
    case "scale": {
      const [first, second, ...rest] = q.levels;
      if (first === undefined || second === undefined) throw new Error("scale needs at least two levels");
      return { type: "score", instructions: q.prompt, criteria: [first, second, ...rest] } satisfies WireScoreQuestion;
    }
    case "yesno":
      return { type: "noul", instructions: q.prompt };
  }
};

/** Jevの回答を，アプリの回答の形にする． */
const fromWire = (q: Question, a: unknown): unknown => {
  const wire = a as Record<string, unknown>;
  switch (q.kind) {
    case "choice":
      return {
        kind: "choice",
        value: wire.choice,
        confidence: wire.confidence,
        probabilities: wire.probabilities,
      };
    case "scale": {
      const probs = wire.probabilities as Record<string, number>;
      return {
        kind: "scale",
        value: wire.score,
        confidence: wire.confidence,
        probabilities: q.levels.map((_, i) => probs[String(i)] ?? 0),
      };
    }
    case "yesno":
      return { kind: "yesno", probability: wire.noul };
  }
};

export class SystemOneHttpEngine implements DecisionEngine {
  readonly #client: TypeSafeClient;
  readonly #model: string;

  constructor({ baseURL, apiKey, model, fetch }: SystemOneHttpOptions) {
    this.#client = new TypeSafeClient({ baseURL, apiKey, defaultModel: model, ...(fetch ? { fetch } : {}) });
    this.#model = model;
  }

  async decide<const Q extends Questions>(state: string | Record<string, unknown>, questions: Q): Promise<Answers<Q>> {
    const wireQuestions = Object.fromEntries(Object.entries(questions).map(([name, q]) => [name, toWire(q)]));
    const result = await this.#client.systemOne({
      model: this.#model,
      state: state as Parameters<TypeSafeClient["systemOne"]>[0]["state"],
      questions: wireQuestions,
    });
    const answers: Record<string, unknown> = {};
    for (const [name, q] of Object.entries(questions)) {
      const a = result.answers[name];
      if (a === undefined) throw new Error(`no answer for question "${name}"`);
      answers[name] = fromWire(q, a);
    }
    return answers as Answers<Q>;
  }
}
