# 游戏馆

统一风格的网页游戏集合：围棋、中国象棋、3D 国际象棋、3D 战术射击、曹操传战棋。可部署到 GitHub Pages，从大厅任选开玩。

## 在线地址

合并并启用 Pages 后：

**https://kwanwaipang.github.io/cursor-agent/**

## 目录

```
index.html              # 游戏馆大厅入口
css/                    # 统一视觉 / 大厅 / 游戏壳层
assets/audio/           # 共用音效
games/go/               # 围棋
games/xiangqi/          # 中国象棋
games/chess3d/          # 3D 国际象棋
games/fps/              # 3D 战术射击（据点清剿 / 迷你大逃杀）
games/caocao/           # 曹操传 · 战棋演义（分阶段完整复刻）
THIRD_PARTY_NOTICES.md  # 第三方许可说明
```

## 本地预览

```bash
python3 -m http.server 8080
```

打开 <http://localhost:8080>

## GitHub Pages

1. Settings → Pages → Source 选 **GitHub Actions**
2. 推送到 `main` 后自动部署

## 第三方来源

详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
