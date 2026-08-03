# tolstack

<one-line description.>

Stamped from forge's `template/`; conforms to the forge standard repo layout
(see forge `CONVENTIONS.md`).

## Setup (Windows-native)

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

## Layout

- `data/` — data only (inbox, runs, run log, projections); contents gitignored.
- `docs/` — `sessions/` (handoffs + lessons), `prompts/` (role overrides),
  and this repo's own docs (`ARCHITECTURE.md`, ...).
- `ops.toml` — the ops manifest: this repo's `install`/`serve`/`deploy`/`smoke`
  commands and its hosted targets (forge `CONVENTIONS.md` §8).
- code lives at the top level and in packages — never under `data/`.

## Test

```powershell
venv-win\Scripts\python.exe -m pytest -q
```
