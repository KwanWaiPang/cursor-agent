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

## 大富翁 · 世界之旅（`games/monopoly/`）

- 玩法骨架参考：[HumanSean/javascript-monopoly](https://github.com/HumanSean/javascript-monopoly)（ISC）
- 许可：ISC（见 `games/monopoly/LICENSE`）
- 说明：实体棋「世界之旅」式环线；棋盘城市与界面为游戏馆原创配置，非商业大富翁产品官方地图复制。

## 战术突击 3D（`games/fps/`）

- 渲染库：[Three.js](https://github.com/mrdoob/three.js) r160（MIT）
- 指针锁定控件：Three.js examples `PointerLockControls`（MIT）
- 枪声素材：基于 Wikimedia Commons「9 mm gunshot-mike-koenig-123.wav」（CC BY-SA 4.0）处理为步枪/手枪射击音；换弹音效片段改编自 [Mixkit](https://mixkit.co/free-sound-effects/) 免费音效
- 玩法、低模场景、AK-47 第一人称模型与 CS 风格角色：本仓库原创

## 街战突击（`games/street-duty/`）

- 来源：[mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
- 许可证：MIT（见 `games/street-duty/LICENSE`）
- 渲染库：[Three.js](https://github.com/mrdoob/three.js) r180（MIT）
- 说明：游戏馆以独立入口**本地完整落地**其实现（Vite + `src/` 全程序化子系统，非外链/iframe）；中文标题/暂停菜单与大厅返回链接为适配层改动。原作者版权声明保持不变。

