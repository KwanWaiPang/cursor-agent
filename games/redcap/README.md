# 红帽奇遇 · Red Cap Quest

浏览器平台跳跃，挂在游戏馆「冒险」分区：[`games/redcap/`](./)。

A browser platformer in the hub Adventure section.

## 说明 / About

玩法向超级马里奥致敬（跑、跳、顶砖、踩怪、龟壳、蘑菇 / 火花 / 星星、喷火、旗杆），**全部像素图、音效与八关地图均为原创程序生成**，不是任天堂产品，也没有使用官方素材或 1-1 原版关卡。

Tribute gameplay only. Original procedural pixel art, chiptune SFX, and eight original stages. Not a Nintendo product.

主角叫「阿砖」。世界：青丘草原、砖穴地底、云上跑道、石火城堡、霜镜雪原、碧波水道、夜林鬼径、熔心要塞。

## 操作 / Controls

| 键 / 触控 | 作用 |
|---|---|
| ← → / A D · 左下两圆 | 移动 |
| Z / 空格 / K / ↑ · 右下大圆 | 跳跃 |
| X / J / Shift · 右下旁圆 | 冲刺；喷火帽时喷火 |
| P / Esc · 右上 | 暂停 |

## 运行 / Run

纯静态 ES 模块，无需构建：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080/games/redcap/
```
