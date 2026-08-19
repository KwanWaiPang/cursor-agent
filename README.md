# 游戏馆 · Game Hub

中文网页游戏集合：棋类、大富翁、两款 3D 射击、口袋冒险与红帽奇遇，统一大厅入口，纯前端运行，可部署到 GitHub Pages。

A Chinese web game collection — board games, Monopoly-style travel, two 3D shooters, a fan-style adventure, and a Mario-like platformer — served from one static hub for GitHub Pages.

**在线地址 / Live:** https://kwanwaipang.github.io/cursor-agent/

更完整的架构说明见 [ARCHITECTURE.md](./ARCHITECTURE.md)。  
For a fuller architecture overview, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 馆内游戏 / Games

| 路径 Path | 中文名 | English | 类型 Type |
|---|---|---|---|
| [`games/go/`](./games/go/) | 围棋 | Go | 棋类 Board |
| [`games/xiangqi/`](./games/xiangqi/) | 中国象棋 | Chinese Chess | 棋类 Board |
| [`games/gomoku/`](./games/gomoku/) | 五子棋 | Gomoku | 棋类 Board |
| [`games/junqi/`](./games/junqi/) | 军棋 | Junqi (dark chess) | 棋类 Board |
| [`games/monopoly/`](./games/monopoly/) | 大富翁 · 世界之旅 | World Tour Monopoly | 桌游 Board game |
| [`games/chess3d/`](./games/chess3d/) | 国际象棋 · 3D | 3D Chess | 3D 棋类 |
| [`games/fps/`](./games/fps/) | 战术突击 · 3D | Tactical Assault | 3D FPS（红蓝对抗） |
| [`games/street-duty/`](./games/street-duty/) | 街战突击 | Street Duty | 3D FPS（全程序化街战） |
| [`games/pocket/`](./games/pocket/) | 口袋冒险 | Pocket Adventure | 第一人称 3D 卡通粉丝向开局 |
| [`games/redcap/`](./games/redcap/) | 红帽奇遇 | Red Cap Quest | 网页平台跳跃（马里奥式致敬） |

两款射击互不替换：

- **战术突击** (`fps`)：红蓝各约 10 人、据点 / 大逃杀、可拾取武器。
- **街战突击** (`street-duty`)：Claude-of-Duty 本地完整落地；玩家 + 2 队友 + 动态敌方波次。
- **口袋冒险** (`pocket`)：第一人称 3D 卡通真新镇开局（参考 pallet-town-3d）；选御三家、高草遇敌；官方译名 + 中性作品名。
- **红帽奇遇** (`redcap`)：网页平台跳跃；八关原创程序像素，顶砖 / 踩怪 / 蘑菇火花 / 喷火帽。玩法向超级马里奥致敬，**不是**任天堂产品，未使用官方素材或关卡。

The two shooters are separate products:

- **Tactical Assault** (`fps`): ~10 per side, assault / mini battle-royale, pickups.
- **Street Duty** (`street-duty`): full local port of Claude-of-Duty; player + 2 allies + dynamic hostile waves.

---

## 仓库结构 / Repository layout

```
index.html                 # 大厅入口 Hub landing page
ARCHITECTURE.md            # 项目架构（中英） Architecture overview
THIRD_PARTY_NOTICES.md     # 第三方许可 Third-party licenses
css/                       # 大厅与共用样式 Hub / shared styles
assets/                    # 共用静态资源 Shared static assets
games/<name>/              # 各游戏独立目录 One folder per game
.github/workflows/pages.yml
```

约定 / Conventions:

1. 大厅只负责导航；每个游戏自包含入口 `games/<name>/index.html`。  
   The hub only navigates; each game owns `games/<name>/index.html`.
2. 多数游戏是纯静态页面，无需构建。  
   Most games are plain static pages — no build step.
3. **街战突击 / 口袋冒险例外**：Vite 构建产物提交为 `index.html` + `assets/`（Pages 从仓库根目录部署）。  
   **Street Duty / Pocket Adventure:** commit the Vite build (`index.html` + `assets/`) — Pages deploys from the repo root.

---

## 本地预览 / Local preview

### 静态馆（棋类 / 大富翁 / 战术突击 / 红帽奇遇）

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

### 街战突击 / 口袋冒险开发

```bash
cd games/street-duty && npm ci && npm run dev   # :5173
cd games/pocket && npm ci && npm run dev        # :5174
```

生产构建（同步到 Pages 用的 `index.html` + `assets/`）：

```bash
cd games/street-duty && npm run build
cd games/pocket && npm run build
```

详情：[`games/street-duty/README.zh.md`](./games/street-duty/README.zh.md) · [`games/pocket/README.md`](./games/pocket/README.md)

---

## 部署 / Deploy

工作流 [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) 在推送 `main` 时：

1. `npm ci && npm run build`（`games/street-duty` 与 `games/pocket`）
2. 打包静态站（去掉各游戏的 `src/` / `tools/` 等开发文件）
3. 发布到 GitHub Pages

推荐：Settings → Pages → Source 选 **GitHub Actions**。

若仍用 **legacy / 从 `main` 根目录部署**，务必把 Vite 构建产物提交进仓库，否则线上会缺 `assets/`。

---

## 文档索引 / Docs map

| 文档 Doc | 内容 Contents |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 馆级架构、数据流、两款 FPS 边界 |
| [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) | 第三方来源与许可 |
| [games/street-duty/ARCHITECTURE.md](./games/street-duty/ARCHITECTURE.md) | 街战引擎合同（子系统 / 事件） |
| [games/street-duty/README.zh.md](./games/street-duty/README.zh.md) | 街战馆内说明（中文） |
| [games/fps/README.md](./games/fps/README.md) | 战术突击玩法说明 |
| [games/pocket/README.md](./games/pocket/README.md) | 口袋冒险说明 |
| [games/redcap/README.md](./games/redcap/README.md) | 红帽奇遇说明 |

---

## 许可 / License

各游戏目录保留原作者许可；汇总见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。  
Per-game licenses remain in each folder; see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
