# jbs-swot-email

Verify student emails and get school names using swot domain data. Supports multi-campus schools and aliases.

## Installation

```bash
npm install jbs-swot-email
```

## Usage

```javascript
import { verify, school_name, school_name_primary } from "jbs-swot-email";

// Verify email (async)
const isValid = await verify("student@mit.edu"); // true

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

// Get primary school name (async) - backward compatible
const primaryName = await school_name_primary("student@utoronto.ca");
// Returns: "University of St. Michael's College"

// Single school example
const mitNames = await school_name("student@mit.edu");
// Returns: ["Massachusetts Institute of Technology"]
```

## API

- `verify(email: string): Promise<boolean>` - Verify if email belongs to an educational institution
- `school_name(email: string): Promise<string[] | null>` - Get all school names (supports multi-campus and aliases)
- `school_name_primary(email: string): Promise<string | null>` - Get primary school name (backward compatible)

## Features

- ✅ Support for multi-campus schools (e.g., University of Toronto's various campuses)
- ✅ Support for school aliases (e.g., ETH Zürich and Swiss Federal Institute of Technology)
- ✅ Backward compatible API design
- ✅ Based on authoritative swot domain database
- ✅ Supports 25,000+ educational institution domains
