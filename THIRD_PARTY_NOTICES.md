# 第三方组件说明 · Third-party notices

本仓库「游戏馆」聚合多个开源实现，并在统一界面下适配。  
The Game Hub aggregates several open-source games under a shared UI shell.

---

## 中国象棋 · Chinese Chess（`games/xiangqi/`）

- 来源 / Source: [中国象棋 in HTML5](https://github.com/KwanWaiPang/Chess/tree/master/Chinese_Chess)（原作：一叶孤舟 / itlwei）
- 许可证 / License: MIT（`games/xiangqi/LICENSE`）

## 国际象棋 3D · Chess 3D（`games/chess3d/`）

- 来源 / Source: [FrenchYann/Chess3D](https://github.com/FrenchYann/Chess3D)
- AI: [Garbochess-JS](https://github.com/glinscott/Garbochess-JS)
- 许可证 / License: GNU GPL v3（`games/chess3d/LICENSE.md`）
- 说明 / Note: 修改与再分发需遵守 GPL。 Modifications and redistribution must follow the GPL.

## 围棋 · Go（`games/go/`）

- 本仓库原创 / Original to this repository

## 大富翁 · 世界之旅 · World Tour Monopoly（`games/monopoly/`）

- 玩法骨架参考 / Gameplay skeleton: [HumanSean/javascript-monopoly](https://github.com/HumanSean/javascript-monopoly)（ISC）
- 许可 / License: ISC（`games/monopoly/LICENSE`）
- 说明 / Note: 实体棋「世界之旅」式环线；城市与界面为游戏馆原创配置，非商业大富翁产品官方地图复制。 Hub-authored board cities/UI — not an official Monopoly product map.

## 战术突击 3D · Tactical Assault（`games/fps/`）

- 渲染库 / Renderer: [Three.js](https://github.com/mrdoob/three.js) r160（MIT）
- 指针锁定 / Pointer lock: Three.js examples `PointerLockControls`（MIT）
- 枪声素材 / Gunshot samples: based on Wikimedia Commons「9 mm gunshot-mike-koenig-123.wav」（CC BY-SA 4.0）；换弹片段改编自 [Mixkit](https://mixkit.co/free-sound-effects/)
- 玩法、场景、AK 第一人称模型与角色：本仓库原创 / Gameplay, scene, AK viewmodel and characters: original to this repo

## 街战突击 · Street Duty（`games/street-duty/`）

- 来源 / Source: [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
- 许可证 / License: MIT（`games/street-duty/LICENSE`）
- 渲染库 / Renderer: [Three.js](https://github.com/mrdoob/three.js) r180（MIT）
- 说明 / Note: 游戏馆以独立入口**本地完整落地**（Vite + `src/`，非外链/iframe）；中文标题、暂停菜单、大厅返回、队友与突击导演为适配层。原作者版权声明保持不变。 Full local port in the hub (not an embed). Chinese UI, back-to-hub link, ally fireteam and assault director are hub adaptations. Upstream copyright retained.

## 口袋冒险 · Pocket Adventure（`games/pocket/`）

- 来源 / Source: [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)
- 许可证 / License: MIT（`games/pocket/LICENSE`）
- 渲染库 / Renderer: [Three.js](https://github.com/mrdoob/three.js) r185（MIT）
- 说明 / Note: 第一人称 3D 卡通粉丝向；中文 UI、游戏馆入口与 Pages 打包为适配层。宝可梦为权利方商标，本页为非官方粉丝向。 Upstream MIT retained; hub adds Chinese UI and packaging.

## 红帽奇遇 · Red Cap Quest（`games/redcap/`）

- 来源 / Source: 本仓库原创 / Original to this repository
- 许可证 / License: 与馆内静态页一致（见仓库根许可说明）
- 说明 / Note: 网页平台跳跃。角色「阿砖」、关卡与全部像素图、音效均为程序生成的原创素材。玩法向超级马里奥系列致敬，**不是**任天堂产品，未使用任天堂精灵、音乐或关卡拷贝。 Super Mario is a trademark of Nintendo; this is an unofficial fan-style tribute with original art and maps.
