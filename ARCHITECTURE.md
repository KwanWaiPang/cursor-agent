# 项目架构 · Project Architecture

本文描述「游戏馆」仓库如何组织、部署，以及两款 3D 射击如何并存。  
This document explains how the Game Hub is organized and deployed, and how the two 3D shooters coexist.

引擎级细节（街战子系统合同）见 [`games/street-duty/ARCHITECTURE.md`](./games/street-duty/ARCHITECTURE.md)。  
For the Street Duty engine contract (subsystems / events), see [`games/street-duty/ARCHITECTURE.md`](./games/street-duty/ARCHITECTURE.md).

---

## 1. 目标 / Goals

| 中文 | English |
|---|---|
| 一个静态站点，多个可玩入口 | One static site, many playable entries |
| 大厅统一视觉与导航 | Shared hub look-and-feel and navigation |
| 游戏彼此独立，可单独打开 | Games are independent and deep-linkable |
| 尽量零构建；重型游戏显式构建 | Prefer zero-build; heavy games build explicitly |
| GitHub Pages 可部署 | Deployable to GitHub Pages |

---

## 2. 高层结构 / High-level layout

```
                    ┌─────────────────────┐
                    │   index.html (Hub)  │
                    │  大厅导航 / landing │
                    └──────────┬──────────┘
                               │
        ┌──────────┬───────────┴──────┬────────────┬──────────┐
        ▼          ▼                  ▼            ▼          ▼
   games/go/…  games/fps/   games/street-duty/  games/pocket/  games/redcap/
   静态棋类等    静态 FPS       Vite 构建 FPS      静态 3D 冒险   静态平台跳跃
   boards       static FPS     built FPS          FP 3D fan      pixel platformer
```

| 层 Layer | 职责 Responsibility |
|---|---|
| **Hub** (`index.html`, `css/`) | 品牌、游戏卡片、链到各游戏 |
| **Game shell** | 各游戏自有 `index.html` / CSS / JS；可选「← 游戏馆」返回 |
| **Shared assets** (`assets/`) | 少数跨游戏静态资源（如共用音效） |
| **CI / Pages** (`.github/workflows/`) | 构建街战、打包 `_site`、部署 |

Hub 不加载任何游戏运行时；点击卡片即整页跳转。  
The hub does not bootstrap game runtimes; each card is a full navigation.

---

## 3. 游戏分类 / Game categories

### 3.1 纯静态 / Static games

`go` · `xiangqi` · `gomoku` · `junqi` · `monopoly` · `chess3d` · `fps` · `pocket` · `redcap`

- 打开即玩，无需 `npm`。  
  Open and play; no `npm` required.
- 可直接用任意静态服务器托管。  
  Serve with any static file server.

### 3.2 构建型 / Built game

`street-duty` only.

```
src/  +  index.source.html   →  vite build  →  dist/
                                         ↓
                              sync-pages-build.mjs
                                         ↓
                         index.html  +  assets/*.js   （提交进仓库 / committed）
```

| 文件 File | 用途 Purpose |
|---|---|
| `index.source.html` | Vite 开发 / 构建入口 |
| `index.html` + `assets/` | Pages 实际服务的产物 |
| `src/` | 源码（11 个子系统） |
| `tools/` | 截图、性能、录制等本地工具 |

**不要**用开发入口当线上入口：线上必须加载 hashed `assets/*.js`。  
Do **not** ship the Vite source HTML as the live entry — production must load hashed `assets/*.js`.

---

## 4. 两款 FPS 边界 / Two FPS boundaries

| | 战术突击 `games/fps/` | 街战突击 `games/street-duty/` |
|---|---|---|
| 定位 Role | 轻量红蓝街战 Light TDM | 全程序化 CoD 向街战 Full procedural FPS |
| 技术 Stack | Three r160，单页脚本 | Three r180，Vite 多子系统引擎 |
| 阵营 Teams | 红（玩家+约 4 队友）vs 蓝（约 5） | 玩家 `team 0` + 2 盟友 vs 少量敌方波次 |
| 开局 Start | 选模式（据点 / 大逃杀） | 点击进入；突击波 + 队友 |
| 键位 Keys | Q/E 探头，Z 下蹲，H 求助 | Q/E 探头，Z 下蹲；趴下 Ctrl/C |
| 部署 Deploy | 纯静态 Static | 需构建产物 Built artifacts |

二者目录互不引用、互不替换。改一款时不要动另一款。  
They do not import each other and must not replace each other. Edit one without touching the other.

---

## 5. 街战运行时骨架 / Street Duty runtime sketch

```
main.js
  ├─ boot UI / quality pick / optional prewarm
  ├─ Engine (registry + events + input + time + rng)
  │    ├─ render · materials · sky · world
  │    ├─ physics · player · weapons · fx
  │    ├─ ai · ui · audio
  │    └─ playstart (allies, assault wave, director)
  └─ window.__ENGINE__ / __READY__  （工具与验收钩子）
```

| 概念 Concept | 说明 Notes |
|---|---|
| **Registry** | `ctx.peek('ai')` 等运行时取子系统；禁止跨目录静态 import |
| **Events** | `weapon:fire`、`actor:death`、`damage:dealt`… 见街战 `ARCHITECTURE.md` |
| **Quality** | `?q=low\|medium\|high\|ultra`；弱设备默认偏低 |
| **Capture / lockstep** | `?capture=1&lockstep=1` 供截图 / demo；正常游玩不走此路径 |

子系统所有权与硬规则以街战引擎合同为准。  
Subsystem ownership and hard rules live in the Street Duty engine contract.

---

## 6. 部署数据流 / Deploy data flow

```
push main
   → Actions: npm ci && npm run build  (street-duty)
   → copy hub + games into _site/
   → strip street-duty src/tools/node_modules/…
   → GitHub Pages
```

同时：若 Pages 仍为 **legacy 分支部署**，仓库根目录里的 `games/street-duty/index.html` + `assets/` 也会被直接服务——因此构建产物必须进 `main`。

If Pages is still **legacy branch deploy**, the committed `games/street-duty/index.html` + `assets/` are served as-is — so build output must land on `main`.

---

## 7. 开发约定 / Development conventions

1. **新游戏**：在 `games/<slug>/` 自包含实现，并在根 `index.html` 加卡片。  
   **New game:** self-contained under `games/<slug>/`, then add a hub card.
2. **改街战**：改 `src/` → `npm run build` → 提交同步后的 `index.html` + `assets/`。  
   **Street Duty changes:** edit `src/` → `npm run build` → commit synced artifacts.
3. **不要**把 `games/fps/` 与 `games/street-duty/` 混改或互相覆盖。  
   **Do not** mix or overwrite `fps` and `street-duty`.
4. 第三方来源与许可更新时同步 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。  
   Keep [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) in sync when vendors change.
5. 文档：馆级中英说明放根目录；引擎合同（英文）留在 `games/street-duty/ARCHITECTURE.md`。  
   Docs: hub-level bilingual docs at repo root; engine contract (English) stays under Street Duty.

---

## 8. 相关链接 / Related links

- Hub README: [README.md](./README.md)
- Street Duty (ZH): [games/street-duty/README.zh.md](./games/street-duty/README.zh.md)
- Street Duty engine contract: [games/street-duty/ARCHITECTURE.md](./games/street-duty/ARCHITECTURE.md)
- Tactical Assault: [games/fps/README.md](./games/fps/README.md)
- Pocket Adventure: [games/pocket/README.md](./games/pocket/README.md)
- Red Cap Quest: [games/redcap/README.md](./games/redcap/README.md)
- Upstream Street Duty project: [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
