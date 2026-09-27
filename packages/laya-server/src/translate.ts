// TypeSafe Jevの`POST /v1/systemone`のリクエスト・レスポンスと，Layaの入出力の間を変換する．
// Layaの入出力はJevとほぼ同じ形だが，次の点が違うので，ここで吸収する．
// - Jevは`instructions`や各criteriaの説明に，文字列のほかJSONやnullを許す．Layaは文字列(instructionsはオブジェクトも可)だけを受け付ける．
// - Layaの回答には，Jevにない`rl_agent`が付く．

import type {
  ChoiceQuestion as LayaChoiceQuestion,
  NoulQuestion as LayaNoulQuestion,
  Question as LayaQuestion,
  ScoreQuestion as LayaScoreQuestion,
  SystemOneResult as LayaResult,
} from "@receptron/laya";

/** Jevの`EntryType`：文字列，JSON，またはnull． */
type Entry = unknown;

export type LayaQuestions = Record<string, LayaQuestion>;

/** 変換後のリクエスト． */
export interface ParsedRequest {
  state: unknown;
  questions: LayaQuestions;
}

/** リクエストの誤り．HTTPのステータスとともに返す． */
export class RequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** criteriaの説明を，Layaが受け付ける文字列にする．nullはそのまま返す． */
const describe = (entry: Entry): string | null => {
  if (entry === null || entry === undefined) return null;
  if (typeof entry === "string") return entry;
  return JSON.stringify(entry);
};

const instructionsOf = (entry: Entry): string | object => {
  if (entry === null || entry === undefined) return "";
  if (typeof entry === "string" || typeof entry === "object") return entry;
  return String(entry);
};

const toChoice = (name: string, q: Record<string, unknown>): LayaChoiceQuestion => {
  if (!isRecord(q.criteria) || Object.keys(q.criteria).length < 2) {
    throw new RequestError(422, `questions.${name}.criteria: choice needs a map of at least two labels`);
  }
  const criteria: Record<string, string | null> = {};
  for (const [label, entry] of Object.entries(q.criteria)) criteria[label] = describe(entry);
  return { type: "choice", instructions: instructionsOf(q.instructions), criteria };
};

const toScore = (name: string, q: Record<string, unknown>): LayaScoreQuestion => {
  if (!Array.isArray(q.criteria) || q.criteria.length < 2) {
    throw new RequestError(422, `questions.${name}.criteria: score needs a list of at least two levels`);
  }
  // Layaは各段階の説明を必須とするので，説明のない段階には段階の番号を入れる．
  const criteria = q.criteria.map((entry: Entry, i: number) => describe(entry) ?? String(i));
  return { type: "score", instructions: instructionsOf(q.instructions), criteria };
};

const toNoul = (q: Record<string, unknown>): LayaNoulQuestion => {
  const question: LayaNoulQuestion = { type: "noul", instructions: instructionsOf(q.instructions) };
  if (isRecord(q.criteria)) {
    const yes = describe(q.criteria.true);
    const no = describe(q.criteria.false);
    const criteria: { true?: string; false?: string } = {};
    if (yes !== null) criteria.true = yes;
    if (no !== null) criteria.false = no;
    question.criteria = criteria;
  }
  return question;
};

/** Jevのリクエストの本文を検査し，Layaの入力に変換する． */
export const parseRequest = (body: unknown): ParsedRequest => {
  if (!isRecord(body)) throw new RequestError(400, "request body must be a JSON object");
  if (!isRecord(body.questions) || Object.keys(body.questions).length === 0) {
    throw new RequestError(422, "questions: at least one question is required");
  }
  const questions: LayaQuestions = {};
  for (const [name, q] of Object.entries(body.questions)) {
    if (!isRecord(q)) throw new RequestError(422, `questions.${name}: must be an object`);
    switch (q.type) {
      case "choice":
        questions[name] = toChoice(name, q);
        break;
      case "score":
        questions[name] = toScore(name, q);
        break;
      case "noul":
        questions[name] = toNoul(q);
        break;
      default:
        throw new RequestError(422, `questions.${name}.type: must be one of choice, score, noul`);
    }
  }
  return { state: body.state ?? null, questions };
};

/** Layaの結果を，Jevのレスポンスの形にする． */
export const toResponse = (result: LayaResult<LayaQuestions>): object => {
  const answers: Record<string, object> = {};
  for (const [name, a] of Object.entries(result.answers)) {
    switch (a.type) {
      case "choice":
        answers[name] = {
          type: "choice",
          choice: a.choice,
          confidence: a.confidence,
          probabilities: a.probabilities,
        };
        break;
      case "score":
        answers[name] = {
          type: "score",
          score: a.score,
          confidence: a.confidence,
          legend: a.legend,
          probabilities: a.probabilities,
        };
        break;
      case "noul":
        answers[name] = { type: "noul", noul: a.noul };
        break;
    }
  }
  return { model: result.model, answers, usage: result.usage };
};
