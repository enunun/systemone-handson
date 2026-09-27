// アプリが判断を頼む窓口(ポート)．
// アプリはこの型だけを使い，実際に判断する仕組み(判断エンジンのAPIやSDK)を知らない．
// 仕組みごとの違いは，adapters/の各アダプタが吸収する．

/** 選択肢から1つを選ぶ質問． */
export interface ChoiceQuestion {
  kind: "choice";
  prompt: string;
  /** ラベルと，その説明． */
  options: Readonly<Record<string, string>>;
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
  /** そのラベルである確率． */
  probability: number;
  /** 0から1．1に近いほど迷いがない． */
  confidence: number;
  /** ラベルごとの確率． */
  probabilities: Readonly<Record<string, number>>;
}

export interface ScaleAnswer {
  kind: "scale";
  /** 段階の番号の期待値(0からlevels.length-1)． */
  value: number;
  confidence: number;
  /** 段階ごとの確率．添字は段階の番号． */
  probabilities: readonly number[];
}

export interface YesNoAnswer {
  kind: "yesno";
  /** 「はい」である確率． */
  probability: number;
}

export type Answer = ChoiceAnswer | ScaleAnswer | YesNoAnswer;

/** 質問の型に対応する答えの型． */
export type AnswerFor<Q extends Question> = Q extends ChoiceQuestion
  ? ChoiceAnswer
  : Q extends ScaleQuestion
    ? ScaleAnswer
    : YesNoAnswer;

/** 名前を付けた質問の集まり． */
export type Questions = Readonly<Record<string, Question>>;

/** 質問の名前ごとの答え．答えの型は，同じ名前の質問の型で決まる． */
export type Answers<Q extends Questions> = { [K in keyof Q]: AnswerFor<Q[K]> };

/** 判断を下すもの． */
export interface DecisionEngine {
  /** 1つの状態(問い合わせなど)について，複数の質問にまとめて答える． */
  decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>>;
}
