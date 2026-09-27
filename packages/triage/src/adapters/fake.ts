// モデルを使わずに，決まった答えを返すアダプタ．テストや，モデルを用意する前の動作確認に使う．

import type { Answers, DecisionEngine, Question, Questions } from "../ports/decision-engine.ts";

/** 質問の名前と内容から答えを決める関数．undefinedを返すと既定の答えになる． */
export type Responder = (name: string, question: Question) => unknown;

const defaultAnswer = (q: Question): unknown => {
  switch (q.kind) {
    case "choice": {
      const labels = Object.keys(q.options);
      return {
        kind: "choice",
        value: labels[0],
        confidence: 1,
        probabilities: Object.fromEntries(labels.map((l, i) => [l, i === 0 ? 1 : 0])),
      };
    }
    case "scale":
      return { kind: "scale", value: 0, confidence: 1, probabilities: q.levels.map((_, i) => (i === 0 ? 1 : 0)) };
    case "yesno":
      return { kind: "yesno", probability: 0 };
  }
};

export class FakeEngine implements DecisionEngine {
  readonly #respond: Responder;

  constructor(respond: Responder = () => undefined) {
    this.#respond = respond;
  }

  async decide<const Q extends Questions>(_state: string | Record<string, unknown>, questions: Q): Promise<Answers<Q>> {
    const answers: Record<string, unknown> = {};
    for (const [name, q] of Object.entries(questions)) answers[name] = this.#respond(name, q) ?? defaultAnswer(q);
    return answers as Answers<Q>;
  }
}
