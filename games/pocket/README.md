# 口袋冒险 · Pocket Adventure

游戏馆中的 **第一人称 3D 卡通** 粉丝向宝可梦开局。浏览器本地可玩，可部署至 GitHub Pages。

视觉与引擎架构参考 [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)（MIT）：Three.js、全程序化建模/贴图，无二进制官方素材。

| | |
|---|---|
| 在线 Live | https://kwanwaipang.github.io/cursor-agent/games/pocket/ |
| 操作 | 点击锁定鼠标 · WASD 移动 · Shift 跑 · 空格跳 · 鼠标视角 · **E** 互动 · Esc 释放 |

## 游玩

1. 在真新镇门口起步，顺着小路前往 **大木研究所**
2. 桌上三个精灵球：按 E 预览，再按 E 确认御三家
3. 走出屋外，踏入高草可触发野生对战（波波 / 小拉达）

## 开发

```bash
cd games/pocket
npm ci
npm run dev      # http://127.0.0.1:5174
npm run build    # 产出 dist/ 并同步到 index.html + assets/（Pages）
npm run check
npm test
```

## 版权说明

- 本页为非官方粉丝向作品，与任天堂 / Creatures / Game Freak 无关。
- 宝可梦及官方译名为权利方商标；立绘与音乐均为程序化原创。
- 3D 引擎与美术管线大量借鉴 `pallet-town-3d`（MIT，Copyright Paulius）。详见 `LICENSE` 与上游仓库。

## 后续

当前可玩范围为真新镇开局（研究所 + 高草对战）。常青市 / 森林 / 尼比道馆的第一人称扩展将沿同一程序化管线继续增加。
