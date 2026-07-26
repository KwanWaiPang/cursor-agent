# 第三方组件说明

本仓库「游戏馆」聚合了多个开源游戏实现，并在统一界面下做了适配。

## 中国象棋（`games/xiangqi/`）

- 来源：[中国象棋 in HTML5](https://github.com/KwanWaiPang/Chess/tree/master/Chinese_Chess)（原作：一叶孤舟 / itlwei）
- 许可证：MIT（见 `games/xiangqi/LICENSE`）

## 国际象棋 3D（`games/chess3d/`）

- 来源：[FrenchYann/Chess3D](https://github.com/FrenchYann/Chess3D)
- AI：[Garbochess-JS](https://github.com/glinscott/Garbochess-JS)
- 许可证：GNU GPL v3（见 `games/chess3d/LICENSE.md`）
- 说明：该目录下的 3D 国际象棋实现按 GPL-3.0 提供；修改与再分发需遵守 GPL。

## 围棋（`games/go/`）

- 本仓库原创实现

## 战术突击 3D（`games/fps/`）

- 渲染库：[Three.js](https://github.com/mrdoob/three.js) r160（MIT）
- 指针锁定控件：Three.js examples `PointerLockControls`（MIT）
- 枪声素材：基于 Wikimedia Commons「9 mm gunshot-mike-koenig-123.wav」（CC BY-SA 4.0）处理为步枪/手枪射击音；换弹音效片段改编自 [Mixkit](https://mixkit.co/free-sound-effects/) 免费音效
- 玩法、低模场景、AK-47 第一人称模型与 CS 风格角色：本仓库原创

## 曹操传 · 战棋演义（`games/caocao/`）

- 本仓库原创战棋引擎与关卡数据
- 玩法与结构致敬《三国志 曹操传》，不包含光荣原作素材、音乐或程序代码
- 战斗公式、兵种射程、地形消耗、计策与关卡脚本思路参考开源引擎 [wateret/mengde](https://github.com/wateret/mengde)（MIT License）；未使用其附带的原作衍生 BMP 素材
- 详见 `games/caocao/ROADMAP.md`

## 三国志 · 九州涂色（`games/sangokushi/`）

- 战略地图、城池精灵与涂色引擎：本仓库原创
- 玩法结构可参考开源项目 [中华三国志](https://github.com/kpxp/ZhongHuaSanGuoZhi-New-Code) 的系统设计（自行重写，不搬运其资源包）
- 武将五维、特技、宝物数据：项目组 [R-C-Group/shuju](https://github.com/R-C-Group/shuju/tree/main/san11)
- 武将头像：项目组 [R-C-Group/touxiang](https://github.com/R-C-Group/touxiang/tree/master/san/311_s)
- 不包含光荣（KOEI）原作程序、官方素材包或未经授权的提取资源
- 详见 `games/sangokushi/data/rc/SOURCE.md`
