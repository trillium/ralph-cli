# For the Other Agent: Ralph-CLI Integration Summary

## What You Need

Ralph-CLI is a local tool system for managing PRD stories with autonomous development loops. Here's how to integrate it into your OpenCode environment.

## Three Simple Steps

### 1. Create `.opencode/tools/ralph.ts`

This is a **re-export file** that gives OpenCode access to Ralph tools:

```typescript
// Adjust path to wherever ralph-cli is located relative to your project
export * from '../../ralph-cli/tools/ralph'
```

**Finding the right path:**

- Look at where ralph-cli is located
- Look at where your project's `.opencode/` folder is
- Calculate the relative path from `.opencode/tools/` to `ralph-cli/tools/`

### 2. Copy Agents to `.opencode/agents/`

```bash
mkdir -p .opencode/agents
cp /path/to/ralph-cli/agents/ralph-gpt.md .opencode/agents/
cp /path/to/ralph-cli/agents/ralph-claude.md .opencode/agents/
```

### 3. Copy Commands to `.opencode/commands/`

```bash
mkdir -p .opencode/commands
cp /path/to/ralph-cli/commands/ralph.md .opencode/commands/
cp /path/to/ralph-cli/commands/ralph-orchestrate.md .opencode/commands/
```

## Your Active/Archive PRD Setup

Since you use `active.prd.json` + `archive.prd.json`:

### Create active.prd.json

```json
{
  "project": "Your Project",
  "description": "Active stories",
  "stories": [
    {
      "id": "story-1",
      "title": "Story title",
      "description": "What needs to be done",
      "priority": "high",
      "passes": false,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "dependencies": [],
      "attempts": []
    }
  ]
}
```

### Create archive.prd.json

```json
{
  "project": "Your Project",
  "description": "Completed stories",
  "stories": []
}
```

### Set Environment Variables

Add these to your environment or `.env` file:

```bash
# Primary PRD file for active work (optional - defaults to active.prd.json)
export RALPH_PRD_FILE_ACTIVE=active.prd.json

# Archive file for completed stories (optional - enables auto-archiving)
export RALPH_PRD_FILE_ARCHIVE=archive.prd.json
```

**Backward Compatibility:** `RALPH_PRD_FILE` is still supported but deprecated. Use `RALPH_PRD_FILE_ACTIVE` instead.

**Auto-Archive Behavior:**

- If `RALPH_PRD_FILE_ARCHIVE` is set OR `archive.prd.json` exists, `ralph_markComplete` will automatically move completed stories to the archive
- If neither is set, stories are marked `passes=true` in place

## Using the Tools

### Find Next Story (Returns Rich JSON)

```typescript
// Find next story - returns COMPLETE story object with all fields
const result = await ralph_findNext()

// Parse the JSON response
const story = JSON.parse(result)

// Access all story fields directly
console.log(story.id) // "story-1"
console.log(story.title) // "Story title"
console.log(story.priority) // "high"
console.log(story.acceptanceCriteria) // ["criterion 1", "criterion 2"]
console.log(story.attemptCount) // 2
console.log(story.previousAttempts) // ["progress/story-1_attempt1.md", ...]

// Check if story should be blocked (6+ attempts)
if (story.attemptCount >= 6) {
  await ralph_blockStory({ storyId: story.id })
}

// Read previous failure context
for (const attemptFile of story.previousAttempts) {
  const context = await readFile(attemptFile)
  // Learn from previous failures
}
```

### Get Story Details (Also Returns Rich JSON)

```typescript
// Get details for specific story
const result = await ralph_getDetails({ storyId: 'story-1' })

// Parse the JSON response
const story = JSON.parse(result)

// Same fields as findNext
console.log(story.attemptCount) // 2
console.log(story.previousAttempts) // ["progress/story-1_attempt1.md", ...]
```

### Add New Story

```typescript
await ralph_addPrd({
  title: 'New feature',
  description: 'Implementation details',
  priority: 'high',
  acceptanceCriteria: ['Works', 'Tests pass'],
})
```

### Mark Complete with Auto-Archive

```typescript
// Mark complete - AUTOMATICALLY moves to archive if RALPH_PRD_FILE_ARCHIVE is set
await ralph_markComplete({ storyId: 'story-1' })
// Story removed from active.prd.json
// Story added to archive.prd.json with passes=true and completedAt timestamp

// Or explicitly specify archive file (overrides env var)
await ralph_markComplete({
  storyId: 'story-2',
  archiveFile: 'custom-archive.prd.json',
})
```

### Efficient Workflow (No Wasted Tool Calls)

```typescript
// OLD WAY (3 tool calls):
// 1. const next = await ralph_findNext()
// 2. const details = await ralph_getDetails({ storyId: next })
// 3. const attempts = await ralph_getAttempts({ storyId: next })

// NEW WAY (1 tool call):
const result = await ralph_findNext()
const story = JSON.parse(result)
// You now have ALL the data: id, title, acceptanceCriteria, attemptCount, previousAttempts, etc.
```

## Available Tools

All tools accept optional `prdFile` parameter (defaults to `RALPH_PRD_FILE_ACTIVE` env var → `active.prd.json` → `prd.json`):

- `ralph_findNext({ prdFile? })` - **Returns rich JSON** with complete story object including `attemptCount` and `previousAttempts`
- `ralph_getDetails({ storyId, prdFile? })` - **Returns rich JSON** with complete story object including `attemptCount` and `previousAttempts`
- `ralph_getAttempts({ storyId, prdFile? })` - Get just the attempts array (usually not needed since findNext/getDetails include this)
- `ralph_markComplete({ storyId, prdFile?, archiveFile? })` - **Auto-archives when RALPH_PRD_FILE_ARCHIVE is set**
- `ralph_recordFailure({ storyId, contextFilePath, prdFile? })`
- `ralph_blockStory({ storyId, prdFile? })`
- `ralph_isComplete({ prdFile? })`
- `ralph_createProgress(args)`
- `ralph_addPrd({ title, description, priority, acceptanceCriteria, prdFile?, ... })`

### Key Return Format Changes

`ralph_findNext()` and `ralph_getDetails()` now return **JSON strings** with complete story objects:

```json
{
  "id": "story-1",
  "title": "Story Title",
  "description": "...",
  "priority": "high",
  "acceptanceCriteria": [...],
  "dependencies": [...],
  "attemptCount": 2,              // NEW: Computed count of previous attempts
  "previousAttempts": [           // NEW: Renamed from attempts for clarity
    "progress/story-1_attempt1.md",
    "progress/story-1_attempt2.md"
  ],
  "attempts": [...],              // Original field still present
  "passes": false,
  ...all other story fields
}
```

This eliminates the need for multiple tool calls to get basic story information.

## What Happens on ralph_markComplete

### Archive Workflow (Recommended)

When you call `ralph_markComplete({ storyId: 'story-1' })` with archive configured:

```typescript
ralph_markComplete({
  storyId: 'story-1',
  archiveFile: 'archive.prd.json',
})
```

Ralph will:

1. Find story in active.prd.json
2. Set `passes: true`
3. Add `completedAt: "2026-01-28T10:30:00.000Z"`
4. **Remove** story from active.prd.json
5. **Add** story to archive.prd.json
6. Write both files atomically

## Final Directory Structure

```
your-project/
├── .opencode/
│   ├── tools/
│   │   └── ralph.ts           # export * from '../../ralph-cli/tools/ralph'
│   ├── agents/
│   │   ├── ralph-gpt.md       # Copied from ralph-cli
│   │   └── ralph-claude.md    # Copied from ralph-cli
│   └── commands/
│       ├── ralph.md           # Copied from ralph-cli
│       └── ralph-orchestrate.md
├── active.prd.json            # Your active stories
├── archive.prd.json           # Auto-populated with completed stories
└── progress/                  # Auto-created success/failure logs
```

## Documentation References

For more details, see:

- **QUICK_SETUP.md** - Minimal setup guide
- **ACTIVE_ARCHIVE_WORKFLOW.md** - Complete active/archive workflow guide
- **OPENCODE_AGENT.md** - Full setup documentation
- **RALPH-OVERVIEW.md** - Complete tool reference

## That's All!

You don't need to copy any code. Just:

1. One re-export file (`.opencode/tools/ralph.ts`)
2. Copy agents and commands
3. Create your PRD files
4. Set environment variable

Ralph tools will be available in your OpenCode environment.
