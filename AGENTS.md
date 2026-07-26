# AGENTS.md

## Cursor Cloud specific instructions

This repo (`弈馆`) is a **static website** — a hub of browser board games (围棋 Go, 中国象棋 Xiangqi, 3D 国际象棋). There is no build system, bundler, or `package.json`; all HTML/CSS/JS is served as-is. Deployment is via GitHub Pages (`.github/workflows/pages.yml`).

### Run (dev)

Serve the repo root as static files and open pages in a browser:

```bash
python3 -m http.server 8080
```

- Hub: <http://localhost:8080/>
- Go: <http://localhost:8080/games/go/>
- Xiangqi: <http://localhost:8080/games/xiangqi/>
- 3D Chess: <http://localhost:8080/games/chess3d/>

Must be served over HTTP (not opened via `file://`) because the Go game uses ES module imports (`import ... from "./engine.js"`), which browsers block on the file protocol.

### Test

Only the Go game has automated tests (plain Node ES-module scripts, no test framework). Run from `games/go/js/`:

```bash
node engine.test.js
node ai.test.js
```

Each prints `All ... tests passed.` on success. There is no lint config in the repo.

### Notes

- No dependencies to install; Node (for tests) and Python 3 (for the dev server) are the only tools needed.
- The Pages workflow strips `*.test.js`, `*.blend`, and `3D/fbx/*` from the deployed artifact; these are dev/source-only and not needed at runtime.
