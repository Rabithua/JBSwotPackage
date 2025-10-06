// @deprecated 新的json数据结构对于当前脚本已不适用
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { performance } from "perf_hooks";


// 测试数据
const testEmails = [
    "student@harvard.edu",
    "user@mit.edu",
    "test@stanford.edu",
    "alumni@berkeley.edu",
    "student@oxford.ac.uk",
    "user@cambridge.ac.uk",
    "test@imperial.ac.uk",
    "alumni@ucl.ac.uk",
    "student@tsinghua.edu.cn",
    "user@pku.edu.cn",
];

// 运行测试
console.log("开始性能测试...\n");

// 使用 testEmails 的完整流程基准：每次都从读取->解析/构建->对 testEmails 全量查询
function benchFullFlowMulti({ name, setup, query }, iterations = 100) {
    console.log(`\n=== 完整流程基准(批量): ${name} ===`);
    const startAll = performance.now();
    let totalMatches = 0;
    let firstBuildMs = 0;
    let firstQueryMs = 0;
    for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        const ctx = setup();
        const t1 = performance.now();
        let roundMatches = 0;
        const q0 = performance.now();
        for (const email of testEmails) {
            if (query(ctx, email)) roundMatches++;
        }
        const q1 = performance.now();
        totalMatches += roundMatches;
        if (i === 0) {
            firstBuildMs = t1 - t0;
            firstQueryMs = q1 - q0;
            console.log(
                `首轮: 构建 ${firstBuildMs.toFixed(2)}ms, 查询(×${testEmails.length}) ${firstQueryMs.toFixed(2)}ms, 命中 ${roundMatches}`
            );
        }
    }
    const endAll = performance.now();
    console.log(`循环次数: ${iterations}`);
    console.log(`总耗时: ${(endAll - startAll).toFixed(2)}ms`);
    console.log(`平均每轮: ${((endAll - startAll) / iterations).toFixed(2)}ms`);
    console.log(`总成功查询次数: ${totalMatches}/${iterations * testEmails.length}`);
}

// 1) JSON方式完整流程（批量）
benchFullFlowMulti(
    {
        name: "JSON存储方式",
        setup: () => {
            const domainsData = readFileSync("../data/domains.json", "utf8");
            const namesData = readFileSync("../data/names.json", "utf8");
            const domains = JSON.parse(domainsData);
            const names = JSON.parse(namesData);
            const domainSet = new Set(domains.map((d) => d.toLowerCase()));
            return { domainSet };
        },
        query: ({ domainSet }, email) => {
            const domain = email.split("@")[1];
            const parts = domain.toLowerCase().split(".");
            for (let j = 0; j < parts.length; j++) {
                const candidate = parts.slice(j).join(".");
                if (domainSet.has(candidate)) return true;
            }
            return false;
        },
    },
    100
);

// 2) 文件树原始遍历方式完整流程（批量）
benchFullFlowMulti(
    {
        name: "文件树-原始遍历",
        setup: () => {
            function readAllFiles(dir) {
                const files = [];
                const entries = readdirSync(dir);
                for (const entry of entries) {
                    const fullPath = join(dir, entry);
                    const stat = statSync(fullPath);
                    if (stat.isDirectory()) files.push(...readAllFiles(fullPath));
                    else if (entry.endsWith(".txt")) files.push(fullPath);
                }
                return files;
            }
            const files = readAllFiles("../swot/lib/domains");
            const domainSet = new Set();
            for (const file of files) {
                try {
                    const normalizedPath = file.replace(/\\/g, "/");
                    const rootMarker = "swot/lib/domains/";
                    const cutIndex = normalizedPath.indexOf(rootMarker);
                    const relativePath =
                        cutIndex >= 0
                            ? normalizedPath.slice(cutIndex + rootMarker.length)
                            : normalizedPath;
                    const parts = relativePath.split("/");
                    const fileName = parts[parts.length - 1].replace(".txt", "");
                    parts[parts.length - 1] = fileName;
                    const domain = parts.reverse().join(".");
                    domainSet.add(domain.toLowerCase());
                } catch { }
            }
            return { domainSet };
        },
        query: ({ domainSet }, email) => {
            const domain = email.split("@")[1];
            const parts = domain.toLowerCase().split(".");
            for (let j = 0; j < parts.length; j++) {
                const candidate = parts.slice(j).join(".");
                if (domainSet.has(candidate)) return true;
            }
            return false;
        },
    },
    100
);

// 3) 文件树-按路径直查（不构建内存结构，批量）
benchFullFlowMulti(
    {
        name: "文件树-按路径直查",
        setup: () => {
            // 无需预构建，返回根目录常量
            return { root: "../swot/lib/domains" };
        },
        query: ({ root }, email) => {
            const domain = email.split("@")[1].toLowerCase();
            const parts = domain.split(".");
            // 从最长匹配开始，依次尝试: a.b.c -> a.b.c, b.c, c
            for (let i = 0; i < parts.length; i++) {
                const candidateParts = parts.slice(i); // [a,b,c]=>[a,b,c],[b,c],[c]
                const filePath = join(
                    root,
                    ...candidateParts.slice(1).reverse(), // 先放除第一个外的部分（反转以匹配目录层级）
                    `${candidateParts[0]}.txt` // 文件名是最左边的部分
                );
                // 例如 domain=harvard.edu => join(root, 'edu', 'harvard.txt')
                // domain=strath.ac.uk => join(root, 'uk','ac','strath.txt')
                if (existsSync(filePath)) {
                    // 进一步可读取校名验证，但这里返回存在即可
                    return true;
                }
            }
            return false;
        },
    },
    100
);

