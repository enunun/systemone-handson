// TypeSafe Jevの/v1/systemoneを話す判断エンジンにつなぐアダプタ．
// アプリの質問をSDKの質問に，SDKの答えをアプリの答えに変換する．

import type { Question as WireQuestion, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Answer, Answers, DecisionEngine, Question, Questions } from "../ports/decision-engine.ts";

/** アプリの質問を，/v1/systemoneの質問にする． */
const toWire = (question: Question): WireQuestion => {
  switch (question.kind) {
    case "choice":
      return { type: "choice", instructions: question.prompt, criteria: question.options };
    case "scale": {
      const [first, second, ...rest] = question.levels;
      if (first === undefined || second === undefined) throw new Error("a scale question needs at least two levels");
      return { type: "score", instructions: question.prompt, criteria: [first, second, ...rest] };
    }
    case "yesno":
      return { type: "noul", instructions: question.prompt };
  }
};

/** /v1/systemoneの答えを，質問の種類に合わせてアプリの答えにする． */
const fromWire = (question: Question, answer: unknown): Answer => {
  const wire = answer as Record<string, unknown>;
  switch (question.kind) {
    case "choice": {
      const probabilities = wire.probabilities as Record<string, number>;
      const value = wire.choice as string;
      return {
        kind: "choice",
        value,
        probability: probabilities[value] ?? 0,
        confidence: wire.confidence as number,
        probabilities,
      };
    }
    case "scale": {
      const probabilities = wire.probabilities as Record<string, number>;
      return {
        kind: "scale",
        value: wire.score as number,
        confidence: wire.confidence as number,
        probabilities: question.levels.map((_, level) => probabilities[String(level)] ?? 0),
      };
    }
    case "yesno":
      return { kind: "yesno", probability: wire.noul as number };
  }
};

/** SDKのクライアントを使って判断するDecisionEngineを作る． */
export const createSystemOneEngine = (client: TypeSafeClient): DecisionEngine => ({
  async decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>> {
    const wireQuestions = Object.fromEntries(Object.entries(questions).map(([name, q]) => [name, toWire(q)]));
    const result = await client.systemOne({ state: { ...state }, questions: wireQuestions });
    const answers: Record<string, Answer> = {};
    for (const [name, question] of Object.entries(questions)) {
      answers[name] = fromWire(question, result.answers[name]);
    }
    return answers as Answers<Q>;
  },
});
