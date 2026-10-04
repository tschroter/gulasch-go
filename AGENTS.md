# GulaschGo agent notes

## Models

- **Project default model:** Claude Opus 4.8 (`claude-opus-4-8`)
- **`/sdlc` orchestrator:** Claude Opus 4.8 (`claude-opus-4-8`) — same as Project default
- **SDLC phase agents** (`plan`, `implement`, `test`, `review`): Claude Sonnet 4.6 (`claude-sonnet-4-6`), pinned in `.cursor/agents/`

## SDLC

Use `/sdlc` (`.cursor/skills/sdlc/`). Order: plan → human gate → implement → test → review. Details: `docs/sdlc/README.md`.
