# systemone-handson

Hands-on material in which learners grow `triage`, a CLI that routes customer inquiries by asking a System One model (typed, calibrated decisions) through a Jev-compatible HTTP API.
Each Iteration has an exercise package and a solution package (pnpm packages), all in one pnpm workspace.
The learner-facing material is written in Japanese. The course plan is in `COURSE.md`; the content of each Iteration is defined in `docs/ROADMAP.md`.

# RTK (Rust Token Killer)

Prefix every shell command with `rtk`, including each command in an `&&` chain — it is always safe (a dedicated filter cuts noisy output for tests, builds, git, and more; anything without one passes through unchanged). The full command reference is in the global `~/.claude/RTK.md` (already loaded, if set up). Meta commands: `rtk gain` (savings so far), `rtk discover` (missed opportunities in past sessions), `rtk proxy <cmd>` (run unfiltered, for debugging).

## Working conventions

- When creating or fixing an Iteration, follow the `build-handson` skill (`enunun/system-development-skills`). Read `COURSE.md` first; it holds the layout, commands, and pitfalls.
- Change the exercise and solution of the same Iteration together in the same commit.
- All solution tests must pass. Exercises must pass type checking and their carried-over tests before the learner adds anything.
- The code, tests and design documents (`design/`) of Iteration N's (N ≥ 1) exercise are identical to Iteration N-1's solution with its advanced-exercise comments removed.
- Solutions run without the advanced exercise (N-7). Its code and tests live in the solution as `// 発展(演習N-7)` comment blocks, and its new files under `advanced/` (see "発展課題" in `COURSE.md`). `tools/check-advanced.mjs` type-checks and tests the version with them applied, and checks the carry-over to the next exercise.
- Design documents are mermaid diagrams (`design/01-context.md` to `05-sequence.md`; see `docs/design.md`). Arrows in the Component diagram must match the implementation's `import`s (`tools/check-component.mjs` checks solutions).
- TypeScript runs without a build step (Node type stripping): use only erasable syntax and add `.ts` to relative imports.
- No test may use Ollama or the model. Output shown in the material must come from real runs against Ollama with `tev1:0.8b`.
- Write prose in the plain style (である調) with `，` and `．`; textlint checks it.
- `git commit` runs lefthook hooks. If they fail, fix the reported issues. Do not use `--no-verify`.
- After making changes, run `mise run check`.

## Code map

```text
iterations/iteration-N/
  exercise/    Exercise package (triage-iteration-N): docs/iteration-N.md (steps), TESTLIST.md (template), design/.
  solution/    Solution package (triage-solution-iteration-N): walkthrough, model TESTLIST.md, model design/.
docs/
  ROADMAP.md   Requirements, modules and topics of each Iteration.
  tdd.md       Test-driven development and test lists.
  design.md    How to write the design documents (C4 model, sequence diagram, mermaid).
  systemone/   Per-Iteration notes on System One concepts, APIs and tools.
tools/mermaid/      Checks the syntax of mermaid diagrams in Markdown.
tools/check-component.mjs  Compares Component diagrams with imports.
tools/check-advanced.mjs   Checks the advanced-exercise comments and the carry-over to the next exercise.
.devcontainer/      Dev container; compose.yml also starts Ollama (POST /v1/systemone, model `tev1:0.8b`) as `ollama`.
```

# Artifact Cleanup

## Golden Rule

**Whenever you produce an artifact, always run the `system-development-skills:finalize-artifacts` skill to clean it up before reporting the work as done.**

An artifact is any deliverable you create or substantially rewrite: documents, READMEs, code and code comments, config files, scripts, commit messages, PR descriptions, and so on.

- Invoke the skill via the Skill tool (`system-development-skills:finalize-artifacts`) after the artifact is written and before the final reply.
- The skill edits the artifact files in place. Do not append a changelog of the cleanup to the artifact; in the final reply, mention what changed in a sentence or two at most unless the user asks for a full report.
- Skip it only for replies that produce no artifact (answering questions, explaining code, running read-only commands).
- Provided by the `enunun/system-development-skills` plugin (see `extraKnownMarketplaces`/`enabledPlugins` in `.claude/settings.json`).
