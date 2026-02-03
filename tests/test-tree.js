import { verify, school_name, school_name_primary } from "../dist/index.js";

// 测试数据
const testEmails = [
    "student@harvard.edu",
    "user@mit.edu",
    "test@stanford.edu",
    "alumni@berkeley.edu",
    "student@ox.ac.uk",
    "user@cam.ac.uk",
    "test@imperial.ac.uk",
    "alumni@ucl.ac.uk",
    "student@tsinghua.edu.cn",
    "user@pku.edu.cn",
    "user@abused",
    "user@stoplist",
];

console.log("=== 测试新的树状结构 ===\n");

for (const email of testEmails) {
    const result = await verify(email);
    const names = await school_name(email);
    const primaryName = await school_name_primary(email);

    console.log(`邮箱: ${email}`);
    console.log(`  有效: ${result.valid}`);
    console.log(`  状态: ${result.status}`);
    console.log(`  学校名称: ${names ? names.join(", ") : "无"}`);
    console.log(`  主要名称: ${primaryName || "无"}`);
    console.log("");
}

