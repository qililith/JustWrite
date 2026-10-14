// 一条命令发布：升版本 → 部署网页 → 打包并签名桌面安装包 → 上传更新源 → 推送 → GitHub Release
// 用法：npm run release            （patch：0.1.0 → 0.1.1）
//       npm run release -- minor   （0.1.x → 0.2.0）
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bump = process.argv[2] ?? "patch";
const UPDATES_PROJECT = "justwrite-updates";
const UPDATES_URL = `https://${UPDATES_PROJECT}.pages.dev`;
const keyPath =
  process.env.TAURI_SIGNING_PRIVATE_KEY ??
  [join(homedir(), ".tauri", "justwrite.key"), join(homedir(), ".tauri", "changwen.key")].find((path) =>
    existsSync(path),
  ) ??
  join(homedir(), ".tauri", "justwrite.key");

function fail(message) {
  console.error(`\n发布中止：${message}`);
  process.exit(1);
}

function run(cmd, env = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

function out(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

if (!["patch", "minor", "major"].includes(bump)) fail(`版本类型只能是 patch / minor / major，收到 ${bump}`);
if (out("git status --porcelain")) fail("工作区有未提交的改动，先提交再发布");
if (out("git rev-parse --abbrev-ref HEAD") !== "main") fail("只在 main 分支发布");
if (!existsSync(keyPath)) fail(`找不到更新签名私钥 ${keyPath}`);

let since = "";
try {
  since = out("git describe --tags --abbrev=0");
} catch {
  // 第一次发布，没有标签
}
const notes =
  out(`git log ${since ? `${since}..HEAD` : "-n 20"} --no-merges "--pretty=format:- %s"`) || "- 细节改进";

run(`npm version ${bump} -m "发布 v%s"`);
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

run("npm run deploy");

run("npx tauri build", {
  TAURI_SIGNING_PRIVATE_KEY: keyPath,
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "",
});

const targetDir = process.env.CARGO_TARGET_DIR ?? join(root, "src-tauri", "target");
const nsisDir = join(targetDir, "release", "bundle", "nsis");
const setup = readdirSync(nsisDir).find((name) => name.endsWith(`_${version}_x64-setup.exe`));
if (!setup || !existsSync(join(nsisDir, `${setup}.sig`))) fail(`在 ${nsisDir} 找不到 ${version} 的安装包或签名`);
const signature = readFileSync(join(nsisDir, `${setup}.sig`), "utf8").trim();

const releaseDir = join(root, "release");
const staging = join(releaseDir, "updates");
const fileName = `justwrite_${version}_x64-setup.exe`;
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
copyFileSync(join(nsisDir, setup), join(staging, fileName));
copyFileSync(join(nsisDir, setup), join(releaseDir, setup));
writeFileSync(
  join(staging, "latest.json"),
  `${JSON.stringify(
    {
      version,
      notes,
      pub_date: new Date().toISOString(),
      platforms: { "windows-x86_64": { signature, url: `${UPDATES_URL}/${fileName}` } },
    },
    null,
    2,
  )}\n`,
);
writeFileSync(join(staging, "_headers"), "/latest.json\n  Cache-Control: no-cache\n");
run(
  `npx --yes wrangler@4 pages deploy "${staging}" --project-name ${UPDATES_PROJECT} --branch main --commit-dirty=true`,
);

run("git push --follow-tags");

const notesFile = join(staging, "notes.md");
writeFileSync(notesFile, `${notes}\n`);
try {
  run(
    `gh release create v${version} "${join(staging, fileName)}" --title "写文章 v${version}" --notes-file "${notesFile}"`,
  );
} catch {
  console.warn("\nGitHub Release 创建失败（检查 gh 是否已登录）；更新源与网页已发布，不影响自动更新。");
}
rmSync(notesFile, { force: true });

console.log(`\n已发布 v${version}`);
console.log(`- 网页：https://justwrite-cr0.pages.dev`);
console.log(`- 更新源：${UPDATES_URL}/latest.json`);
console.log(`- 安装包：${join(releaseDir, setup)}`);
