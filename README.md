# jbs-swot-email

验证学生邮箱并返回学校名称，基于 swot 域名数据。支持多校区学校和别名。

## 安装

```bash
npm install jbs-swot-email
```

## 使用

```javascript
import { verify, school_name, school_name_primary } from "jbs-swot-email";

// 验证邮箱（异步）
const isValid = await verify("student@mit.edu"); // true

// 获取所有学校名称（异步）- 支持多校区和别名
const schoolNames = await school_name("student@utoronto.ca");
// 返回: [
//   "University of St. Michael's College",
//   "University of Toronto",
//   "University of Toronto, Mississauga",
//   "University of Toronto, Scarborough",
//   "University of Trinity College",
//   "Victoria University Toronto, University of Toronto"
// ]

// 获取主要学校名称（异步）- 向后兼容
const primaryName = await school_name_primary("student@utoronto.ca");
// 返回: "University of St. Michael's College"

// 单一学校示例
const mitNames = await school_name("student@mit.edu");
// 返回: ["Massachusetts Institute of Technology"]
```

## API

- `verify(email: string): Promise<boolean>` - 验证邮箱是否为教育机构邮箱
- `school_name(email: string): Promise<string[] | null>` - 获取所有学校名称（支持多校区和别名）
- `school_name_primary(email: string): Promise<string | null>` - 获取主要学校名称（向后兼容）
