import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2];
if (!["simulator", "unsigned", "archive"].includes(mode) || process.argv.length !== 3) {
  throw new Error("Usage: node scripts/build-ios.mjs simulator|unsigned|archive");
}
if (process.platform !== "darwin") throw new Error("iOS builds require macOS and Xcode 26+");
if (mode === "archive" && !process.env.IOS_TEAM_ID) {
  throw new Error("Set IOS_TEAM_ID to a Signing Team configured in Xcode");
}
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const sequence = path.join(root, ".ai-local/ios/build-number");
const previous = fs.existsSync(sequence) ? Number(fs.readFileSync(sequence, "utf8")) : 0;
const build = process.env.IOS_BUILD_NUMBER ?? String(previous + 1);
if (!/^[1-9]\d*$/.test(build) || !Number.isSafeInteger(Number(build))) throw new Error("Invalid IOS_BUILD_NUMBER");
const out = path.join(root, "dist/ios");
const work = path.join(root, ".ai-local/ios", mode);
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(work, { recursive: true });
fs.writeFileSync(sequence, String(Math.max(previous, Number(build))));

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || result.stdout || "");
    throw new Error(`${command} exited with ${result.status}`);
  }
  return result.stdout;
}
run("xcodebuild", ["-checkFirstLaunchStatus"]);
run("npm", ["run", "ios:sync"]);

const simulator = mode === "simulator";
const archive = path.join(work, "App.xcarchive");
const args = [
  "-project", "ios/App/App.xcodeproj",
  "-scheme", "App",
  "-configuration", simulator ? "Debug" : "Release",
  "-sdk", simulator ? "iphonesimulator" : "iphoneos",
  "-destination", simulator ? "generic/platform=iOS Simulator" : "generic/platform=iOS",
  "-derivedDataPath", path.join(work, "DerivedData"),
  `MARKETING_VERSION=${version}`,
];
args.push(`CURRENT_PROJECT_VERSION=${build}`);
if (process.env.IOS_BUNDLE_ID) args.push(`PRODUCT_BUNDLE_IDENTIFIER=${process.env.IOS_BUNDLE_ID}`);
if (mode === "archive") {
  args.push(`DEVELOPMENT_TEAM=${process.env.IOS_TEAM_ID}`, "-allowProvisioningUpdates");
} else {
  args.push("CODE_SIGNING_ALLOWED=NO", "CODE_SIGNING_REQUIRED=NO");
}
if (simulator) args.push("build");
else args.push("-archivePath", archive, "archive");
run("xcodebuild", args);

if (simulator) {
  const target = path.join(out, "simulator/App.app");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  run("ditto", [path.join(work, "DerivedData/Build/Products/Debug-iphonesimulator/App.app"), target]);
  console.log(`Simulator app: ${target}`);
} else {
  const app = path.join(archive, "Products/Applications/App.app");
  const platform = run("xcrun", ["vtool", "-show-build", path.join(app, "App")], true);
  const platforms = [...platform.matchAll(/^\s*platform\s+(\S+)/gm)].map((match) => match[1]);
  if (!platforms.length || platforms.some((value) => value !== "IOS")) {
    throw new Error(`Expected an iphoneos binary, received:\n${platform}`);
  }
  if (mode === "archive") {
    run("codesign", ["--verify", "--deep", "--strict", app]);
    console.log(`Signed device archive: ${archive}`);
    console.log("Export for the registered device from Xcode Organizer; verify and install the exported IPA before delivery.");
  } else {
    const staging = fs.mkdtempSync(path.join(work, "package-"));
    const name = `jimbo-${version}-ios-device-unsigned.ipa`;
    const target = path.join(out, name);
    try {
      const payload = path.join(staging, "Payload");
      fs.mkdirSync(payload);
      run("ditto", [app, path.join(payload, "App.app")]);
      run("ditto", ["-c", "-k", "--keepParent", payload, `${target}.tmp`]);
      fs.renameSync(`${target}.tmp`, target);
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
      fs.rmSync(`${target}.tmp`, { force: true });
    }
    const hash = createHash("sha256").update(fs.readFileSync(target)).digest("hex");
    const sumsPath = path.join(out, "SHA256SUMS");
    const existing = fs.existsSync(sumsPath) ? fs.readFileSync(sumsPath, "utf8").split("\n") : [];
    const entries = existing.filter((line) => line && !line.endsWith(`  ${name}`));
    fs.writeFileSync(sumsPath, [...entries, `${hash}  ${name}`, ""].join("\n"));
    const info = JSON.parse(run("plutil", ["-convert", "json", "-o", "-", path.join(app, "Info.plist")], true));
    const guide = [
      "## 安装 / Installation",
      "",
      "此 IPA 需要为目标 iPhone 签名后安装，尚未完成真机验收。",
      "This IPA requires signing for your iPhone. Physical-device validation is pending.",
      "",
      "运行 / Run `npm run ios:open`，在 Xcode 中选择 iPhone 和 Signing Team，然后运行应用。",
      "Select your iPhone and Signing Team in Xcode, then run the app.",
      "",
      "免费 Personal Team 签名有效期为 7 天；续签时保持 Bundle ID 和团队一致，覆盖安装以保留存档。",
      "Free Personal Team signing expires after 7 days. Keep the same Bundle ID and team when reinstalling; do not uninstall first.",
      "",
      "[Build and signing instructions](https://github.com/delta-xv/jimbo#build-for-ios)",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(out, "INSTALL.md"),
      `# Jimbo ${version} iOS 待签名包\n\n文件：\`${name}\`。构建平台已核对为 iOS 真机平台。此文件需要签名，尚未完成真机安装验收。\n\n` +
      `Bundle ID：\`${info.CFBundleIdentifier}\`；版本：${info.CFBundleShortVersionString}；构建号：${info.CFBundleVersion}；构建下限：iOS ${info.MinimumOSVersion}；设备范围：iPhone。\n\n` + guide);
    console.log(`Unsigned IPA: ${target}`);
  }
}
