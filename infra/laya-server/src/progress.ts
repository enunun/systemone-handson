// モデルのダウンロードの進み具合を，一定の時間ごとにログへ出す．
// 大きなファイル(重みは約1.7GB)の取得中もログが止まって見えないようにする．

import type { LayaOptions } from "@receptron/laya";

export type ProgressHandler = NonNullable<LayaOptions["onProgress"]>;

export interface ProgressLogOptions {
  /** ログを出す関数． */
  log: (message: string) => void;
  /** 進み具合を出す間隔(ミリ秒)．既定は10秒． */
  intervalMs?: number;
  /** 現在の時刻(ミリ秒)を返す．テストでは差し替える． */
  now?: () => number;
}

export interface ProgressLogger {
  /** Laya.loadのonProgressに渡す． */
  onProgress: ProgressHandler;
  /** 取得がすべて終わったときに呼ぶ．大きさのわからないファイルの完了を出す． */
  done: () => void;
}

const size = (bytes: number): string =>
  bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)} KB` : `${Math.round(bytes / 1_000_000)} MB`;

/**
 * ファイルごとに，取得の開始・一定の時間ごとの進み具合・完了をログに出す．
 * 圧縮して送られたファイルは大きさ(total)がわからないので，次のファイルに移ったときかdoneで完了を出す．
 */
export const progressLogger = ({ log, intervalMs = 10_000, now = Date.now }: ProgressLogOptions): ProgressLogger => {
  let current: { file: string; received: number; finished: boolean } | null = null;
  let lastLoggedAt = 0;

  const finishUnsized = (): void => {
    if (current && !current.finished) log(`downloaded ${current.file} (${size(current.received)})`);
    current = null;
  };

  const onProgress: ProgressHandler = ({ file, received, total }) => {
    if (current?.file !== file) {
      finishUnsized();
      lastLoggedAt = now();
      log(total ? `downloading ${file} (${size(total)})` : `downloading ${file}`);
    }
    current = { file, received, finished: Boolean(total) && received === total };
    if (current.finished) {
      log(`downloaded ${file}`);
      return;
    }
    if (now() - lastLoggedAt < intervalMs) return;
    lastLoggedAt = now();
    log(
      total
        ? `downloading ${file}: ${Math.floor((received / total) * 100)}% (${size(received)} / ${size(total)})`
        : `downloading ${file}: ${size(received)}`,
    );
  };

  return { onProgress, done: finishUnsized };
};
