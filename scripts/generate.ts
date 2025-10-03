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
const OUT_DOMAINS = join(OUT_DIR, "domains.json");
const OUT_NAMES = join(OUT_DIR, "names.json");

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
        names.push(cleanName);
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

function main() {
  ensureDir(OUT_DIR);
  const files = listFilesRecursive(DOMAINS_DIR).filter((p) =>
    /\.(txt|no-ext|edu)$/i.test(p)
  );
  const domainSet = new Set<string>();
  const names: Record<string, string[]> = {};
  for (const file of files) {
    const domain = toDomainFromPath(file);
    if (!domain) continue;
    domainSet.add(domain.toLowerCase());
    const schoolNames = extractNames(file);
    if (schoolNames.length > 0) {
      names[domain.toLowerCase()] = schoolNames;
    }
  }
  writeFileSync(OUT_DOMAINS, JSON.stringify(Array.from(domainSet), null, 0));
  writeFileSync(OUT_NAMES, JSON.stringify(names, null, 0));
  console.log(
    `Generated ${domainSet.size} domains, ${Object.keys(names).length} names.`
  );
}

main();
