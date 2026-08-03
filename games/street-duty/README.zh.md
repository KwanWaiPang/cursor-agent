# 街战突击 · Street Duty

游戏馆中的完整程序化第一人称街战。**不是外链或 iframe**，而是参照 [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)（MIT）在本仓库本地落地的可玩实现。

A full procedural first-person street shooter inside the Game Hub. **Not an embed or iframe** — a local playable port of [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) (MIT).

与 [`games/fps/`](../fps/)（战术突击）**并存、互不替换**。  
Coexists with [`games/fps/`](../fps/) (Tactical Assault); they do **not** replace each other.

| | 中文 | English |
|---|---|---|
| 在线 Live | https://kwanwaipang.github.io/cursor-agent/games/street-duty/ | same URL |
| 画质 Quality | `?q=low\|medium\|high\|ultra` | URL override |
| 预热 Prewarm | `?prewarm=0` 跳过着色器预热 | skip shader pre-warm |

馆级架构见仓库根目录 [ARCHITECTURE.md](../../ARCHITECTURE.md)。  
Hub architecture: [ARCHITECTURE.md](../../ARCHITECTURE.md).

---

## 玩法概要 / Gameplay summary

- 加载完成后点击进入街区，锁定鼠标。  
  After load, click to enter and lock the pointer.
- 开局 **2 名队友**（蓝灰外观，积极跟推、包抄）在街头；敌人刷在 **街尾**（约 40–58 m），驻军也落在远端。  
  Start with **2 allies** (blue-grey, aggressive push/flank) at the near end; hostiles open at the **far end** (~40–58 m), with garrison farther still.
- **队友间无友伤**（子弹 / 手雷均不互伤）；敌人仍会伤害队友。  
  **No friendly fire** among the fireteam (bullets and grenades); hostiles still wound allies.
- 玩家阵亡后 **10 秒复活**（HUD 倒计时），回到出生点。  
  After death the player **respawns in 10 seconds** (HUD countdown) at a spawn point.
- 敌我都会在挨打时找掩体，小队交替压制 / 包抄；弱画质 **少人但更聪明**。  
  Both sides seek cover under fire and rotate suppress/flank roles; low/medium quality uses **fewer, smarter** hostiles.
- 存活敌方过少时，导演会分批补兵（避免同帧刷整波）。  
  When hostiles drop too low, a director respawns them **one at a time** to avoid spawn hitches.

---

## 操作 / Controls

| 键 Key | 中文 | English |
|---|---|---|
| WASD | 移动 | Move |
| 鼠标 / Mouse | 瞄准 | Look |
| 左键 LMB | 射击 | Fire |
| 右键 RMB | 开镜 ADS | Aim down sights |
| R | 换弹 | Reload |
| Shift | 冲刺 | Sprint |
| **Z** | **按住下蹲** | **Hold to crouch** |
| Ctrl / C | 趴下 | Prone |
| Q / E | 按住探头 | Hold to lean |
| Space | 跳跃 | Jump |
| G | 手雷 | Grenade |
| Esc | 暂停 / 释放鼠标 | Pause / release pointer |

---

## 本地开发 / Development

```bash
cd games/street-duty
npm install
npm run dev          # Vite → index.source.html
```

开发用 `index.source.html`；**不要**指望根目录 `index.html` 走 Vite HMR（那是 Pages 产物入口）。  
Dev uses `index.source.html`. The root `index.html` is the **Pages production entry**, not the HMR entry.

---

## 构建与部署 / Build & deploy

```bash
npm run build        # vite build && node tools/sync-pages-build.mjs
```

会生成并覆盖：

- `index.html`
- `assets/index.source-*.js`

**必须把上述产物提交进 `main`**（尤其在 legacy / 分支根目录部署时）。Actions 工作流也会在发布前再构建一次。

You **must commit** those artifacts to `main` (especially for legacy branch-root Pages). The Actions workflow also rebuilds before publish.

发布前自检 / Smoke checks:

```bash
grep -q './assets/' index.html
ls assets/*.js
```

---

## 画质建议 / Quality tips

| 场景 Scene | 建议 Hint |
|---|---|
| 笔记本集显 Laptop iGPU | `?q=low` 或 `medium` |
| 验收流畅度 Smoothness check | `?q=low&prewarm=0` |
| 截图 / Demo 录制 Capture | `?capture=1&lockstep=1`（工具链用，非日常游玩） |

默认按设备探测；弱设备不再默认 `ultra`，避免黑屏卡死。  
Quality is auto-detected; weak GPUs no longer default to `ultra`.

---

## 文档 / Docs

| 文档 Doc | 说明 |
|---|---|
| [README.md](./README.md) | 上游英文说明 / Upstream English notes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 引擎合同（子系统、事件、硬规则）Engine contract |
| [../../ARCHITECTURE.md](../../ARCHITECTURE.md) | 游戏馆级架构 Hub architecture |
| [LICENSE](./LICENSE) | MIT |

子系统一览（详见引擎合同）：`render` · `materials` · `sky` · `world` · `physics` · `player` · `weapons` · `fx` · `ai` · `ui` · `audio`。
