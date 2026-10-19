# Android APK

应用包名为 `com.jimbo.game`，应用名称为 Jimbo。Android 工程使用 Capacitor 8，直接打包 `build/` 中的网页、图片与字体，无需运行开发服务器。

## 构建

需要 Node.js 22.12+、JDK 21、Android SDK Platform 36 和 Build-Tools 36.0.0。Gradle 由仓库内的 Wrapper 获取；Android Studio 可选。

```sh
npm ci
npm run apk
```

脚本会构建网页、同步 Android 资源、执行 `assembleDebug`，将可安装文件输出到 `dist/jimbo-1.0.0-debug.apk`，并生成 `dist/SHA256SUMS`。测试包使用本机 Android 调试密钥签名；正式发布需使用独立发行密钥。

脚本优先读取 `JAVA_HOME`、`ANDROID_HOME` 或 `ANDROID_SDK_ROOT`。macOS 还会查找用户目录的 JDK 21 和 `~/Library/Android/sdk`。其他安装位置应通过环境变量指定。Gradle 依赖优先使用国内镜像，下载的 Gradle 发行包使用 SHA-256 校验；构建脚本保留现有代理环境。

安装到已授权设备：

```sh
adb install -r dist/jimbo-1.0.0-debug.apk
```

## GitHub 构建与测试包

仓库的 CI 在推送 main、提交 Pull Request 或手动触发时运行测试、Web 构建和 Android 构建。成功后可在 Actions 对应运行的 Artifacts 下载包含 debug APK 与 SHA-256 校验文件的压缩包，产物保留 14 天。此工作流不会部署网站或自动发布 Release。

公开的测试包应明确标注为 debug 版本，并附带源码版本与 SHA-256。需要长期覆盖安装的测试包应始终使用同一份受维护者保管的签名密钥；不要将密钥、密码或本地 SDK 路径提交到仓库。CI 临时生成的 debug 密钥不保证与本地构建或其他运行相同，因此 CI 产物主要用于独立验证。

当前尚未提供自动签名的 release 构建。清除应用数据或卸载会删除本地进度；已有安装的签名不同时，应优先取得相同签名的更新包。

## 存档与离线

每次有效操作后自动保存本局规则、牌库、手牌、已用牌、小丑、商店、卡包选择、计分和所有随机状态。返回主菜单后可继续游戏；新开一局需确认替换现有存档。已结束的牌局不再提供继续入口。

恢复时跳过动画并保留已结算的分数与奖励，不重复扣钱或发奖。旧版商店存档会自动准备下一回合目标花色，保留本局进度和已购牌一致性。牌型出牌次数随存档保留；旧存档缺失的本回合次数显示为“—”，进入下一回合后开始统计。存档带版本号；损坏或不兼容时显示提示。存储空间不足时提示无法保存。清除应用数据或卸载会删除本地存档。

Android 返回键优先关闭弹窗；牌局中打开返回主菜单确认，主菜单中切到后台。APK 内置运行资源，安装后可离线启动。支持手机竖屏与横屏，主界面按可用高度排列状态栏、六个小丑槽、牌桌、手牌和操作区。商店和牌包使用紧凑卡片，完整说明可打开详情查看；牌库和设置等长弹窗保留内部滚动。需要现代 Android System WebView。

## 验证命令

```sh
npm test
npm run apk
cd android
./gradlew :app:assembleDebugAndroidTest
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
for method in TC122_offlineStartRestoreAndBack TC131_forcedClearIntroLongPressAndRotation TC136_compactLayoutsAndImmediateDeselection TC142_offlineAudioSettingsAndBackground TC146_touchReorderAndFullRackPack TC147_fullscreenOutcomesAndReplay TC150_tutorialPracticePersistenceAndLayouts TC156_growthGainLossAndReplayGuards; do
  adb shell am force-stop com.jimbo.game
  adb shell am instrument -w -e class "com.jimbo.game.OfflineGameTest#$method" com.jimbo.game.test/androidx.test.runner.AndroidJUnitRunner
done
```

Android 仪器测试覆盖本地资源启动、继续游戏、WebView 重建后的存档一致性、牌库详情与系统返回键，以及中英文横竖屏下的游戏、结算、商店、四张牌包和槽位满时的牌包布局；检查页面滚动、按钮边界、商品内容重叠与取消选中的即时复位。真实设备与模拟器应分别检查安全区域、触摸、前后台切换及断网冷启动。

已验证环境：Android 15 / API 35 ARM64 模拟器、Android System WebView 124.0.6367.219。飞行模式下通过冷启动、WebView 重建恢复、牌库查看、取消全选、锁定牌保留、长按拦截、横竖屏切换和返回键测试；APK 签名与 zipalign 检查通过。尚未连接真实 Android 手机。

音频回归在飞行模式下验证主题音乐实际播放、循环、设置静音与恢复、后台暂停、重建后的静音设置，以及关闭音乐时选牌音效进入 Android 音频输出。

有效横屏高度低于 300px 时，侧栏目标分与当前分并排显示；商店压缩间距，牌包效果通过详情查看。Android 模拟器覆盖 320px 宽竖屏和 640×272 有效横屏尺寸。

交互回归覆盖触屏拖动排序、取消拖动、拖后点击详情、左右按钮、顺序读档、满槽购买牌包、开包读档与卖牌领取；胜负页验证中英文界面中的固定英文标题、无分数与侧栏、动画跳过、即时模式、横竖屏布局及再来一局。

教程回归覆盖中英文横竖屏、对子练习、取消选牌、加分与补牌、跳过和系统返回、访问标记、存档与设置不变，以及从教程开始新局／继续原局。

累计动效回归覆盖同一次弃牌同时增益／减益、数值不变、连续触发、读档和排序不重播、计分高亮共存、动画结束后不重播获得动画，以及正常／快速／即时模式。
