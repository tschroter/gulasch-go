# SDLC (repo)

GulaschGo delivery loop for Cursor Agent / Projects.

## Quick start

```text
/sdlc <player-facing slice goal>
```

Phases: **plan → human gate → implement → test → review**.

## Layout

| Path | Role |
| --- | --- |
| `.cursor/skills/sdlc/` | `/sdlc` orchestrator skill |
| `.cursor/agents/plan.md` | Plan subagent |
| `.cursor/agents/implement.md` | Implement subagent |
| `.cursor/agents/test.md` | Test subagent (readonly) |
| `.cursor/agents/review.md` | Review subagent (readonly) |
| `.cursor/rules/sdlc.mdc` | Human-gate / phase rule |
| `docs/sdlc/templates/` | Handoff templates |
| `docs/sdlc/runs/` | Optional git-tracked run artifacts |

The human **must** approve the plan before implement/test/review.

## Models

| Role | Model | Cursor ID |
| --- | --- | --- |
| Project chat + orchestrator | Claude Opus 4.8 | `claude-opus-4-8` |
| `plan` / `implement` / `test` / `review` | Claude Sonnet 4.6 | `claude-sonnet-4-6` |

Phase agents pin Sonnet via `model:` in `.cursor/agents/`. Opus 4.8 is chosen in the **Project chat model picker** (orchestrator); there is no separate Project default-model settings page, and skill YAML cannot set the parent model.

Product context: web browser game, PS1-era low-poly 3D. This scaffolding does not implement the game.
