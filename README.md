# 围棋 · 网页对局

纯前端网页围棋，支持本地双人对弈，可部署到 GitHub Pages 后直接点击打开。

## 功能

- 标准围棋规则：落子、提子、禁自杀、禁止同形再现（劫争）
- 棋盘规格：9 / 13 / 19 路
- 双方停着后进入点目，可标记死子
- 中国规则计分（子空皆地 + 贴目）
- 停着、认输、悔棋、新对局

## 本地预览

仓库为静态站点，用任意本地服务器打开即可（ES Module 需要 HTTP）：

```bash
python3 -m http.server 8080
```

浏览器访问：<http://localhost:8080>

## GitHub Pages

合并到 `main` 后：

1. 打开仓库 **Settings → Pages**
2. Source 选择 **GitHub Actions**（本仓库已提供部署工作流）
3. 等待 Actions 中的 *Deploy GitHub Pages* 完成

在线地址：

**https://kwanwaipang.github.io/cursor-agent/**

若尚未启用 Pages，也可在 Settings → Pages 中将分支设为 `main` / 根目录 `/`。

## 目录

```
index.html      # 页面入口
css/styles.css  # 样式
js/engine.js    # 规则引擎
js/app.js       # 棋盘绘制与交互
```
