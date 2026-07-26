# 中国象棋 · 游戏馆

网页版中国象棋，适配开源「中国象棋 in HTML5」，并套入游戏馆统一界面。

## 功能

- 人机对弈（入门 / 普通 / 进阶深度）
- 残局挑战（八卦阵法、很二棋局、七星会阵）
- 悔棋、重新开始、更换皮肤
- 落子 / 选子音效

## 目录

```
index.html          # 页面入口
css/                # 原样式 + 游戏馆壳层 shell.css
js/                 # 规则、AI、开局库、残局
img/                # 棋盘与棋子皮肤
audio/              # 本地音效（与仓库共享音效同源）
LICENSE             # MIT
```

## 本地运行

```bash
python3 -m http.server 8080
```

打开：<http://localhost:8080/games/xiangqi/>

## 来源

基于 [KwanWaiPang/Chess · Chinese_Chess](https://github.com/KwanWaiPang/Chess/tree/master/Chinese_Chess)（原作一叶孤舟 / itlwei，MIT）。详见仓库根目录 `THIRD_PARTY_NOTICES.md`。
