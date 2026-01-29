# Agent Development Guide for Ralph-CLI

This guide contains essential information for AI coding agents working in the ralph-cli codebase.

## Quick Reference

**Runtime:** Bun  
**Language:** TypeScript (ESM modules, strict mode)  
**Test Framework:** Vitest  
**Code Style:** Prettier (no semicolons, single quotes, 80 char width)

## Build, Lint, and Test Commands

### Testing

```bash
# Run all tests
npm test
# or
bunx vitest

# Watch mode (re-run on file changes)
npm run test:watch
bunx vitest --watch

# Run a single test file
bunx vitest tools/lib/__tests__/find-next.test.ts

# Run specific test case (use .only() in test file)
it.only('should test this specific case', async () => {
  // Test code
})

# UI mode for debugging
bunx vitest --ui
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

### No Build Step

This project has no build step - TypeScript runs directly via Bun's native TypeScript support.

## Project Structure

```
ralph-cli/
├── tools/              # Core TypeScript implementation
│   ├── ralph.ts        # Main tool exports (@opencode-ai/plugin)
│   └── lib/            # Modular implementation
│       ├── types.ts            # TypeScript type definitions
│       ├── prd-utils.ts        # Shared PRD file utilities
│       ├── find-next.ts        # Find next story logic
│       ├── get-details.ts      # Get story details
│       ├── record-failure.ts   # Record failed attempts
│       ├── mark-complete.ts    # Mark stories complete
│       └── __tests__/          # Vitest test files
├── agents/             # Agent instruction files (.md)
├── commands/           # Command documentation (.md)
└── progress/           # Auto-created success/failure logs
```

**Key Principles:**

- Pure TypeScript - no bash dependencies
- Modular design - one responsibility per file
- Atomic file writes - temp file + rename pattern for safety
- Comprehensive test coverage with isolated test environments

## Code Style Guidelines

### Import Patterns

**Order:**

1. Third-party imports (Node.js core modules)
2. Project imports (@opencode-ai/plugin)
3. Relative imports - named functions
4. Type imports (always with `type` keyword)

**Example:**

```typescript
// Third-party
import { promises as fs } from 'fs'
import path from 'path'

// Project-specific
import { tool } from '@opencode-ai/plugin'

// Relative imports
import { findNextStory } from './lib/find-next'
import { resolvePrdFile, readPrdFile } from './lib/prd-utils'

// Type imports
import type { Story, PrdDocument } from './lib/types'
```

**Rules:**

- Use relative imports (no absolute path aliases)
- Always use `type` keyword for type-only imports
- Multi-line imports use trailing commas
- Destructure when importing multiple items

### Naming Conventions

**Files:**

- `kebab-case.ts` for all files (e.g., `find-next.ts`, `record-failure.ts`)
- Test files: `*.test.ts` matching implementation file name
- Utilities: `test-utils.ts`, `prd-utils.ts`

**Functions:**

- `camelCase` for functions (e.g., `findNextStory`, `getStoryDetails`)
- Verb-based descriptive names (e.g., `recordStoryFailure`, `createProgressFile`)
- Exported function names match file name pattern

**Variables:**

- `camelCase` for variables (e.g., `prdPath`, `testDir`, `storyId`)
- `SCREAMING_SNAKE_CASE` for constants (e.g., `PRIORITY_ORDER`)

**Types:**

- `PascalCase` for interfaces and types (e.g., `Story`, `PrdDocument`)
- Descriptive suffixes: `Options`, `Document` (e.g., `ProgressOptions`)

### TypeScript Type Usage

**Interfaces vs Types:**

```typescript
// Prefer interfaces for object shapes
export interface Story {
  id: string
  title: string
  passes: boolean
}

// Use types for unions and aliases
export type Priority = 'critical' | 'high' | 'medium' | 'low'
```

**Type Annotations:**

- Explicit types for all function parameters and return types
- Infer types for local variables when obvious
- Optional properties use `?` syntax (e.g., `prdFile?: string`)
- Avoid `any` except for error handling (`error: any`)

**Example:**

```typescript
export async function getStoryDetails(options: {
  storyId: string
  prdFile?: string
}): Promise<string> {
  // Explicit parameter and return types
  const attempts = story.attempts || [] // Inferred type
  return JSON.stringify(result, null, 2)
}
```

### Error Handling

**Tool Functions (return JSON):**

```typescript
try {
  // Operation
  return JSON.stringify({ success: true, data: result }, null, 2)
} catch (error: any) {
  return JSON.stringify(
    {
      success: false,
      error: error.message,
      message: `Failed to ...: ${error.message}`,
    },
    null,
    2
  )
}
```

**Library Functions (throw errors):**

```typescript
if (!story) {
  throw new Error(`Story '${storyId}' not found in ${prdPath}`)
}
```

**File Operations with Cleanup:**

```typescript
try {
  await fs.writeFile(tempPath, content, 'utf-8')
  await fs.rename(tempPath, prdPath)
} catch (error: any) {
  try {
    await fs.unlink(tempPath) // Clean up temp file
  } catch {
    // Ignore cleanup errors
  }
  throw new Error(`Failed to write PRD file: ${error.message}`)
}
```

### Async/Await

**Rules:**

- Always use `async/await` (never `.then()`)
- Await all file operations
- Use `for...of` for sequential async operations in loops

```typescript
export async function findNextStory(options: {
  prdFile?: string
}): Promise<string> {
  const prdPath = await resolvePrdFile({ prdFile: options.prdFile })
  const prd = await readPrdFile(prdPath)

  // Sequential async in loops
  for (const depId of story.dependencies) {
    const inArchive = await isStoryInArchive(depId)
    if (!inArchive) return false
  }
}
```

### Comments and Documentation

**JSDoc for exported functions:**

```typescript
/**
 * Finds the next story to work on based on priority and dependencies
 *
 * @param options - Configuration options
 * @returns JSON string with story details or error
 */
export async function findNextStory(options: {
  prdFile?: string
}): Promise<string> {
  // Implementation
}
```

**Inline comments for clarity:**

```typescript
// Priority 1: Explicit parameter
if (prdFile) {
  return path.resolve(prdFile)
}

// Check dependencies (now async)
const depsSatisfied = await areDependenciesSatisfied(story, prd)
```

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { functionToTest } from '../module-name'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('module-name', () => {
  const testEnv = useTestDir('module-name')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('should do something specific', async () => {
    // Arrange
    const testDir = process.cwd()
    await createTestPrd(testDir, 'active.prd.json', {
      stories: [sampleStories.critical],
    })

    // Act
    const result = await functionToTest({})

    // Assert
    expect(result).toBe('expected value')
  })
})
```

### Test Utilities

- `useTestDir(name)` - Creates isolated test directory with setup/cleanup
- `createTestPrd()` - Creates test PRD files
- `readTestPrd()` - Reads PRD files for assertions
- `sampleStories` - Fixture objects for common scenarios

## Important Patterns

### Atomic File Writes

Always use temp file + rename pattern for PRD updates:

```typescript
const tempPath = `${prdPath}.tmp`
await fs.writeFile(tempPath, JSON.stringify(prd, null, 2), 'utf-8')
await fs.rename(tempPath, prdPath)
```

### Structured JSON Responses

Tools return consistent JSON format:

```typescript
return JSON.stringify(
  {
    success: true,
    data: {
      /* result */
    },
  },
  null,
  2
)
```

### Environment Variables

Support configurable file paths:

- `RALPH_PRD_FILE_ACTIVE` - Active PRD file (default: `active.prd.json`)
- `RALPH_PRD_FILE_ARCHIVE` - Archive file for completed stories

## Key Files Reference

- **Type definitions:** `tools/lib/types.ts`
- **Shared utilities:** `tools/lib/prd-utils.ts`
- **Test patterns:** `tools/lib/__tests__/test-utils.ts`
- **Main exports:** `tools/ralph.ts`
- **Config:** `tsconfig.json`, `.prettierrc`, `package.json`

## Additional Documentation

- **QUICK_SETUP.md** - Minimal setup guide
- **ACTIVE_ARCHIVE_WORKFLOW.md** - Active/archive workflow
- **RALPH-OVERVIEW.md** - Complete tool reference
- **FOR_OTHER_AGENT.md** - Integration with other projects
