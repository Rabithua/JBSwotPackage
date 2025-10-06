import { execSync } from "node:child_process";
import * as readline from "node:readline";

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message: string, color?: keyof typeof colors) {
  if (color && colors[color]) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

function run(cmd: string, description?: string) {
  if (description) {
    log(`\n▶ ${description}`, "blue");
  }
  try {
    execSync(cmd, { stdio: "inherit" });
    if (description) {
      log(`✓ ${description} 完成`, "green");
    }
  } catch (error) {
    log(`✗ ${description || "命令"} 失败`, "red");
    process.exit(1);
  }
}

function runSilent(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (error) {
    return "";
  }
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  log("\n========================================", "bright");
  log("  JBS-SWOT-EMAIL 发布脚本", "bright");
  log("========================================\n", "bright");

  // 检查git状态
  log("检查git状态...", "yellow");
  const gitStatus = runSilent("git status --porcelain");
  if (gitStatus) {
    log("⚠ 警告: 工作目录有未提交的更改", "yellow");
    const continueRelease = await prompt("是否继续? (y/n): ");
    if (continueRelease.toLowerCase() !== "y") {
      log("发布已取消", "red");
      process.exit(0);
    }
  }

  // 检查当前分支
  const currentBranch = runSilent("git branch --show-current");
  log(`当前分支: ${currentBranch}`, "blue");

  // 1. 同步 swot 仓库
  run("npm run sync:swot", "同步 swot 仓库");

  // 2. 生成数据
  run("npm run generate", "生成数据文件");

  // 3. 构建生产代码
  run("npm run build", "构建生产代码");

  // 4. 运行功能测试
  log("\n是否运行功能测试? (y/n): ", "yellow");
  const runFunctionalTests = await prompt("");
  if (runFunctionalTests.toLowerCase() === "y") {
    try {
      run("npm run test:example", "运行示例验证测试");
      run("npm run test:tree", "运行树结构测试");
    } catch (error) {
      log("⚠ 功能测试失败", "red");
      const continueAnyway = await prompt("是否继续发布? (y/n): ");
      if (continueAnyway.toLowerCase() !== "y") {
        log("发布已取消", "red");
        process.exit(1);
      }
    }
  }

  // 5. 选择版本号更新类型
  log("\n========================================", "bright");
  log("选择版本号更新类型:", "bright");
  log("  1) patch  - 补丁版本 (0.2.0 -> 0.2.1)", "blue");
  log("  2) minor  - 次版本 (0.2.0 -> 0.3.0)", "blue");
  log("  3) major  - 主版本 (0.2.0 -> 1.0.0)", "blue");
  log("  4) custom - 自定义版本号", "blue");
  log("========================================\n", "bright");

  const versionChoice = await prompt("请选择 (1/2/3/4): ");

  let versionType: string;
  let customVersion: string | null = null;

  switch (versionChoice) {
    case "1":
      versionType = "patch";
      break;
    case "2":
      versionType = "minor";
      break;
    case "3":
      versionType = "major";
      break;
    case "4":
      customVersion = await prompt("请输入自定义版本号 (例如: 1.0.0): ");
      versionType = customVersion;
      break;
    default:
      log("无效的选择，默认使用 patch", "yellow");
      versionType = "patch";
  }

  // 6. 更新版本号
  const versionCmd = customVersion
    ? `npm version ${customVersion} --no-git-tag-version`
    : `npm version ${versionType} --no-git-tag-version`;
  run(versionCmd, `更新版本号 (${versionType})`);

  // 获取新版本号
  const newVersion = runSilent("node -p \"require('./package.json').version\"");
  log(`\n✓ 新版本号: ${newVersion}`, "green");

  // 7. 提交更改到 git
  log("\n是否提交更改到 git? (y/n): ", "yellow");
  const commitChanges = await prompt("");
  if (commitChanges.toLowerCase() === "y") {
    run("git add .", "添加更改到暂存区");
    run(`git commit -m "chore: release v${newVersion}"`, "提交更改");
    run(`git tag v${newVersion}`, "创建 git 标签");

    log("\n是否推送到远程仓库? (y/n): ", "yellow");
    const pushChanges = await prompt("");
    if (pushChanges.toLowerCase() === "y") {
      run("git push", "推送提交");
      run("git push --tags", "推送标签");
    }
  }

  // 8. 发布到 npm
  log("\n========================================", "bright");
  log("准备发布到 npm", "bright");
  log("========================================\n", "bright");

  const confirmPublish = await prompt("确认发布到 npm? (y/n): ");
  if (confirmPublish.toLowerCase() !== "y") {
    log("发布已取消", "yellow");
    log("\n你可以稍后手动运行: npm publish", "blue");
    process.exit(0);
  }

  // 检查是否登录 npm
  const npmUser = runSilent("npm whoami");
  if (!npmUser) {
    log("⚠ 未登录 npm，请先运行: npm login", "red");
    process.exit(1);
  }
  log(`当前 npm 用户: ${npmUser}`, "blue");

  // 发布
  run("npm publish", "发布到 npm");

  // 完成
  log("\n========================================", "bright");
  log("✓ 发布完成!", "green");
  log("========================================", "bright");
  log(`版本: ${newVersion}`, "green");
  log(`包名: jbs-swot-email`, "green");
  log(`查看: https://www.npmjs.com/package/jbs-swot-email`, "blue");
  log("========================================\n", "bright");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
