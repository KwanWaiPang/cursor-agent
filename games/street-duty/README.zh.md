# 街战突击

游戏馆新入口。**不是外链或 iframe**，而是参照 [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)（MIT）在本仓库本地落地的完整可玩实现：Three.js r180、全程序化资产、`src/` 下 11 个子系统（约 6.5 万行 JS），运行与构建都在 `games/street-duty/` 内完成。

与现有 `games/fps/`（据点清剿 / 迷你大逃杀）并存，互不替换。

## 本地开发

```bash
cd games/street-duty
npm install
npm run dev          # http://127.0.0.1:5173
```

## 构建（GitHub Pages 部署用）

```bash
npm run build        # 产出 dist/
```

Pages 工作流会在部署前自动构建，并把 `dist/` 内容放到站点的 `games/street-duty/`。

## 操作

点击画面锁定鼠标。WASD 移动，鼠标瞄准，左键射击，右键开镜，R 换弹，Shift 冲刺，Ctrl 蹲下，空格跳跃，Q/E 侧身，Esc 暂停。

原作者说明与架构见同目录 `README.md`、`ARCHITECTURE.md`。许可见 `LICENSE`。
