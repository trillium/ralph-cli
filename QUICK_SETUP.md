# Quick Setup for Other OpenCode Agents

This is a minimal guide to get Ralph-CLI working in your OpenCode project.

## What You Need to Do

### 1. Create `.opencode/tools/ralph.ts`

Create this file with the correct path to ralph-cli:

```typescript
// Adjust the path based on where ralph-cli is relative to your project
export * from '../../ralph-cli/tools/ralph'
```

**How to find the right path:**

- If ralph-cli is at `/parent/ralph-cli/` and your project is at `/parent/your-project/`, use: `'../../ralph-cli/tools/ralph'`
- If ralph-cli is at `/different/location/ralph-cli/`, use: `'/different/location/ralph-cli/tools/ralph'` (absolute path)
- If ralph-cli is inside your project at `./ralph-cli/`, use: `'../../ralph-cli/tools/ralph'`

### 2. Copy Agents

```bash
mkdir -p .opencode/agents
cp <path-to-ralph-cli>/agents/ralph-gpt.md .opencode/agents/
cp <path-to-ralph-cli>/agents/ralph-claude.md .opencode/agents/
```

### 3. Copy Commands

```bash
mkdir -p .opencode/commands
cp <path-to-ralph-cli>/commands/ralph.md .opencode/commands/
cp <path-to-ralph-cli>/commands/ralph-orchestrate.md .opencode/commands/
```

## Your Active/Archive PRD Setup

### 1. Create `active.prd.json`

```json
{
  "project": "Your Project Name",
  "description": "Active stories",
  "stories": [
    {
      "id": "story-1",
      "title": "Your first story",
      "description": "What to implement",
      "priority": "high",
      "passes": false,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "dependencies": [],
      "attempts": []
    }
  ]
}
```

### 2. Create `archive.prd.json`

```json
{
  "project": "Your Project Name",
  "description": "Completed stories",
  "stories": []
}
```

### 3. Set Environment Variable

```bash
export RALPH_PRD_FILE=active.prd.json
```

Or add to your `.env`:

```
RALPH_PRD_FILE=active.prd.json
```

## Using the Tools

```typescript
// Find next story (uses active.prd.json from env var)
const next = await ralph_findNext()

// Add a story
await ralph_addPrd({
  title: 'New feature',
  description: 'Description here',
  priority: 'high',
  acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
})

// Mark complete and move to archive
await ralph_markComplete({
  storyId: 'story-1',
  archiveFile: 'archive.prd.json',
})
```

## That's It!

You now have:

- ✅ Access to all Ralph tools via re-export
- ✅ `/ralph` and `/ralph-orchestrate` slash commands
- ✅ Active/archive workflow configured

See `ACTIVE_ARCHIVE_WORKFLOW.md` for detailed workflow examples.
See `OPENCODE_AGENT.md` for complete documentation.
