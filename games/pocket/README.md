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

1. 在家中醒来，出门进入 **真新镇**  
2. 前往 **大木研究所**，与博士对话后选择御三家（妙蛙种子 / 小火龙 / 杰尼龟）  
3. 南下 **1 号道路**，在长草中遇敌，进行 Gen1 风格回合战斗  

战斗、种族与招式数据参考 [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)（MIT）的战斗层设计，但本作是 **2D 俯视**，并非其第一人称 3D 移植。

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
| 新宝可梦 | `js/data.js` 的 `SPECIES` / `MOVES`，并在 `sprites.js` 增加剪影 |
| 新地图 | `js/maps.js` 增加地图字符串与 `warps` / `npcs` / `spawns` |
| 剧情旗标 | `game.js` 的 `flags` + NPC `id` 分支 |
| 进化 / 道具 / 多队伍 | 在 `makePartyMon` 与战斗结算处扩展 |

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
