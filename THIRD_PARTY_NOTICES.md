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

- 对局引擎与分级 AI：本仓库原创 / Graded engine and AI: original to this repository
- KataGo 浏览器档 / In-browser KataGo level:
  - 引擎移植自 [Web KaTrain](https://github.com/Sir-Teo/web-katrain)（MIT），其中的神经网络前向与搜索来自 [KataGo](https://github.com/lightvector/KataGo)（MIT）
  - 模型 `g170-b6c96-s175395328-d26788732`，KataGo 仓库公开的测试用小网络 / small public test network from the KataGo repository
- 练习题一到三级：馆内原创 / Beginner drills: original
- 每周一题 / Weekly problems, levels 4–9 of 解题:
  - 作者 / Authors: 安永吉 An Younggil (8 dan) and David Ormerod, Go Game Guru
  - 来源 / Source: [gogameguru/go-problems](https://github.com/gogameguru/go-problems)
  - 许可证 / License: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  - 说明 / Note: 抽出标成 Correct 的正解，改成中文目标和对战练习。这是改编，不是原谱全文。仅供非商业使用。Adapted to Chinese goals and interactive lines; non-commercial only.
- 古典解题（十级起）与官子（公有领域）/ Classical problems, public domain:
  - 碁经众妙 Gokyo Shumyo（Hayashi Genbi，1812）。正解谱转录见 [u-go.net classical problems](https://www.u-go.net/classic/)（Ulrich Goertz；底稿来自 Flygo，经许可再分发）
  - 玄玄棋经 Xuanxuan Qijing（严德甫、晏天章，约 1349）。SGF 由 Jean-Pierre Vesinet 整理，经 u-go.net 发布
  - 玄览 Xuanlan。谱面转录 Flygo → u-go.net
  - 官子谱 Guan Zi Pu。谱面转录 Flygo → u-go.net
- 未收录 / Not included: 101 围棋网、goproblems.com，以及赵治勋、李昌镐的现代题集。这些题目不能再分发。
- 19 路经典全谱 / Full-board classical games, public domain, collected by Andries Brouwer (CWI), who states he claims no rights and that the games are in the public domain: <https://homepages.cwi.nl/~aeb/go/games/>
  - 当湖十局（范西屏、施襄夏，1739）、施襄夏对程兰如、徐星友对程兰如、烂柯，以及唐宋对局
  - 秀策耳赤之局（1846）与御城棋；对太田雄藏、对海老泽健造、对村濑秀甫
  - 本因坊道策御城棋、本因坊秀伯御城棋、本因坊丈和名局（1835，对赤星因彻）

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
- 许可证 / License: MIT（仓库根目录 [`LICENSE`](./LICENSE)）
- 说明 / Note: 网页平台跳跃。角色「阿砖」、关卡与全部像素图、音效均为程序生成的原创素材。玩法向超级马里奥系列致敬，**不是**任天堂产品，未使用任天堂精灵、音乐或关卡拷贝。 Super Mario is a trademark of Nintendo; this is an unofficial fan-style tribute with original art and maps.

---

本仓库为聚合：大厅与原创静态页为 MIT；各子目录若自带许可则从其许可。`games/chess3d/` 为 **GPL-3.0**，不受根目录 MIT 再许可。  
This repo is an aggregate: hub/original static pages are MIT; per-game licenses in subfolders still apply. `games/chess3d/` remains **GPL-3.0**.
