# 口袋冒险 · Pocket Adventure

游戏馆中的 **第一人称 3D 卡通** 粉丝向宝可梦开局。浏览器本地可玩，可部署至 GitHub Pages。

视觉与引擎架构参考 [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)（MIT）：Three.js、程序化建模/贴图；对战/图鉴另有 Pokemon-3D-api GLB（粉丝向镜像，见 `public/models/`）。

| | |
|---|---|
| 在线 Live | https://kwanwaipang.github.io/cursor-agent/games/pocket/ |
| 操作 | 点击锁定鼠标 · WASD 移动 · Shift 跑 · 空格跳 · 鼠标视角 · **E** 互动 · **B** 图鉴 · Esc 释放/暂停 |
| 画质 | URL `?q=low\|medium\|high\|ultra`（默认按设备选 medium/high；低档显著加快草木建造） |

## 游玩

1. 在真新镇门口起步，顺着小路前往 **大木研究所**
2. 桌上三个精灵球：按 E 预览，再按 E 确认御三家
3. 走出屋外，踏入高草可触发野生对战（1 号道路：波波、小拉达、绿毛虫、走路草等）
4. 沿 1 号道路继续南下，穿过 **常青石门** 进入 **常青森林**（虫系为主，等级略高）
5. 走出森林到达 **常青市**：精灵中心回复、便利店对话、挑战 **常青道馆**（地面系馆主）
6. 按 **B** 打开全国图鉴（#001–1025）；未目击为剪影。无上游 3D 的编号回退 PokeAPI / Showdown 2D 立绘
7. 进度自动保存在浏览器 `localStorage`（队伍、图鉴目击、位置）；标题屏可「继续旅程」或「重新开始」

## 开发

```bash
cd games/pocket
npm ci
npm run dev      # http://127.0.0.1:5174
npm run build    # 产出 dist/ 并同步到 index.html + assets/（Pages）
npm run check
npm test
```

刷新全量 GLB 镜像：`node tools/download-pokemon-glbs.mjs`（详见 `public/models/pokemon/README.md`）。

## 版权说明

- 本页为非官方粉丝向作品，与任天堂 / Creatures / Game Freak 无关。
- 宝可梦及官方译名为权利方商标；程序化场景与合成音效为本仓原创/改编。
- 3D 引擎与美术管线大量借鉴 `pallet-town-3d`（MIT，Copyright Paulius）。GLB / 立绘权利归任天堂等，仅作粉丝向展示。详见 `LICENSE` 与上游仓库。

## 后续

当前可玩范围为真新镇开局（研究所 + 1 号道路）以及沿土路南下的常青森林 / 常青市 / 道馆切片。尼比市等更远的关都城镇将沿同一程序化管线继续增加。
