# 第三方说明

本项目自行编写的代码和文档采用根目录 `LICENSE` 中的 MIT 许可证。第三方代码、字体、音频及参考原作形象制作的美术资源按下文分别说明；根目录许可证不授予原作角色、标识、音乐或其他第三方素材的权利。本项目为非官方爱好者作品，与 MINTROCKET、NEXON、LocalThunk、Playstack 无隶属或认可关系。

## Browslatro

来源：https://github.com/oreoshake-s-team/browslatro

基线：`f593487a559094ced2fb41b8ca6220326fd99bf1`

版权：Copyright (c) 2026 Neil Matatall

许可证：[MIT 全文](licenses/Browslatro-MIT.txt)

`src/game/deck.ts` 的标准牌生成、Fisher–Yates 洗牌与随机算法，`src/game/score.ts` 的标准牌判定、筹码映射与计分牌选择，以及 `src/game/config.ts` 的九种牌型基础值，依据上游 `src/cards/deck.ts`、`src/test/rng.ts`、`src/scoring/handEvaluator.ts`、`src/scoring/scoring.ts` 和 `src/constants.ts` 进行精简适配。对应规则测试参考上游样例及本项目规则文档。

## VT323

像素字体通过 `@fontsource/vt323` 本地打包。许可证：[SIL Open Font License](licenses/VT323-OFL.txt)。

## 游戏插画

`public/art/dave-joker-atlas.png` 是使用 Image Gen 根据公开卡面参考图重绘的五张 Joker。图形设计参考 Balatro 的 Banner、Joker、Abstract Joker、Card Sharp 和 Blue Joker；这些牌也出现在《潜水员戴夫》的 Jimbo 游戏名单中。

视觉参考：[官方宣传截图](https://www.playbalatro.com/press-kit)、[卡面图鉴](https://gamestrategyhub.com/games/balatro/jokers/)。卡名、标识与原作角色设计属于各自权利人。项目打包的位图是参考重绘稿，未从正版游戏安装文件提取素材。

`public/art/dave-jokers-expanded.png` 为其余 28 张牌的 Image Gen 插画图集，`public/art/buffoon-packs.png` 为三种卡包的独立 Image Gen 封面。两者是基于牌名与视觉参考制作的适配稿，不代表原作逐像素素材；提示词说明见 [美术资源](docs/artwork.md)。

扑克牌使用独立绘制的 SVG 像素花色与双向人物插画；2～10 按点数排列花色，A 使用中央大花色。牌背与界面由 HTML/CSS 绘制。

## Capacitor 与 React

Android 容器使用 Capacitor Core/Android 8.5.2 与 App 插件 8.1.1，版权归 Drifty Co. 所有，采用 MIT 许可证。React 与 React DOM 19.2.6 同样采用 MIT 许可证。

APK 内的 `assets/public/licenses/` 包含 Jimbo 自有代码、Capacitor、React、React DOM、Browslatro 和 VT323 的许可证全文，以及音频署名和本说明。构建时通过 `npm run notices:sync` 同步这些文件。

## 音乐与音效

`public/audio/` 使用 Balatro-GBA 的 12 个 WAV 音效与主题曲。来源提交为 `eb4146aa2bf76a22d722170382618e65bb59046c`，来源与署名见 [音频说明](docs/audio.md) 和 [音频许可与权利说明](licenses/Balatro-GBA-audio.txt)。倍率音效原始作者为 poissonmort（CC BY 4.0）；其余音效的上游说明为 LocalThunk（CC0）。主题曲为 cellos51、MeirGavish 根据 LouisF 原作配乐和 MrCrimit 转谱制作的改编，保留原权利人权利。

## Gradle Wrapper

`android/gradlew`、`android/gradlew.bat` 与 `android/gradle/wrapper/gradle-wrapper.jar` 来自 Gradle，按 [Apache License 2.0](licenses/Gradle-Apache-2.0.txt) 分发。脚本保留上游版权声明。来源：https://github.com/gradle/gradle 。
