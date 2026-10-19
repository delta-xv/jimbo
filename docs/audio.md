# 音乐与音效

音频随 APK 本地打包，无需联网。音乐与音效默认开启，音乐音量 30%，音效音量 65%，两者独立控制。设置修改立即试听；保存后写入本地设置，取消或关闭恢复原值。旧版设置保留动画、CRT 与游戏参数并补充声音默认值。

首次触摸或键盘操作后启用播放。主题音乐循环；浏览器页面隐藏或 Android 应用进入后台时暂停音乐并停止音效，回到前台从原音乐位置继续，不补播后台错过的声音。播放失败不影响牌局。音效最多同时播放八个，静音会停止正在播放的声音和待解码请求。

## 事件

| 场景 | 音效文件 |
| --- | --- |
| 按钮、界面操作 | `button.wav` |
| 选牌／取消、整理牌 | `card_select.wav` / `card_deselect.wav` |
| 发牌、补牌、刷新、开包 | `card_draw.wav` |
| 出牌、小丑重新触发 | `pop.wav` |
| 弃牌 | `whoosh2_lose.wav` |
| 单牌筹码、小丑加筹码 | `chips_card.wav` |
| 总分入账 | `chips_accum.wav` |
| 加倍率、购物、回合通过 | `mult.wav` |
| 乘倍率 | `xmult.wav` |
| 九回合通关 | `game_win.wav` |
| 失败 | `negative_lose.wav` |

计分音效跟随实际计分动画步骤，小幅升调表达累加。即时动画模式省略逐步声音，避免同时叠加大量音效。

## 资源

来源：[Balatro-GBA](https://github.com/GBALATRO/balatro-gba/tree/eb4146aa2bf76a22d722170382618e65bb59046c/audio)，提交 `eb4146aa2bf76a22d722170382618e65bb59046c`。

12 个 WAV 保留上游文件。`main_theme.xm` 经 libopenmpt 渲染为 44.1kHz 双声道 PCM，再通过 FFmpeg 编码为 96kbps Ogg Opus，保存为 `theme.ogg`，时长约四分钟。转换工具仅用于离线制作，不成为应用依赖。

倍率音效源自 [poissonmort 的 Toy records#06-E3-02.wav](https://freesound.org/people/poissonmort/sounds/253249/)，采用 CC BY 4.0。其余音效的上游 README 标注作者 LocalThunk、CC0。音乐改编作者为 cellos51、MeirGavish，原曲作者为 LouisF，转谱作者为 MrCrimit；上游没有单独声明主题音乐的再分发许可。该 APK 面向个人使用。完整署名与权利说明随 APK 放入 `licenses/Balatro-GBA-audio.txt`。
