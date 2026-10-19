import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const copies = new Map([
  ["LICENSE", "Jimbo-MIT.txt"],
  ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ...fs.readdirSync(path.join(root, "licenses"))
    .filter((name) => name.endsWith(".txt"))
    .map((name) => [`licenses/${name}`, name]),
  ...["@capacitor/core", "react", "react-dom"].map((name) => [
    `node_modules/${name}/LICENSE`,
    { "@capacitor/core": "Capacitor-MIT.txt", react: "React-MIT.txt", "react-dom": "React-DOM-MIT.txt" }[name],
  ]),
]);

for (const [source, name] of copies) {
  const input = path.join(root, source);
  const output = path.join(root, "public/licenses", name);
  const content = fs.readFileSync(input);
  if (check) {
    if (!fs.existsSync(output) || !content.equals(fs.readFileSync(output))) {
      console.error(`License copy differs: ${source} → public/licenses/${name}`);
      process.exitCode = 1;
    }
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content);
  }
}
