# R-C-Group 武将 / 头像 / 关系核对

数据源：

- https://github.com/R-C-Group/shuju/tree/main/san11
- https://github.com/R-C-Group/touxiang/tree/master/san/311_s

重建脚本：`games/sangokushi/scripts/import_rc_data.py`

## 核对结果（本次导入）

| 项目 | 数量 |
|------|------|
| `general.json` 武将 | **670** |
| 头像成功匹配 | **670 / 670** |
| 缺失头像 | **0** |
| `power.json` 势力 | 38 |
| `trick.json` 特技 | 100 |
| `treasure.json` 宝物 | 43 |
| `关系.xlsx` 有关系条目的武将 | 326 |
| 解析后含父子/亲爱/厌恶/关联的武将 | 361 |
| 含父亲字段且能解析到武将 id | 126 |

## 头像异体字映射

部分文件名使用异体字、扩展汉字或错误编码（PUA），已显式映射：

| 武将名 | 头像文件名 |
|--------|------------|
| 孔伷 | `孔` + PUA 编码字 |
| 司马伷 | `司马` + PUA 编码字 |
| 刘璝 | `刘` + PUA 编码字 |
| 荀顗 | 荀𫖮 |
| 荀勖 | 荀勗 |
| 田豫 | 田予 |
| 马云禄 | 马云𫘧 |
| 车冑 | 车胄 |
| 钟会 / 钟繇 / 钟毓 / 钟離牧 | 锺会等 |
| 辛毗 | 辛毘 |
| 麴义 | 麹义 |
| 朱儁 | 朱俊 |

运行时头像统一为 `assets/portraits/{武将id}.jpg`。

## 所属

每位武将带 `powerId`，对应 `power.json` 势力君主名（如曹操=1、刘备=2…）。  
190 剧本各军编制为该 `powerId` **全量武将**，并按历史补入客将（如董卓军含吕布/貂蝉/贾诩）。

## 关系

- `人物.xlsx`：相性、生年、没年、探索地（籍贯）、父亲  
- `关系.xlsx`：亲爱 / 厌恶（以空行分隔时区分；无空行则记为关联名单）  
- 繁简与异体字经 `zhconv` + 变体表对齐到 `general.json` 姓名  

## 复现

```bash
# 需本地已 clone 到 /tmp/shuju 与 /tmp/touxiang
python3 games/sangokushi/scripts/import_rc_data.py
```
