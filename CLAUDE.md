# systemone-handson

System One(型付きの判断だけを返すモデル)のハンズオン用リポジトリ．ローカルではLaya，本番ではTypeSafe Jevを使い，`.env`の接続先だけで切り替える．詳しくは`README.md`を参照．

# RTK (Rust Token Killer)

Prefix every shell command with `rtk`, including each command in an `&&` chain — it is always safe (a dedicated filter cuts noisy output for tests, builds, git, and more; anything without one passes through unchanged). The full command reference is in the global `~/.claude/RTK.md` (already loaded, if set up). Meta commands: `rtk gain` (savings so far), `rtk discover` (missed opportunities in past sessions), `rtk proxy <cmd>` (run unfiltered, for debugging).

## Working conventions

- TypeScriptはビルドせず，Nodeの型の除去機能でそのまま実行する．そのため，型の除去で消せない構文(enum，constructorの引数プロパティなど)は使わず，相対importには`.ts`の拡張子を付ける．
- アプリ(`packages/triage`)は`ports/decision-engine.ts`の型だけに依存させる．Jevの型やSDKは`adapters/`の外に出さない．
- laya-serverはJevの`/v1/systemone`と同じ形で答える．Jevとの違いは`packages/laya-server/src/translate.ts`で吸収する．
- 単体テストでモデルを読み込まない．エンジンや通信は差し替える．
- 文書は常体で書き，読点は「，」，句点は「．」を使う(textlintで検査する)．

- `git commit` runs the lefthook hooks. If they fail, fix the reported issues. Do not use `--no-verify`.

- Run `mise run check` after making changes.

## Code map

- `packages/laya-server/`：LayaをJev互換のHTTP APIで公開するサーバ．`Dockerfile`でイメージにする．
- `packages/triage/`：問い合わせを振り分けるサンプルアプリ．`domain/`(判断の解釈)，`ports/`(DecisionEngine)，`adapters/`(systemone-http，fake)，`config.ts`(環境変数からエンジンを選ぶ)．
- `.devcontainer/`：開発用コンテナ．`compose.yml`でlaya-serverも一緒に起動する．
- `.env.example`：アプリの接続先の見本．

# Artifact Cleanup

## Golden Rule

**Whenever you produce an artifact, always run the `system-development-skills:finalize-artifacts` skill to clean it up before reporting the work as done.**

An artifact is any deliverable you create or substantially rewrite: documents, READMEs, code and code comments, config files, scripts, commit messages, PR descriptions, and so on.

- Invoke the skill via the Skill tool (`system-development-skills:finalize-artifacts`) after the artifact is written and before the final reply.
- The skill edits the artifact files in place. Do not append a changelog of the cleanup to the artifact; in the final reply, mention what changed in a sentence or two at most unless the user asks for a full report.
- Skip it only for replies that produce no artifact (answering questions, explaining code, running read-only commands).
- Provided by the `enunun/system-development-skills` plugin (see `extraKnownMarketplaces`/`enabledPlugins` in `.claude/settings.json`).
