# Ralph CLI Tools

This directory contains the ralph CLI tool implementations for autonomous development workflows.

## Available Tools

### Story Management

#### `findNext`

Find the next available story to work on, respecting dependencies and priority.

**Returns:** JSON with story details or availability status

**Example:**

```typescript
const result = await findNext({})
const parsed = JSON.parse(result)
if (parsed.available) {
  console.log(`Next story: ${parsed.story.id}`)
}
```

#### `getDetails`

Get full details for a specific story including acceptance criteria and attempt history.

**Parameters:**

- `storyId` (string): Story ID to retrieve
- `prdFile` (string, optional): PRD file path

**Returns:** JSON with story details

#### `getAttempts`

Get list of previous attempt file paths for a story.

**Parameters:**

- `storyId` (string): Story ID
- `prdFile` (string, optional): PRD file path

**Returns:** JSON with attempts array and count

#### `markComplete`

Mark a story as complete and optionally move to archive.

**Parameters:**

- `storyId` (string): Story ID to mark complete
- `prdFile` (string, optional): Active PRD file path
- `archiveFile` (string, optional): Archive file path

**Returns:** Success message

### Progress Tracking

#### `createProgress`

Create a detailed progress file (success or failure) for a story attempt.

**Parameters:**

- `storyId` (string): Story ID
- `status` (string): 'success' or 'failure'
- `model` (string): Model used

**Success fields:**

- `summary` (string, optional): What was implemented
- `filesChanged` (string, optional): Files modified
- `learnings` (string, optional): Key patterns learned
- `validationResults` (string, optional): Validation results

**Failure fields:**

- `failureReason` (string, optional): One-line failure summary
- `whatAttempted` (string, optional): Step-by-step narrative
- `errorsEncountered` (string, optional): Full error messages
- `whatWasTried` (string, optional): Fix attempts
- `recommendations` (string, optional): Next steps

**Returns:** File path to created progress file

#### `createFailure` ✨ NEW

Quick way to create a failure document when an agent encounters an error.

**Parameters:**

- `storyId` (string): Story ID
- `error` (string): Error message or description
- `context` (string, optional): What was happening when error occurred
- `attempted` (string, optional): What was attempted before error
- `model` (string, optional): Model that encountered the error

**Returns:** JSON with file path and success status

**Example:**

```typescript
const result = await createFailure({
  storyId: 'story-42',
  error: 'Build failed with 5 TypeScript errors',
  context: 'Adding strict null checks to auth module',
  model: 'claude-sonnet-4.5',
})

const parsed = JSON.parse(result)
if (parsed.success) {
  console.log(`Failure documented at: ${parsed.filePath}`)
}
```

**Output Example:**

```markdown
# Story story-42 - FAILED

**Model:** claude-sonnet-4.5
**Date:** 2026-01-28T23:30:39.441Z
**Reason:** Build failed with 5 TypeScript errors

## What Was Attempted

Modified User.ts, AuthService.ts, and Login.tsx files

## Errors Encountered

Build failed with 5 TypeScript errors

## What Was Tried

Adding strict null checks to auth module

## Recommendations

Review the error details above and consider alternative approaches.
```

#### `recordFailure`

Record a failed attempt by adding context file to story's attempts array.

**Parameters:**

- `storyId` (string): Story ID
- `contextFilePath` (string): Path to failure context file
- `prdFile` (string, optional): PRD file path

**Returns:** Success message

### Story Control

#### `blockStory`

Mark a story as blocked after exceeding max attempts (6).

**Parameters:**

- `storyId` (string): Story ID to block
- `prdFile` (string, optional): PRD file path

**Returns:** Success message

#### `isComplete`

Check if all stories in PRD are complete.

**Parameters:**

- `prdFile` (string, optional): PRD file to check

**Returns:** JSON with completion status and breakdown

### PRD Management

#### `addPrd`

Add a new PRD entry with validation and duplicate checking.

**Parameters:**

- `title` (string): Story title
- `description` (string): Detailed description
- `priority` (string): 'critical', 'high', 'medium', or 'low'
- `acceptanceCriteria` (string[]): Array of acceptance criteria
- `id` (string, optional): Story ID (auto-increments if not provided)
- `dependencies` (string[], optional): Story IDs this depends on
- `info` (string, optional): Additional context
- `info2` (string, optional): More context
- `prdFile` (string, optional): PRD file path

**Returns:** Success message with story ID

**Note:** Dependencies are validated against both active and archive PRD files.

## Features

### Archive Support

The ralph tools now support checking archived stories for dependency resolution:

- `findNext` checks both active and archive when resolving dependencies
- `addPrd` validates dependencies against both active and archive
- Stories with completed archived dependencies are properly identified as ready to work on

### JSON Responses

All tools return structured JSON responses for better error handling:

- Success/failure status
- Detailed error messages
- Rich metadata (counts, timestamps, etc.)
- Backward compatibility maintained where needed

### Error Handling

- No tools throw exceptions directly
- All errors returned as structured JSON
- Detailed error messages for debugging
- Graceful degradation when files don't exist

## File Structure

```
tools/
├── ralph.ts                 # Main tool exports
└── lib/
    ├── find-next.ts        # Find next available story
    ├── get-details.ts      # Get story details
    ├── get-attempts.ts     # Get attempt history
    ├── mark-complete.ts    # Mark story complete
    ├── create-progress.ts  # Create progress files
    ├── create-failure.ts   # Create failure documents (NEW)
    ├── record-failure.ts   # Record failure attempts
    ├── block-story.ts      # Block stories
    ├── is-complete.ts      # Check completion
    ├── prd-utils.ts        # Shared PRD utilities
    └── types.ts            # Type definitions
```

## Environment Variables

- `RALPH_PRD_FILE_ACTIVE`: Path to active PRD file (default: `active.prd.json`)
- `RALPH_PRD_FILE_ARCHIVE`: Path to archive PRD file (default: `archive.prd.json`)
- `RALPH_PRD_FILE`: Legacy, for backward compatibility

## Testing

Run tests with:

```bash
npm run test:ralph
```

Run specific test file:

```bash
npm run test:ralph -- create-failure
```
