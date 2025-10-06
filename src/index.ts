// 扁平树状结构：
// - 如果值是对象，可能有子节点
// - 如果对象中有 "__names__" 键，表示该节点本身也是有效域名
// - 如果值是数组，表示这是叶子节点，数组内容是学校名称
// - ["__STOPLIST__"] 表示该域名在 stoplist 中
// - ["__ABUSED__"] 表示该域名在 abused 中
interface TreeNode {
  [key: string]: TreeNode | string[];
}

// 验证结果类型
export interface VerifyResult {
  valid: boolean;
  status: "valid" | "stoplist" | "abused" | "invalid";
}

// 延迟加载数据，减少初始包体积
let domainTree: TreeNode | null = null;

async function loadData() {
  if (domainTree) return;

  try {
    // 兼容Node.js和浏览器环境
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    // 获取当前模块的目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 读取树状数据文件
    const treePath = path.join(__dirname, "../data/tree.json");
    const treeData = fs.readFileSync(treePath, "utf8");

    domainTree = JSON.parse(treeData);
  } catch (error) {
    console.warn("Failed to load swot data:", error);
    domainTree = {};
  }
}

function normalizeEmail(input: string): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email;
}

function getDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1);
}

// 在树中查找最长匹配的域名，返回学校名称数组或特殊标记
function findInTree(domain: string): string[] | null {
  if (!domainTree) return null;

  const parts = domain.toLowerCase().split(".");

  // 尝试从最长匹配开始查找
  // 例如：cs.stanford.edu => 尝试 cs.stanford.edu, stanford.edu, edu
  for (let i = 0; i < parts.length; i++) {
    const candidateParts = parts.slice(i);
    // 反转部分以匹配树结构：edu -> stanford -> cs
    const reversedParts = candidateParts.slice().reverse();

    let current: any = domainTree;

    // 逐级在树中查找
    let found = true;
    for (let j = 0; j < reversedParts.length; j++) {
      const part = reversedParts[j];

      if (!current[part]) {
        found = false;
        break;
      }

      current = current[part];

      // 如果当前值是数组，说明找到了叶子节点（完整域名）
      if (Array.isArray(current)) {
        // 确保这是最后一部分
        if (j === reversedParts.length - 1) {
          return current; // 返回学校名称数组
        } else {
          found = false;
          break;
        }
      }
    }

    // 如果遍历完所有部分后，检查结果
    if (found) {
      if (Array.isArray(current)) {
        // 叶子节点（数组）
        return current;
      } else if (
        current &&
        typeof current === "object" &&
        "__names__" in current
      ) {
        // 对象且有 __names__ 键（有子域名但本身也是有效域名）
        return current["__names__"] as string[];
      }
    }
  }

  return null;
}

export async function verify(email: string): Promise<VerifyResult> {
  await loadData();
  const e = normalizeEmail(email);
  if (!e) return { valid: false, status: "invalid" };

  const d = getDomain(e);
  if (!d) return { valid: false, status: "invalid" };

  // 检查是否在树中
  const names = findInTree(d);

  if (names === null) {
    return { valid: false, status: "invalid" };
  }

  // 检查特殊标记
  if (names.length === 1) {
    if (names[0] === "__ABUSED__") {
      return { valid: false, status: "abused" };
    }
    if (names[0] === "__STOPLIST__") {
      return { valid: false, status: "stoplist" };
    }
  }

  // 正常的学校域名
  return { valid: true, status: "valid" };
}

export async function school_name(email: string): Promise<string[] | null> {
  await loadData();
  const e = normalizeEmail(email);
  if (!e) return null;
  const d = getDomain(e);
  if (!d) return null;
  const names = findInTree(d);
  if (!names) return null;

  // 如果是特殊标记，返回 null
  if (
    names.length === 1 &&
    (names[0] === "__STOPLIST__" || names[0] === "__ABUSED__")
  ) {
    return null;
  }

  return names.length > 0 ? names : null;
}

export async function school_name_primary(
  email: string
): Promise<string | null> {
  const names = await school_name(email);
  return names?.[0] ?? null;
}
