# Street Duty · 街战突击

Hub entry for a browser FPS built with Three.js r180 and WebGL2. This folder is a **local, playable port** of [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) (MIT) — not an iframe or external link.

中文馆内说明（键位、部署、画质）：**[README.zh.md](./README.zh.md)**  
Hub architecture (bilingual): **[../../ARCHITECTURE.md](../../ARCHITECTURE.md)**

It **coexists with** [`../fps/`](../fps/) (Tactical Assault). Do not replace one with the other.

**Live:** https://kwanwaipang.github.io/cursor-agent/games/street-duty/

There are no art assets. Textures, meshes, animation and audio are generated procedurally at load time. Runtime dependency: `three` only.

```bash
npm install
npm run dev          # Vite serves index.source.html → http://127.0.0.1:5173
npm run build        # production bundle → index.html + assets/ (commit these for Pages)
```

Click the canvas after load to lock the cursor.

| Key | Action |
|---|---|
| WASD | Move |
| Mouse | Look |
| LMB / RMB | Fire / ADS |
| R | Reload |
| Shift | Sprint |
| **Z** | **Hold crouch** |
| Ctrl / C | Prone |
| Q / E | Hold lean |
| Space | Jump |
| G | Grenade |
| Esc | Pause / release pointer |

Hub play starts with **2 allies** + an assault wave ahead of the camera. Use `?q=low|medium|high|ultra` and `?prewarm=0` as needed.

---

## What's in it

| subsystem | what it does |
|---|---|
| `render` | HDR pipeline, CSM shadows, GTAO / TAA / bloom (quality-gated), AgX composite |
| `materials` | GPU texture forge: procedural PBR surfaces, POM, triplanar |
| `sky` | Atmospheric scattering, time of day, PMREM, volumetrics |
| `world` | ~120×120 m market street, modular buildings, instanced props |
| `physics` | Custom BVH, character controller, rigid bodies, PBD ragdolls, penetration |
| `player` | Movement state machine, slide / mantle / lean, health |
| `weapons` | Procedural viewmodels, ADS, recoil, ballistics |
| `fx` | GPU particles, decals, tracers, muzzle flash, explosions |
| `ai` | Skinned soldiers, nav, cover, allies (`team 0`) + hostiles |
| `ui` | DOM HUD: crosshair, minimap, compass, killfeed |
| `audio` | Web Audio synthesis — no sound files |

`ARCHITECTURE.md` is the **engine contract**: subsystem interface, directory ownership, event vocabulary, surface types.

Hub-level layout and deploy rules: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

---

## Tooling

| tool | purpose |
|---|---|
| `tools/capture.mjs` | Screenshot one named shot |
| `tools/shotset.mjs` | All named shots in one session |
| `tools/baseline.mjs` | Reproducible per-shot capture |
| `tools/imagediff.mjs` | Per-pixel gate |
| `tools/profile.mjs` | Frame-time distribution / hitch attribution |
| `tools/playtest.mjs` | Scripted movement / fire smoke test |
| `tools/sync-pages-build.mjs` | Copy `dist/` → `index.html` + `assets/` for Pages |

---

## Performance notes (upstream)

Shader pre-warm (`src/core/prewarm.js`) removes mid-fight compile stalls. Hub defaults avoid `ultra` on weak GPUs. Kill-frame work (ragdoll hand-off, death audio/decals) is kept off the critical path where possible — see recent hub commits.

---

## Honest assessment (upstream)

The original project aimed at modern Call of Duty fidelity and documented that it does **not** fully reach that bar. Critic scores and process notes from the upstream README remain useful context; this hub port focuses on **playability, deployability, and controls consistency** with the rest of the Game Hub.

---

## License

MIT — see [LICENSE](./LICENSE). Upstream copyright retained. Hub adaptations: Chinese boot/menu copy, back-to-hub link, ally fireteam, assault director, quality defaults for Pages.
