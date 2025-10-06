# jbs-swot-email

Verify student emails and get school names using swot domain data. Supports multi-campus schools and aliases.

## Installation

```bash
npm install jbs-swot-email
```

## Usage

```javascript
import { verify, school_name, school_name_primary } from "jbs-swot-email";

// Verify email (async) - returns detailed status
const result = await verify("student@mit.edu");
// Returns: { valid: true, status: "valid" }

// Check for stoplist or abused domains
const stoplistResult = await verify("student@alumni.stanford.edu");
// Returns: { valid: false, status: "stoplist" }

const abusedResult = await verify("student@gmail.com");
// Returns: { valid: false, status: "abused" }

const invalidResult = await verify("student@notaschool.com");
// Returns: { valid: false, status: "invalid" }

// Get all school names (async) - supports multi-campus and aliases
const schoolNames = await school_name("student@utoronto.ca");
// Returns: [
//   "University of St. Michael's College",
//   "University of Toronto",
//   "University of Toronto, Mississauga",
//   "University of Toronto, Scarborough",
//   "University of Trinity College",
//   "Victoria University Toronto, University of Toronto"
// ]

// Get primary school name (async)
const primaryName = await school_name_primary("student@utoronto.ca");
// Returns: "University of St. Michael's College"

// Single school example
const mitNames = await school_name("student@mit.edu");
// Returns: ["Massachusetts Institute of Technology"]
```

## API

### `verify(email: string): Promise<VerifyResult>`

Verify if email belongs to an educational institution and get detailed status.

**Returns:**

```typescript
interface VerifyResult {
  valid: boolean;
  status: "valid" | "stoplist" | "abused" | "invalid";
}
```

- `valid: true, status: "valid"` - Valid educational email
- `valid: false, status: "stoplist"` - Domain is in stoplist (e.g., alumni emails)
- `valid: false, status: "abused"` - Domain has been abused for fake signups
- `valid: false, status: "invalid"` - Not an educational domain

### `school_name(email: string): Promise<string[] | null>`

Get all school names for the email domain. Supports multi-campus schools and aliases.

**Returns:** Array of school names or `null` if domain is stoplist/abused/invalid

### `school_name_primary(email: string): Promise<string | null>`

Get the primary (first) school name for the email domain.

**Returns:** Primary school name or `null` if domain is stoplist/abused/invalid

## Features

- ✅ Support for multi-campus schools (e.g., University of Toronto's various campuses)
- ✅ Support for school aliases (e.g., ETH Zürich and Swiss Federal Institute of Technology)
- ✅ Detects stoplist domains (alumni emails, etc.)
- ✅ Detects abused domains (known fake signup domains)
- ✅ Detailed verification status for better error handling
- ✅ Based on authoritative swot domain database
- ✅ Supports 25,000+ educational institution domains

## Data Source

This package uses domain data from the [JetBrains swot](https://github.com/JetBrains/swot) repository, which is an official JetBrains project used to verify educational email addresses for granting free licenses to students and teachers worldwide.

The swot repository contains a hierarchically structured list of email domains belonging to educational institutions, including colleges, universities, and groups of schools.

## Development

### Scripts

- `npm run sync:swot` - Sync JetBrains swot repository
- `npm run generate` - Generate tree data structure
- `npm run build` - Build production code
- `npm run test` - Run unit tests
- `npm run release` - 🚀 One-click release (sync, build, test, version, publish)

### Release Process

Use the automated release script:

```bash
npm run release
```

The release script will automatically:

1. ✅ Pull latest swot data
2. ✅ Generate data files
3. ✅ Build production code
4. ✅ Run test suite
5. ✅ Update version number
6. ✅ Git commit and tag
7. ✅ Publish to npm

See [scripts/README.md](scripts/README.md) for detailed documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Data License

The educational domain data used in this package is from the [JetBrains swot repository](https://github.com/JetBrains/swot), which is licensed under the MIT License:

```
The MIT License (MIT)
Copyright (c) 2013 Lee Reilly
```

## Acknowledgments

- Thanks to [JetBrains](https://www.jetbrains.com/) and [Lee Reilly](https://github.com/leereilly) for maintaining the [swot](https://github.com/JetBrains/swot) repository
- All contributors to the swot repository for keeping the educational domain data up-to-date
