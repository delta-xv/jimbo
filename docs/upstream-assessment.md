# Browslatro 复用评估

## 结论

P0 验证通过。采用 **独立精简应用 + 按模块移植规则与测试** 的方式推进 P1。P1 已按下述边界完成标准牌逻辑的精简适配与可玩界面。本文中的 2667 项测试属于上游基线，本项目的验证结果见 README。

技术方向保持 React + TypeScript + Vite，核心引擎独立于 React。复用上游标准牌算法与测试样例，重新实现精简状态机、五种 Joker 解释器、商店和展示层。初始化本地 Jimbo 仓库，不创建远端 Fork。

## 验证基线

| 项目 | 实测值 |
| --- | --- |
| 仓库 | https://github.com/oreoshake-s-team/browslatro |
| Commit | `f593487a559094ced2fb41b8ca6220326fd99bf1` |
| 平台 | macOS arm64 |
| Node | 26.4.0，与上游 `.node-version` 一致；使用临时运行时，未替换本机 Node |
| Yarn | 4.15.0，上游仓库自带二进制 |
| Linker | `.yarnrc.yml` 实际为 `pnpm`；README 中 PnP 的说明不适用于该提交 |
| 安装源 | `https://registry.npmmirror.com` |
| 安装 | `install --immutable`，退出码 0；lockfile 未修改 |
| TypeScript 与构建 | `yarn build` 内执行 `tsc && vite build`，退出码 0 |
| 核心测试 | 211 个文件、2667 个测试全部通过，退出码 0，耗时 38.28 秒 |
| 产物 | `build/`，磁盘占用约 32 MB |
| 最大单资源 | ONNX WASM 26,827.54 kB，来自构建日志，尚未压缩 |
| 上游工作区 | 验证完成后 `git status --porcelain` 为空 |
| yarn.lock SHA-256 | `e203083fa70a93beaf473615ddc80b33bdf47edab2c98a87559070c5fc0249da` |

日志保留在项目 `logs/p0-install.log`、`logs/p0-build.log`、`logs/p0-core-tests.log`。它们是本机验证证据，不纳入 Git。未执行完整上游测试集、覆盖率、浏览器 E2E、Android 真机测试或离线冷启动测试；本次结果不代表这些检查已经通过。

安装存在非阻塞 peer dependency 警告：Vitest 与 coverage 插件版本不匹配、Storybook 与 addon 版本不匹配、ESLint 插件范围不匹配及缺少 `playwright-core` peer。安装环境禁用了依赖构建脚本，日志提示 esbuild/protobufjs；本次类型检查、构建和选定测试仍通过。构建有 `advancedChunks` 弃用提示。精简应用不沿用整份上游依赖清单。

## 验证范围与重现

在上述 commit、Node 26.4.0 下使用仓库自带 Yarn：

```sh
export NO_PROXY=localhost,127.0.0.1,::1
export YARN_NPM_REGISTRY_SERVER=https://registry.npmmirror.com
node .yarn/releases/yarn-4.15.0.cjs install --immutable
node .yarn/releases/yarn-4.15.0.cjs build
node .yarn/releases/yarn-4.15.0.cjs test \
  src/scoring src/cards src/items/jokers src/run src/save src/store \
  src/hooks/usePlayHand.test.tsx \
  src/hooks/useRoundLifecycle.test.tsx \
  src/hooks/useDiscardPipeline.test.tsx \
  src/App.jokerReorder.test.tsx \
  src/App.jokerScore.test.tsx \
  src/App.test.tsx --maxWorkers=4
```

执行前保留现有 HTTP/HTTPS 代理设置。本次安装还将 Yarn cache/global 目录指定到临时目录，并设置 `YARN_ENABLE_GLOBAL_CACHE=false`，以便清理。构建脚本已包含 TypeScript 检查，因此没有在相同代码状态重复运行 `typecheck`。

测试覆盖范围包括上游牌型与基础计分、标准牌库与抽补牌、Joker 效果、商店动作、回合重置、存档和部分 App 集成行为。测试中的 Balatro 特有功能仅说明上游当前基线可运行，不自动转化为 Jimbo 的验收要求。

## 模块取舍

| 上游位置 | 决策 | 移植边界 |
| --- | --- | --- |
| `src/cards/types.ts` | 精简类型 | 保留 rank/suit/id，移除增强、封蜡和版本 |
| `src/cards/deck.ts` | 移植标准牌算法 | 52 张生成、Fisher–Yates 洗牌、deal、补牌数量和排序；去掉 localStorage 测试开关、牌组变换、全局 ID 计数器与默认随机源 |
| `src/scoring/handEvaluator.ts` | 移植标准牌判定 | 保留 9 种牌型及 A 高低顺子；Royal Flush 归并同花顺；去掉 Stone/Wild/Four Fingers 等分支 |
| `src/scoring/scoring.ts` | 移植基础部分 | 保留单牌筹码、计分牌选择；精简增强依赖，接入唯一计分入口 |
| `src/constants.ts` | 只取 9 种牌型基础值 | 不保留 Ante、Stake、Blind 的配置 |
| `src/items/jokers/scoring/*` | 参考数据效果与顺序模式 | 五种效果重新定义，采用从左到右的加乘顺序，输出计分事件 |
| `src/store/*`、`src/hooks/*` | 重建状态机 | 不移植 17 个 slice、复杂 consumable/pack/deck/stake 及动画游标状态 |
| `src/save/*` | 参考版本化与异常处理 | 定义显式、可校验的 Jimbo 存档结构，保存随机流状态；不直接序列化整个 UI store |
| `src/test/rng.ts` | 参考确定性 RNG | 显式持有并保存随机状态，拆分牌库流与商店流 |
| UI、AI、PWA、资源 | 不整体复制 | 触屏使用 Pointer Events；AI/遥测/旧 Service Worker 不引入；牌面使用自制基础图形 |

与被移植逻辑对应的上游测试一起精简迁入；新增 Jimbo 验收场景以 `rules.md` 为准。移植后的代码需要重新验证，当前上游通过结果不能替代 P1 检查。

## 关键发现

### 规则差异

上游默认弃牌次数为 3（`src/items/bosses.ts`），Joker 槽为 5（`src/items/jokers/constants.ts`）；本项目分别为 4 和 6。上游还独立表示 Royal Flush，并支持增强牌产生的额外牌型。直接换皮会留下玩法差异。

### 计分入口与顺序

`src/scoring/scoring.ts:scoreHand` 只覆盖基础牌和增强，完整计分通过 `src/hooks/usePlayHand.ts` 调用 `src/items/jokers/scoring/composeHandScore.ts`，动画又由 `useScoringPipeline.ts` 推进。

当前代码在 `handLevel.ts:sequentialMult` 中按步骤从左到右执行加倍率与乘倍率；`docs/onboarding/scoring-pipeline.md` 仍有“先加完再乘”的过时说明。移植时以源码行为及 Jimbo 规则为准，不能直接照抄上游说明。

完整评分组合器依赖 held cards、Consumable、Voucher、Joker 状态、牌型历史和随机效果；主要 hooks 与动作文件已有数百至上千行。Jimbo 使用一次计算产出结果和事件、UI 播放事件的方式，避免复制这些耦合。

### 确定性与存档

上游部分纯函数可注入 RNG，但实际 hooks 和 actions 中仍存在直接 `Math.random()`。`src/test/rng.ts` 提供可设种子的随机函数，但现有 `src/save` 没有形成覆盖全部随机调用的可恢复方案。

`runSnapshot.ts` 能序列化 Set/Map 并校验外层版本，`restore.ts` 将恢复对象作为 `Partial<GameState>` 写回 Zustand；新项目采用明确字段、值域和牌堆一致性校验，持久化逻辑状态与随机流。

### 离线与网络

- `public/sw.js` 在激活时删除缓存、注销 Service Worker 并刷新页面，是旧离线能力的清理脚本。`src/pwa` 的存在不能作为离线可用证据。
- `src/ai/advisor/client.ts` 请求 `/api/advice`，服务端使用外部模型能力；AI 相关目录与 `api/` 全部排除。
- `src/ai/policy.ts` 通过 `fetchModelBytes` 下载模型并加载 ONNX，产生大型 WASM；MVP 无需该能力。
- `src/Telemetry.tsx` 在 Vercel 环境启用 Analytics 和 Speed Insights。新项目不引入这些组件与依赖。
- 上游字体和三个 mp3 在本地 public 目录；本地文件存在只说明打包位置，资源来源仍需独立确认。
- P3 重新实现受控的静态资源缓存；APK 使用本地资源打包。两种部署分别验证冷启动。

## 资源与许可处理

上游根目录 LICENSE 为 MIT，版权人为 Neil Matatall。移植代码时保留其完整版权与许可文本，并在第三方说明中列出被移植文件和基线 SHA。

OpenDyslexic 字体附带 OFL 文本；AI wiki 语料在上游文档中另行标注了 CC 许可。MVP 不复制这些字体、语料、品牌图标与音频，也不使用正版游戏文件。P4 的资源按具体来源逐项选用，不能只依据根目录 MIT 推断全部资源授权。

## P1 结构与交付顺序

建议布局：

```text
src/
  game/         types、config、deck、rng、hand、score、jokers、shop、reducer
  ui/           手牌、Joker 行、回合信息、商店与结算视图
  persistence/  P2 存档解析与恢复
```

1. 移植标准牌与判定，先落下规则表的 TC-001～TC-014。
2. 实现纯状态机与三轮九回合循环，补齐最后一次出牌、回合重置与无效操作场景。
3. 实现五种 Joker、经济与商店，覆盖余额、六槽上限、重复实例及结算幂等。
4. 接入最小 UI，跑通三轮九回合端到端路径，再进入手机触屏完善。

P0 无阻塞项。难度与经济数值已有实现默认值，平衡性需要 P1 可玩版本验证；完整原作内容资料属于 P4 的输入。
