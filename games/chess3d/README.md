# 国际象棋 · 3D · 游戏馆

WebGL 立体国际象棋，适配 Chess3D，并套入游戏馆统一界面与中文菜单。

## 功能

- 3D 棋盘与程序化斯顿顿轮廓棋子（顶部汉字标：王/后/车/象/马/兵）
- 侧栏「新对局」集中选择执白/执黑与 AI 等级 1–10（与围棋/五子棋布局一致）
- 悔棋、载入 / 保存 PGN
- 兵升变选择
- 落子音效

## 目录

```
index.html       # 页面入口
css/shell.css    # 游戏馆壳层与侧栏样式
js/              # Three.js 场景、GUI、Garbochess AI
3D/json/         # 棋盘边框模型（棋子为程序化几何）
texture/         # 贴图
LICENSE.md       # GPL-3.0
```

## 本地运行

```bash
python3 -m http.server 8080
```

打开：<http://localhost:8080/games/chess3d/>

需要浏览器支持 **WebGL**。若不支持，页面会提示并引导返回游戏馆。

## 来源

基于 [FrenchYann/Chess3D](https://github.com/FrenchYann/Chess3D)（GPL-3.0），AI 使用 Garbochess-JS。详见仓库根目录 `THIRD_PARTY_NOTICES.md`。
