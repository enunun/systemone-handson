// 判断エンジンへの問い合わせにかかった時間を記録するアダプタ．ほかのDecisionEngineを包んで使う．

import type { Answers, DecisionEngine, Questions } from "../ports/decision-engine.ts";

/** engineを包み，問い合わせごとに質問の数とかかった時間をlogに書くDecisionEngineを作る．logを省くと標準エラー出力に書く． */
export const createTimingEngine = (
  engine: DecisionEngine,
  log = (line: string) => console.error(line),
): DecisionEngine => ({
  async decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>> {
    const started = performance.now();
    const answers = await engine.decide(state, questions);
    log(`decide: ${Object.keys(questions).length} questions in ${Math.round(performance.now() - started)} ms`);
    return answers;
  },
});
