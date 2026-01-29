# Active + Archive PRD Workflow

This document explains how to use Ralph-CLI with the `active.prd.json` + `archive.prd.json` workflow.

## Prerequisites

Make sure you have Ralph-CLI tools accessible in your OpenCode environment. See `OPENCODE_AGENT.md` for setup instructions.

## Overview

Instead of keeping all stories (active and completed) in a single `prd.json` file, you can use two separate files:

- **active.prd.json** - Stories currently being worked on
- **archive.prd.json** - Completed stories (auto-populated)

When a story is marked complete, it's **moved** from active to archive, keeping your active PRD clean and focused.

## Quick Setup

### 1. Create Your Files

**active.prd.json:**

```json
{
  "project": "Your Project Name",
  "description": "Active stories in progress",
  "stories": [
    {
      "id": "story-1",
      "title": "Your first story",
      "description": "Description here",
      "priority": "high",
      "passes": false,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "dependencies": [],
      "attempts": []
    }
  ]
}
```

**archive.prd.json:**

```json
{
  "project": "Your Project Name",
  "description": "Completed stories archive",
  "stories": []
}
```

### 2. Configure Environment

Set the environment variable so all tools use `active.prd.json` by default:

```bash
export RALPH_PRD_FILE=active.prd.json
```

Or add to your `.env` file:

```
RALPH_PRD_FILE=active.prd.json
```

### 3. Use the Tools

All Ralph tools now support the `prdFile` parameter:

```typescript
// Find next story from active.prd.json
const next = await ralph_findNext({ prdFile: 'active.prd.json' })

// Get story details
const details = await ralph_getDetails({
  storyId: 'story-1',
  prdFile: 'active.prd.json',
})

// Add a new story to active.prd.json
await ralph_addPrd({
  title: 'New feature',
  description: 'Feature description',
  priority: 'high',
  acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
  prdFile: 'active.prd.json',
})

// Mark complete and move to archive
await ralph_markComplete({
  storyId: 'story-1',
  prdFile: 'active.prd.json',
  archiveFile: 'archive.prd.json',
})
```

## What Happens When You Mark Complete

When you call `ralph_markComplete` with an `archiveFile` parameter:

1. Story is found in `active.prd.json`
2. Story is marked `passes: true`
3. Current timestamp is added as `completedAt: "2026-01-28T10:30:00.000Z"`
4. Story is **removed** from `active.prd.json`
5. Story is **added** to `archive.prd.json`
6. Both files are written atomically

**Before (active.prd.json):**

```json
{
  "stories": [
    { "id": "story-1", "passes": false, ... },
    { "id": "story-2", "passes": false, ... }
  ]
}
```

**After (active.prd.json):**

```json
{
  "stories": [
    { "id": "story-2", "passes": false, ... }
  ]
}
```

**After (archive.prd.json):**

```json
{
  "stories": [
    {
      "id": "story-1",
      "passes": true,
      "completedAt": "2026-01-28T10:30:00.000Z",
      ...
    }
  ]
}
```

## Using with Environment Variable

If you set `RALPH_PRD_FILE=active.prd.json`, you can omit the `prdFile` parameter:

```typescript
// These will all use active.prd.json automatically
const next = await ralph_findNext()
const details = await ralph_getDetails({ storyId: 'story-1' })
await ralph_addPrd({ title: 'New story', ... })

// Still need to specify archiveFile for moving
await ralph_markComplete({
  storyId: 'story-1',
  archiveFile: 'archive.prd.json'
})
```

## Tool Reference

All these tools support optional `prdFile` parameter:

- `ralph_findNext({ prdFile? })`
- `ralph_getDetails({ storyId, prdFile? })`
- `ralph_getAttempts({ storyId, prdFile? })`
- `ralph_markComplete({ storyId, prdFile?, archiveFile? })`
- `ralph_recordFailure({ storyId, contextFilePath, prdFile? })`
- `ralph_blockStory({ storyId, prdFile? })`
- `ralph_isComplete({ prdFile? })`
- `ralph_addPrd({ ..., prdFile? })`

## Benefits

### ✅ Cleaner Active PRD

Only shows stories currently being worked on, not historical completed work.

### ✅ Faster Lookups

Smaller active file means faster parsing and searching.

### ✅ Historical Record

Archive preserves all completed work with completion timestamps.

### ✅ Better Organization

Separate files make it easier to understand project status at a glance.

### ✅ Flexible Configuration

Use env var for global default, or specify per-tool for mixed workflows.

## Migration from Single PRD

If you have an existing `prd.json` with completed stories:

### Option 1: Manual Split

```bash
# 1. Copy prd.json to active.prd.json
cp prd.json active.prd.json

# 2. Create empty archive
echo '{"project":"My Project","description":"Archive","stories":[]}' > archive.prd.json

# 3. Manually move completed stories from active to archive
# (Edit the JSON files)

# 4. Set environment variable
export RALPH_PRD_FILE=active.prd.json
```

### Option 2: Script (coming soon)

We can create a migration script that automatically:

- Reads `prd.json`
- Splits stories by `passes: true/false`
- Creates `active.prd.json` and `archive.prd.json`

## Example Agent Workflow

```typescript
// Set at the start of your workflow
process.env.RALPH_PRD_FILE = 'active.prd.json'

// 1. Check if work is complete
const status = await ralph_isComplete()
if (status === 'COMPLETE') {
  console.log('All stories in active.prd.json are done!')
  return
}

// 2. Find next story
const nextStory = await ralph_findNext()
console.log(`Working on: ${nextStory}`)

// 3. Get details
const storyId = extractStoryId(nextStory) // e.g., "story-5"
const details = await ralph_getDetails({ storyId })

// 4. Implement the story...
// ...

// 5. On success, archive it
await ralph_markComplete({
  storyId,
  archiveFile: 'archive.prd.json',
})

console.log(`Story ${storyId} completed and archived!`)
```

## Troubleshooting

### "Story not found in active.prd.json"

The story might be in `archive.prd.json` already. Check both files.

### Environment variable not working

Make sure it's exported and the process can see it:

```bash
echo $RALPH_PRD_FILE  # Should show: active.prd.json
```

### Archive file not created

If `archive.prd.json` doesn't exist, Ralph will create it automatically when you first mark a story complete with `archiveFile` parameter.

### Want to use different filenames

You can use any filenames you want:

```typescript
await ralph_findNext({ prdFile: 'backlog.json' })
await ralph_markComplete({
  storyId: 'story-1',
  prdFile: 'backlog.json',
  archiveFile: 'done.json',
})
```

## Backward Compatibility

Ralph still supports the single `prd.json` file:

```typescript
// Without prdFile parameter and no RALPH_PRD_FILE env var,
// defaults to prd.json
await ralph_findNext()
await ralph_markComplete({ storyId: 'story-1' })
// Story stays in prd.json, just marked passes=true
```

This ensures existing projects continue to work without changes.

## Best Practices

### 1. Commit Both Files

Always commit both active and archive files together:

```bash
git add active.prd.json archive.prd.json
git commit -m "chore: Archive completed story-5"
```

### 2. Review Archive Periodically

The archive is a great place to:

- Review what's been accomplished
- Identify patterns in completed work
- Estimate future similar stories

### 3. Keep Active Small

If active.prd.json has 50+ stories, consider if some can be:

- Deprioritized and moved to backlog.prd.json
- Combined into larger epics
- Deleted if no longer relevant

### 4. Use Dependencies

Dependencies work across active and archive:

```json
{
  "id": "story-10",
  "dependencies": ["story-5"]
}
```

If `story-5` is in archive with `passes: true`, dependency is satisfied.

---

For complete documentation, see:

- `OPENCODE_AGENT.md` - Full setup guide
- `RALPH-OVERVIEW.md` - Complete function reference
- `README.md` - Quick start guide
