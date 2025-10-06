import { verify, school_name, school_name_primary } from "../dist/index.js";

async function testVerify() {
    console.log("=== 测试 verify 函数（返回详细状态）===\n");

    // 测试正常的学校邮箱
    const validEmail = "student@stanford.edu";
    const validResult = await verify(validEmail);
    console.log(`${validEmail}:`);
    console.log(`  valid: ${validResult.valid}`);
    console.log(`  status: ${validResult.status}\n`);

    // 测试 stoplist 中的邮箱
    const stoplistEmail = "student@alumni.stanford.edu";
    const stoplistResult = await verify(stoplistEmail);
    console.log(`${stoplistEmail}:`);
    console.log(`  valid: ${stoplistResult.valid}`);
    console.log(`  status: ${stoplistResult.status}\n`);

    // 测试 abused 中的邮箱
    const abusedEmail = "student@gmail.com";
    const abusedResult = await verify(abusedEmail);
    console.log(`${abusedEmail}:`);
    console.log(`  valid: ${abusedResult.valid}`);
    console.log(`  status: ${abusedResult.status}\n`);

    // 测试无效的邮箱
    const invalidEmail = "student@notaschool.com";
    const invalidResult = await verify(invalidEmail);
    console.log(`${invalidEmail}:`);
    console.log(`  valid: ${invalidResult.valid}`);
    console.log(`  status: ${invalidResult.status}\n`);

    // 测试学校名称查询
    console.log("=== 测试 school_name 函数 ===\n");

    const names = await school_name(validEmail);
    console.log(`${validEmail} 的学校名称:`);
    console.log(`  ${names}\n`);

    const stoplistNames = await school_name(stoplistEmail);
    console.log(`${stoplistEmail} 的学校名称（stoplist）:`);
    console.log(`  ${stoplistNames}\n`);

    // 测试主要学校名称
    const primaryName = await school_name_primary(validEmail);
    console.log(`${validEmail} 的主要学校名称:`);
    console.log(`  ${primaryName}`);
}

testVerify();

