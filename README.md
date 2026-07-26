# 弈馆

统一风格的网页棋类游戏集合：围棋、中国象棋、3D 国际象棋。可部署到 GitHub Pages，从大厅任选开玩。

## 在线地址

合并并启用 Pages 后：

**https://kwanwaipang.github.io/cursor-agent/**

## 目录

```
index.html              # 游戏大厅入口
css/                    # 统一视觉 / 大厅 / 游戏壳层
assets/audio/           # 共用落子音效
games/go/               # 围棋（见该目录 README）
games/xiangqi/          # 中国象棋（见该目录 README）
games/chess3d/          # 3D 国际象棋（见该目录 README）
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
