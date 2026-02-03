import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Always clone/update into the current package directory's "swot" subfolder
const TARGET_DIR = join(process.cwd(), "swot");
const REPO = process.env.SWOT_REPO || "https://github.com/JetBrains/swot.git";

function run(cmd: string, cwd?: string, stdio: any = "inherit") {
  execSync(cmd, { stdio, cwd });
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  if (!existsSync(TARGET_DIR)) {
    console.log(`Cloning swot into ${TARGET_DIR} ...`);
    run(`git clone --depth 1 ${REPO} ${TARGET_DIR}`);
  } else {
    console.log(`Updating swot in ${TARGET_DIR} ...`);
    run(`git fetch --all --prune`, TARGET_DIR);
    // Prefer origin/main, fallback to origin/master
    try {
      run(`git checkout main`, TARGET_DIR, "ignore");
      run(`git reset --hard origin/main`, TARGET_DIR, "ignore");
    } catch {
      try {
        run(`git checkout master`, TARGET_DIR);
        run(`git reset --hard origin/master`, TARGET_DIR);
      } catch {
        console.warn(
          "Could not switch to main or master; staying on current branch",
        );
        run(`git pull --rebase`, TARGET_DIR);
      }
    }
  }
  console.log("swot sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
