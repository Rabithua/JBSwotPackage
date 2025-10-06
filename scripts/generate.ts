import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
// Read from local swot clone under the package directory
const SWOT_DIR = join(ROOT, "swot");
const DOMAINS_DIR = join(SWOT_DIR, "lib", "domains");
const OUT_DIR = join(ROOT, "data");
const OUT_TREE = join(OUT_DIR, "tree.json");

// 扁平树状结构：
// - 如果值是对象，可能表示有子节点
// - 如果对象中有 "__names__" 键，表示该节点本身也是有效域名，值为学校名称数组
// - 如果值是数组，表示这是叶子节点，数组内容是学校名称
// - 空数组表示有效域名但无学校名称
// - ["__STOPLIST__"] 表示该域名在 stoplist 中
// - ["__ABUSED__"] 表示该域名在 abused 中
interface TreeNode {
  [key: string]: TreeNode | string[];
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
}

function toDomainFromPath(filePath: string): string | null {
  // Expect under DOMAINS_DIR; map path segments to reversed domain labels
  const rel = relative(DOMAINS_DIR, filePath);
  if (!rel || rel.startsWith("..")) return null;
  const parts = rel.split("/");
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const name = last.replace(/\.(txt|no-ext|edu)$/i, "");
  parts[parts.length - 1] = name;
  const labels = parts.filter(Boolean).reverse();
  return labels.join(".");
}

function extractNames(filePath: string): string[] {
  try {
    const raw = readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const names: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^https?:\/\//i.test(trimmed)) continue;
      if (/^#/.test(trimmed)) continue;

      const cleanName = trimmed.replace(/^\d+\s*[:-]\s*/, "");
      if (cleanName) {
        // 如果名称中包含逗号，按逗号拆分为多个学校名称
        if (cleanName.includes(",")) {
          const splitNames = cleanName
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          names.push(...splitNames);
        } else {
          names.push(cleanName);
        }
      }
    }
    return names;
  } catch {
    return [];
  }
}

function ensureDir(dir: string) {
  try {
    statSync(dir);
  } catch {
    mkdirSync(dir, { recursive: true });
  }
}

function buildTree(files: string[]): TreeNode {
  const root: TreeNode = {};
  let totalDomains = 0;
  let totalWithNames = 0;

  for (const file of files) {
    const domain = toDomainFromPath(file);
    if (!domain) continue;

    const parts = domain.toLowerCase().split(".");
    const schoolNames = extractNames(file);

    // 从根节点开始，按域名部分逐级构建树
    // 例如：harvard.edu => ["edu", "harvard"] (反转，顶级域名在前)
    const reversedParts = parts.slice().reverse();

    let current: any = root;
    for (let i = 0; i < reversedParts.length; i++) {
      const part = reversedParts[i];
      const isLast = i === reversedParts.length - 1;

      if (isLast) {
        // 如果当前位置已经是对象（说明有子域名），使用 __names__ 键
        if (
          current[part] &&
          typeof current[part] === "object" &&
          !Array.isArray(current[part])
        ) {
          current[part]["__names__"] =
            schoolNames.length > 0 ? schoolNames : [];
        } else {
          // 否则直接存储为数组（叶子节点）
          current[part] = schoolNames.length > 0 ? schoolNames : [];
        }
        totalDomains++;
        if (schoolNames.length > 0) totalWithNames++;
      } else {
        // 中间节点：如果不存在则创建对象
        if (!current[part]) {
          current[part] = {};
        } else if (Array.isArray(current[part])) {
          // 如果当前是数组（之前是叶子节点），需要转换为对象
          // 将原来的学校名称存到 __names__ 中
          const oldNames = current[part];
          current[part] = {
            __names__: oldNames,
          };
        }
        current = current[part];
      }
    }
  }

  console.log(
    `Generated tree with ${totalDomains} domains, ${totalWithNames} with names.`
  );
  return root;
}

function readDomainList(filePath: string): string[] {
  try {
    const raw = readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    return lines
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function addSpecialDomains(tree: TreeNode, domains: string[], marker: string) {
  let added = 0;
  for (const domain of domains) {
    const parts = domain.toLowerCase().split(".");
    const reversedParts = parts.slice().reverse();

    let current: any = tree;
    for (let i = 0; i < reversedParts.length; i++) {
      const part = reversedParts[i];
      const isLast = i === reversedParts.length - 1;

      if (isLast) {
        if (!current[part]) {
          // 不存在，直接添加
          current[part] = [marker];
          added++;
        } else if (Array.isArray(current[part])) {
          // 是数组，替换为特殊标记
          current[part] = [marker];
          added++;
        } else if (typeof current[part] === "object") {
          // 是对象（有子域名），使用 __names__ 键
          current[part]["__names__"] = [marker];
          added++;
        }
      } else {
        // 中间节点
        if (!current[part]) {
          current[part] = {};
        } else if (Array.isArray(current[part])) {
          // 转换为对象，保留原名称
          const oldNames = current[part];
          current[part] = { __names__: oldNames };
        }
        current = current[part];
      }
    }
  }
  return added;
}

function main() {
  ensureDir(OUT_DIR);
  const files = listFilesRecursive(DOMAINS_DIR).filter((p) => {
    // 过滤特殊文件：stoplist.txt, abused.txt, tlds.txt
    const fileName = p.split("/").pop() || "";
    if (["stoplist.txt", "abused.txt", "tlds.txt"].includes(fileName)) {
      return false;
    }
    return /\.(txt|no-ext|edu)$/i.test(p);
  });

  const tree = buildTree(files);

  // 读取 stoplist 和 abused 列表并添加到树中
  const stoplistPath = join(DOMAINS_DIR, "stoplist.txt");
  const abusedPath = join(DOMAINS_DIR, "abused.txt");

  const stoplist = readDomainList(stoplistPath);
  const abused = readDomainList(abusedPath);

  const stoplistAdded = addSpecialDomains(tree, stoplist, "__STOPLIST__");
  const abusedAdded = addSpecialDomains(tree, abused, "__ABUSED__");

  writeFileSync(OUT_TREE, JSON.stringify(tree, null, 2));
  console.log(`Tree structure saved to ${OUT_TREE}`);
  console.log(
    `Added ${stoplistAdded} stoplist domains and ${abusedAdded} abused domains`
  );
}

main();
