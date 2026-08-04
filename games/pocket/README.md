# 口袋冒险 · Pocket Adventure

游戏馆中的 **俯视 2D** 粉丝向宝可梦开局。浏览器本地可玩，无需安装，可部署至 GitHub Pages。

A top-down 2D fan opening set in Pallet Town. Runs locally in the browser; GitHub Pages friendly.

| | |
|---|---|
| 在线 Live | https://kwanwaipang.github.io/cursor-agent/games/pocket/ |
| 类型 | 纯静态（无构建） |
| 存档 | `localStorage` |

---

## 玩法 / Gameplay

1. **真新镇**：大木研究所领取御三家，与劲敌对战  
2. **1 号道路 → 常青市**：商店取包裹，中心回复体力  
3. 交还包裹获得 **图鉴** 与精灵球（可捕捉野生）  
4. **2 号道路 → 常青森林 → 尼比市**：训练家战、稀有遇敌（含皮卡丘）  
5. **尼比道馆**：击败小刚，获得灰色徽章  

图鉴约 **25** 种（官方中文译名）；X 键打开菜单查看队伍 / 图鉴 / 任务。

战斗公式受 [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)（MIT）启发；本作是 **2D 俯视**，非其 3D 移植。

---

## 操作 / Controls

| 键 | 作用 |
|---|---|
| 方向键 / WASD | 移动 / 菜单光标 |
| Z / 空格 / 回车 | 确认、对话前进、交互 |
| X / Esc | 取消、查看队伍摘要 |
| 手机 | 屏幕虚拟十字键 + A/B |

---

## 扩展方向 / Extending

| 目标 | 建议落点 |
|---|---|
| 新宝可梦 | `js/data.js` 的 `SPECIES` / `MOVES` / `DEX_ORDER`，`shape` 驱动剪影 |
| 新地图 | `js/maps.js`：`tiles` + `warps` / `npcs` / `spawns` |
| 训练家 | NPC 上挂 `trainer: { beatenFlag, party, intro, win, lose }` |
| 剧情旗标 | `game.js` → `defaultFlags()` + `questLines()` |
| 进化 / 商店购物 | 仍可继续扩展 |

立绘与音效保持 **程序化原创**，勿直接加入官方 ROM 素材。

---

## 声明 / Disclaimer

宝可梦 / Pokémon 及相关名称、设定为 Nintendo、Creatures Inc.、Game Freak 等权利方商标或版权。  
本项目为 **非官方粉丝向** 学习作品，与权利方无关，请勿用于商业用途。

---

## 本地运行 / Dev

```bash
# 任意静态服务器，例如：
cd games/pocket && python3 -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

也可从仓库根目录启动静态服务后访问 `/games/pocket/`。
