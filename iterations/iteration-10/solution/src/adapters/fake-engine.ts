// 決まった答えを返すアダプタ．判断エンジンを使わずに，アプリのテストをするときに使う．

import type { Answer, Answers, DecisionEngine, Questions } from "../ports/decision-engine.ts";

/** 受け取った問い合わせ． */
export interface FakeEngineCall {
  state: Readonly<Record<string, string>>;
  questions: Questions;
}

/** 決まった答えを返すDecisionEngine．受け取った問い合わせをcallsに記録する． */
export interface FakeEngine extends DecisionEngine {
  calls: FakeEngineCall[];
}

/** 質問の名前ごとに，決まった答えを返すFakeEngineを作る．答えのない質問を尋ねられたら例外を投げる． */
export const createFakeEngine = (answers: Readonly<Record<string, Answer>>): FakeEngine => {
  const calls: FakeEngineCall[] = [];
  return {
    calls,
    async decide<const Q extends Questions>(
      state: Readonly<Record<string, string>>,
      questions: Q,
    ): Promise<Answers<Q>> {
      calls.push({ state, questions });
      const result: Record<string, Answer> = {};
      for (const name of Object.keys(questions)) {
        const answer = answers[name];
        if (answer === undefined) throw new Error(`the fake engine has no answer for "${name}"`);
        result[name] = answer;
      }
      return result as Answers<Q>;
    },
  };
};
