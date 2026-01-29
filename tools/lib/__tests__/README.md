# Ralph Library Tests

Comprehensive Vitest test suite for all Ralph library functions.

## Running Tests

```bash
# Run all Ralph tests (from project root)
bun test:ralph

# Run tests in watch mode
bun test:ralph:watch

# Run all tests (including Ralph)
bun test

# Run tests from ralph-cli directory
cd ralph-cli && bunx vitest
```

## Test Structure

```
tools/lib/__tests__/
├── test-utils.ts              # Shared test utilities and fixtures
├── prd-utils.test.ts         # PRD file operations (17 tests)
├── find-next.test.ts         # Story selection logic (8 tests)
├── get-details.test.ts       # Story detail retrieval (4 tests)
├── get-attempts.test.ts      # Attempt tracking (4 tests)
├── record-failure.test.ts    # Failure recording (6 tests)
├── block-story.test.ts       # Story blocking (6 tests)
├── is-complete.test.ts       # Completion checking (6 tests)
└── create-progress.test.ts   # Progress file generation (7 tests)
```

**Total: 58 tests, 100% passing**

## Test Coverage

### prd-utils.test.ts (17 tests)

- File resolution priority (explicit → env var → active.prd.json → prd.json)
- PRD file reading and parsing
- Atomic file writing
- Story finding by ID
- Error handling for missing/invalid files

### find-next.test.ts (8 tests)

- Story selection by priority
- Dependency resolution
- Skipping completed/blocked stories
- Edge cases (no available stories)

### get-details.test.ts (4 tests)

- Story detail retrieval
- JSON formatting
- Error handling for missing stories

### get-attempts.test.ts (4 tests)

- Attempt list retrieval
- Empty attempts handling
- Newline-separated formatting

### record-failure.test.ts (6 tests)

- Adding context files to attempts array
- Initializing attempts when missing
- Appending to existing attempts
- Atomic writes

### block-story.test.ts (6 tests)

- Setting blocked flag
- Adding blockedAt timestamp
- Handling already blocked stories

### is-complete.test.ts (6 tests)

- Checking all stories completion
- Handling mixed states
- Empty stories array

### create-progress.test.ts (7 tests)

- Success file generation
- Failure file generation
- Timestamp formatting
- Directory creation
- Optional field handling

## Test Utilities

### test-utils.ts

Provides shared utilities for all tests:

- `createTestDir()` - Create isolated test directory
- `cleanupTestDir()` - Clean up after tests
- `createTestPrd()` - Create test PRD files
- `readTestPrd()` - Read PRD files for verification
- `sampleStories` - Fixture data for common scenarios
- `useTestDir()` - Auto-cleanup hook

All tests use isolated temporary directories with automatic cleanup to prevent test pollution.

## Writing New Tests

Example test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { yourFunction } from '../your-module'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('your-module', () => {
  const testEnv = useTestDir('your-module')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('should do something', async () => {
    const testDir = process.cwd()
    await createTestPrd(testDir, 'active.prd.json', {
      stories: [sampleStories.critical],
    })

    const result = await yourFunction({ storyId: 'story-1' })
    expect(result).toBe('expected value')
  })
})
```

## CI/CD Integration

Tests can be run in CI with:

```bash
bun test:ralph --run --reporter=verbose
```

Or with coverage:

```bash
bun test:ralph --coverage
```
