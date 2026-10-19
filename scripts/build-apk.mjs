import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const env = { ...process.env };
if (!env.JAVA_HOME && process.platform === "darwin") {
  const base = path.join(os.homedir(), "Library/Java/JavaVirtualMachines");
  for (const entry of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const candidate = path.join(base, entry, "Contents/Home");
    if (fs.existsSync(path.join(candidate, "bin/java")) && /21/.test(entry)) {
      env.JAVA_HOME = candidate;
      break;
    }
  }
}
env.ANDROID_HOME ??=
  env.ANDROID_SDK_ROOT ??
  path.join(
    os.homedir(),
    process.platform === "darwin" ? "Library/Android/sdk" : "Android/Sdk",
  );
function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("npm", ["run", "build"]);
run("npx", ["cap", "sync", "android"]);
const options = ["--no-daemon", "--console=plain"];
for (const protocol of ["http", "https"]) {
  const proxy =
    env[protocol.toUpperCase() + "_PROXY"] ?? env[protocol + "_proxy"];
  if (proxy) {
    const url = new URL(proxy);
    options.push(
      `-D${protocol}.proxyHost=${url.hostname}`,
      `-D${protocol}.proxyPort=${url.port || (url.protocol === "https:" ? "443" : "80")}`,
    );
  }
}
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  [...options, "assembleDebug"],
  path.join(root, "android"),
);
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
const name = `jimbo-${version}-debug.apk`;
fs.copyFileSync(
  path.join(root, "android/app/build/outputs/apk/debug/app-debug.apk"),
  path.join(out, name),
);
const sha = createHash("sha256")
  .update(fs.readFileSync(path.join(out, name)))
  .digest("hex");
fs.writeFileSync(path.join(out, "SHA256SUMS"), `${sha}  ${name}\n`);
console.log(`APK: ${path.join(out, name)}`);
