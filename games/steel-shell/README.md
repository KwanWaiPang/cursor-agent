# 钢壳奇兵 · Steel Shell Commandos

浏览器横版跑打，挂在游戏馆「射击」分区：[`games/steel-shell/`](./)。

A browser run-and-gun in the hub Shooting section.

## 说明 / About

斥候「青岚」沿废土推进三关：锈轨车站、冷凝管廊、钢壳要塞。可以走、跳、下蹲，步枪持续射击，榴弹抛物爆炸。每关有小兵，并在关底迎战一台原创机体。

像素、关卡、音效均为馆内程序绘制的原创内容。玩法向经典横版跑打街机致敬，**不是** SNK 产品，未使用其角色、精灵、音乐或商标作为正式名称。

玩法节奏参考过两部 MIT 原创跑打，但没有搬运它们的源码或素材：

- [CyrilDieumegard/rusted-cannon](https://github.com/CyrilDieumegard/rusted-cannon)（MIT，原创像素，作者声明与 SNK 无关）
- [DanMat/Blastix](https://github.com/DanMat/Blastix)（MIT，程序像素）

许可 / License: MIT，见仓库根目录 [`LICENSE`](../../LICENSE)。说明见 [`NOTICE.md`](./NOTICE.md)。

## 操作 / Controls

| 键 / 触控 | 作用 |
|---|---|
| ← → / A D · 左下方向键 | 移动 |
| W / ↑ · 「上」 | 向上瞄准 |
| S / ↓ · 「蹲」 | 地面下蹲；空中改为向下射击 |
| 空格 / K / Z · 「跳」 | 跳跃（按住更高） |
| J / X · 「射击」 · 鼠标左键 | 步枪。鼠标在画面内时改为瞄准光标 |
| C / Q / G · 「榴弹」 | 投掷榴弹 |
| P / Esc · 顶栏「暂停」 | 暂停 |
| M · 顶栏「声音」 | 开关音效 |

盾兵正面会挡住步枪，榴弹和从背后射击可以打穿。下蹲能躲开多数平射。过关保留分数，并回复 1 点命数（上限 5）。失败或通关后可「再来一局」。

## 运行 / Run

纯静态 ES 模块，无需构建：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080/games/steel-shell/
```

关卡逻辑测试：

```bash
node --experimental-default-type=module --test games/steel-shell/js/engine.test.js
```
