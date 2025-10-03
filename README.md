# jbs-swot-email

验证学生邮箱并返回学校名称，基于 swot 域名数据。

## 安装

```bash
npm install jbs-swot-email
```

## 使用

```javascript
import { verify, school_name } from "jbs-swot-email";

// 验证邮箱（异步）
const isValid = await verify("student@mit.edu"); // true

// 获取学校名称（异步）
const schoolName = await school_name("student@mit.edu"); // "Massachusetts Institute of Technology"
```

## API

- `verify(email: string): Promise<boolean>` - 验证邮箱是否为教育机构邮箱
- `school_name(email: string): Promise<string | null>` - 获取学校名称
