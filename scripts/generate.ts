import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const SWOT_DIR = join(ROOT, "swot");
const DOMAINS_DIR = join(SWOT_DIR, "lib", "domains");
const OUT_DIR = join(ROOT, "data");
const OUT_TREE = join(OUT_DIR, "tree.json");

const COMPRESSION_OPTIONS = {
  compactJson: true,
  useShortKeys: true,
  deduplicateNames: true,
  generateGzip: false,
};

/**
 * Tree structure:
 * - Object value: may have child nodes
 * - Object with "__names__" (or "_n_") key: valid domain with subdomains
 * - Array value: leaf node containing school names
 * - Empty array: valid domain without school name
 * - ["__STOPLIST__"] (or ["_S_"]): domain in stoplist
 * - ["__ABUSED__"] (or ["_A_"]): domain is abused
 */
interface TreeNode {
  [key: string]: TreeNode | string[];
}

const KEYS = {
  NAMES: COMPRESSION_OPTIONS.useShortKeys ? "_n_" : "__names__",
  STOPLIST: COMPRESSION_OPTIONS.useShortKeys ? "_S_" : "__STOPLIST__",
  ABUSED: COMPRESSION_OPTIONS.useShortKeys ? "_A_" : "__ABUSED__",
};

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
    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^https?:\/\//i.test(trimmed)) continue;
      if (/^#/.test(trimmed)) continue;

      const cleanName = trimmed.replace(/^\d+\s*[:-]\s*/, "");
      if (cleanName) {
        if (cleanName.includes(",")) {
          const splitNames = cleanName
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          for (const name of splitNames) {
            if (COMPRESSION_OPTIONS.deduplicateNames) {
              if (!seen.has(name)) {
                seen.add(name);
                names.push(name);
              }
            } else {
              names.push(name);
            }
          }
        } else {
          if (COMPRESSION_OPTIONS.deduplicateNames) {
            if (!seen.has(cleanName)) {
              seen.add(cleanName);
              names.push(cleanName);
            }
          } else {
            names.push(cleanName);
          }
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

    // Reverse domain parts: harvard.edu => ["edu", "harvard"]
    const reversedParts = parts.slice().reverse();

    let current: any = root;
    for (let i = 0; i < reversedParts.length; i++) {
      const part = reversedParts[i];
      const isLast = i === reversedParts.length - 1;

      if (isLast) {
        if (
          current[part] &&
          typeof current[part] === "object" &&
          !Array.isArray(current[part])
        ) {
          current[part][KEYS.NAMES] = schoolNames.length > 0 ? schoolNames : [];
        } else {
          current[part] = schoolNames.length > 0 ? schoolNames : [];
        }
        totalDomains++;
        if (schoolNames.length > 0) totalWithNames++;
      } else {
        if (!current[part]) {
          current[part] = {};
        } else if (Array.isArray(current[part])) {
          const oldNames = current[part];
          current[part] = {
            [KEYS.NAMES]: oldNames,
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
          current[part] = [marker];
          added++;
        } else if (Array.isArray(current[part])) {
          current[part] = [marker];
          added++;
        } else if (typeof current[part] === "object") {
          current[part][KEYS.NAMES] = [marker];
          added++;
        }
      } else {
        if (!current[part]) {
          current[part] = {};
        } else if (Array.isArray(current[part])) {
          const oldNames = current[part];
          current[part] = { [KEYS.NAMES]: oldNames };
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
    const fileName = p.split("/").pop() || "";
    if (["stoplist.txt", "abused.txt", "tlds.txt"].includes(fileName)) {
      return false;
    }
    return /\.(txt|no-ext|edu)$/i.test(p);
  });

  const tree = buildTree(files);

  const stoplistPath = join(DOMAINS_DIR, "stoplist.txt");
  const abusedPath = join(DOMAINS_DIR, "abused.txt");

  const stoplist = readDomainList(stoplistPath);
  const abused = readDomainList(abusedPath);

  const stoplistAdded = addSpecialDomains(tree, stoplist, KEYS.STOPLIST);
  const abusedAdded = addSpecialDomains(tree, abused, KEYS.ABUSED);

  const jsonString = COMPRESSION_OPTIONS.compactJson
    ? JSON.stringify(tree)
    : JSON.stringify(tree, null, 2);

  writeFileSync(OUT_TREE, jsonString);
  const originalSize = Buffer.byteLength(jsonString, "utf8");
  console.log(`Tree structure saved to ${OUT_TREE}`);
  console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

  if (COMPRESSION_OPTIONS.generateGzip) {
    const gzipBuffer = gzipSync(jsonString, { level: 9 });
    const gzipPath = `${OUT_TREE}.gz`;
    writeFileSync(gzipPath, gzipBuffer);
    const gzipSize = gzipBuffer.length;
    console.log(`Gzipped version saved to ${gzipPath}`);
    console.log(`Gzipped size: ${(gzipSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `Compression ratio: ${((gzipSize / originalSize) * 100).toFixed(2)}%`
    );
  }

  console.log(
    `Added ${stoplistAdded} stoplist domains and ${abusedAdded} abused domains`
  );

  console.log("\nCompression options:");
  console.log(
    `  - Compact JSON: ${COMPRESSION_OPTIONS.compactJson ? "✓" : "✗"}`
  );
  console.log(
    `  - Short keys: ${COMPRESSION_OPTIONS.useShortKeys ? "✓" : "✗"}`
  );
  console.log(
    `  - Deduplicate names: ${COMPRESSION_OPTIONS.deduplicateNames ? "✓" : "✗"}`
  );
  console.log(
    `  - Generate gzip: ${COMPRESSION_OPTIONS.generateGzip ? "✓" : "✗"}`
  );
}

main();
