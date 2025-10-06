# 测试文件说明

本目录包含项目的测试和示例文件。

## 文件列表

### `example-verify.js`

演示新的 `verify()` API，展示如何检测 stoplist、abused 和 invalid 域名。

**运行方式：**

```bash
npm run test:example
```

**功能：**

- 测试正常的学校邮箱（返回 `valid`）
- 测试 stoplist 域名（返回 `stoplist`）
- 测试 abused 域名（返回 `abused`）
- 测试无效域名（返回 `invalid`）
- 演示 `school_name()` 和 `school_name_primary()` 函数

### `test-tree.js`

测试树状数据结构的基本功能。

**运行方式：**

```bash
npm run test:tree
```

**功能：**

- 测试多个教育机构邮箱
- 验证 `verify()`、`school_name()` 和 `school_name_primary()` 功能
- 展示新的返回格式（包含 `valid` 和 `status` 字段）

### `performance-test.js`

性能基准测试，比较不同数据存储方式的性能。

**运行方式：**

```bash
npm run test:performance
```

**功能：**

- 对比 JSON 存储方式
- 对比文件树原始遍历方式
- 对比文件树按路径直查方式
- 统计构建时间、查询时间和命中率

## 前置条件

运行这些测试前，需要先构建项目：

```bash
npm run build
```

或者运行完整的准备流程（同步数据、生成树结构、构建）：

```bash
npm run prepare
```
