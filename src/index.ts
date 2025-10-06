/**
 * Tree structure:
 * - Object value: may have child nodes
 * - Object with "_n_" key: valid domain with subdomains
 * - Array value: leaf node containing school names
 * - ["_S_"]: domain in stoplist
 * - ["_A_"]: domain is abused
 */
interface TreeNode {
  [key: string]: TreeNode | string[];
}

const KEYS = {
  NAMES: "_n_",
  STOPLIST: "_S_",
  ABUSED: "_A_",
} as const;

export interface VerifyResult {
  valid: boolean;
  status: "valid" | "stoplist" | "abused" | "invalid";
}

let domainTree: TreeNode | null = null;

async function loadData() {
  if (domainTree) return;

  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

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

/**
 * Find longest matching domain in tree
 * Example: cs.stanford.edu => tries cs.stanford.edu, stanford.edu, edu
 */
function findInTree(domain: string): string[] | null {
  if (!domainTree) return null;

  const parts = domain.toLowerCase().split(".");

  for (let i = 0; i < parts.length; i++) {
    const candidateParts = parts.slice(i);
    // Reverse parts to match tree structure: edu -> stanford -> cs
    const reversedParts = candidateParts.slice().reverse();

    let current: any = domainTree;
    let found = true;

    for (let j = 0; j < reversedParts.length; j++) {
      const part = reversedParts[j];

      if (!current[part]) {
        found = false;
        break;
      }

      current = current[part];

      if (Array.isArray(current)) {
        if (j === reversedParts.length - 1) {
          return current;
        } else {
          found = false;
          break;
        }
      }
    }

    if (found) {
      if (Array.isArray(current)) {
        return current;
      } else if (
        current &&
        typeof current === "object" &&
        KEYS.NAMES in current
      ) {
        return current[KEYS.NAMES] as string[];
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

  const names = findInTree(d);

  if (names === null) {
    return { valid: false, status: "invalid" };
  }

  if (names.length === 1) {
    if (names[0] === KEYS.ABUSED) {
      return { valid: false, status: "abused" };
    }
    if (names[0] === KEYS.STOPLIST) {
      return { valid: false, status: "stoplist" };
    }
  }

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

  if (
    names.length === 1 &&
    (names[0] === KEYS.STOPLIST || names[0] === KEYS.ABUSED)
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
