// アプリが判断を頼むための窓口(ポート)．
// アプリはこの型だけに依存し，Laya，Jevなど実際のモデルやその通信方式は知らない．
// モデルごとの違いは，adapters/の各アダプタが吸収する．

/** 選択肢から1つを選ぶ質問． */
export interface ChoiceQuestion {
  kind: "choice";
  prompt: string;
  /** ラベルと，その説明． */
  options: Record<string, string>;
}

/** 順序のある段階で評価する質問．levels[0]がもっとも低い． */
export interface ScaleQuestion {
  kind: "scale";
  prompt: string;
  levels: readonly string[];
}

/** はい・いいえで答える質問． */
export interface YesNoQuestion {
  kind: "yesno";
  prompt: string;
}

export type Question = ChoiceQuestion | ScaleQuestion | YesNoQuestion;

export interface ChoiceAnswer {
  kind: "choice";
  /** もっとも確からしいラベル． */
  value: string;
  /** 0から1．1に近いほど迷いがない． */
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ScaleAnswer {
  kind: "scale";
  /** 段階の期待値(0からlevels.length-1)．段階の間の値もとる． */
  value: number;
  confidence: number;
  /** 段階ごとの確率．添字は段階の番号． */
  probabilities: number[];
}

export interface YesNoAnswer {
  kind: "yesno";
  /** 「はい」である確率． */
  probability: number;
}

export type AnswerFor<Q extends Question> = Q extends ChoiceQuestion
  ? ChoiceAnswer
  : Q extends ScaleQuestion
    ? ScaleAnswer
    : YesNoAnswer;

export type Questions = Record<string, Question>;

export type Answers<Q extends Questions> = { [K in keyof Q]: AnswerFor<Q[K]> };

/** 判断を下すエンジン． */
export interface DecisionEngine {
  /** 1つの状態(問い合わせ文やJSON)について，複数の質問にまとめて答える． */
  decide<const Q extends Questions>(state: string | Record<string, unknown>, questions: Q): Promise<Answers<Q>>;
}
