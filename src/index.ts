// 延迟加载数据，减少初始包体积
let domainSet: Set<string> | null = null;
let domainToName: Record<string, string> | null = null;

async function loadData() {
  if (domainSet && domainToName) return;

  try {
    // 兼容Node.js和浏览器环境
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    // 获取当前模块的目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 读取数据文件
    const domainsPath = path.join(__dirname, "../data/domains.json");
    const namesPath = path.join(__dirname, "../data/names.json");

    const domainsData = fs.readFileSync(domainsPath, "utf8");
    const namesData = fs.readFileSync(namesPath, "utf8");

    const domains = JSON.parse(domainsData);
    const names = JSON.parse(namesData);

    domainSet = new Set(domains.map((d: string) => d.toLowerCase()));
    domainToName = names;
  } catch (error) {
    console.warn("Failed to load swot data:", error);
    domainSet = new Set();
    domainToName = {};
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

function longestMatchingDomain(domain: string): string | null {
  if (!domainSet) return null;
  const parts = domain.toLowerCase().split(".");
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join(".");
    if (domainSet.has(candidate)) return candidate;
  }
  return null;
}

export async function verify(email: string): Promise<boolean> {
  await loadData();
  const e = normalizeEmail(email);
  if (!e) return false;
  const d = getDomain(e);
  if (!d) return false;
  return longestMatchingDomain(d) !== null;
}

export async function school_name(email: string): Promise<string | null> {
  await loadData();
  const e = normalizeEmail(email);
  if (!e) return null;
  const d = getDomain(e);
  if (!d) return null;
  const match = longestMatchingDomain(d);
  if (!match) return null;
  return domainToName?.[match] ?? null;
}
