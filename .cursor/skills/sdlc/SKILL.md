---
name: sdlc
description: >-
  Run the GulaschGo SDLC loop: plan → human gate → implement → test → review.
  Use when the user invokes /sdlc, asks to run the delivery loop, or starts a
  new game slice that needs gated multi-agent work.
disable-model-invocation: true
---

# GulaschGo `/sdlc`

Orchestrate one thin vertical slice for the PS1-era low-poly browser game.

## Hard rules

1. Phase order: **plan → HUMAN GATE → implement → test → review**.
2. **Never** start implement, test, or review until a human explicitly approves the plan.
3. Do not implement the whole game in one pass — one slice per loop.
4. Delegate specialized work to the matching subagent in `.cursor/agents/`.
5. Persist handoff artifacts (see templates under `docs/sdlc/templates/`).

## Model policy (required)

| Role | Model | Cursor model ID |
| --- | --- | --- |
| Project chat + `/sdlc` orchestrator (this skill’s parent) | Claude Opus 4.8 | `claude-opus-4-8` |
| `plan`, `implement`, `test`, `review` subagents | Claude Sonnet 4.6 | `claude-sonnet-4-6` |

- Set Opus 4.8 in the **Project chat model picker** (orchestrator). There is no dedicated “Project default model” settings screen; skills cannot set the parent model in YAML.
- Subagents pin Sonnet 4.6 via `model: claude-sonnet-4-6` in `.cursor/agents/*.md`. Do not override to `inherit` or another model when launching them.
- If a Task/delegation UI asks for a model, pass `claude-sonnet-4-6` for the four SDLC agents.

## Invocation

User provides a goal, e.g.:

```text
/sdlc Add WASD movement in a low-poly courtyard
```

If the goal is missing, ask for one short player-facing outcome before planning.

## Artifact locations

Prefer, in order:

1. Cursor Project store `docs/runs/<slice-id>/` when running inside a Project
2. Repo path `docs/sdlc/runs/<slice-id>/` otherwise

Create the run directory if needed. Copy structure from `docs/sdlc/templates/`.

`<slice-id>`: short kebab-case slug from the goal (e.g. `wasd-courtyard`).

## Phase playbook

### 1. Plan

- Delegate to subagent **plan** (`.cursor/agents/plan.md`).
- Pass the user goal, product context (web PS1 low-poly 3D), and any prior artifacts.
- Require output file `plan.md` with status `awaiting-approval`.
- Summarize the plan for the human; do **not** continue.

### 2. Human gate (mandatory stop)

Present:

- Slice goal
- Path to `plan.md`
- Acceptance criteria (bullet list)
- Risks / open questions
- Exact prompt: reply **approve**, **revise …**, or **reject**

Treat as approval only unambiguous consent (“approve”, “approved”, “LGTM proceed”, “ship it”).

On revise: re-run **plan**, update `plan.md`, stop again at the gate.  
On reject: end the loop; leave status `rejected`.

### 3. Implement (only after approval)

- Update plan status to `approved` (note approver text + date if known).
- Delegate to **implement** with the approved plan path.
- Expect `impl-notes.md` plus code changes in scope.

### 4. Test

- Delegate to **test** with plan + impl notes + diff summary.
- Expect `test-report.md`.
- If blockers: either re-run **implement** under the same approved plan, or propose a plan revision (which re-enters the human gate).

### 5. Review

- Delegate to **review** (prefer `readonly`) with plan, impl notes, test report, and diff.
- Expect `review-report.md` with verdict `approve` | `request-changes` | `revise-plan`.
- On `request-changes`: implement → test → review again.
- On `revise-plan`: back to plan + human gate.
- On `approve`: summarize ship readiness for the human.

## Delegation checklist

When launching a subagent, include:

- Slice id and artifact directory
- Absolute or repo-relative paths to prior artifacts
- Explicit “in scope / out of scope” from the approved plan
- Reminder: PS1 aesthetic constraints matter for acceptance

## Anti-patterns

- Skipping the gate “to save time”
- Parallel implement while plan is still draft
- Expanding scope mid-implement without a new approved plan
- Treating review as a rubber stamp when tests failed
