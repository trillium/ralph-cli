# Ralph CLI - Autonomous Development Loop System

This directory contains the Ralph CLI tooling for managing autonomous development loops.

## Installation

### Homebrew (Recommended)

The easiest way to install Ralph CLI is via Homebrew:

```bash
brew tap trillium/ralph-cli https://github.com/trillium/ralph-cli
brew install ralph-cli
```

This will:
- Install Bun automatically (required dependency)
- Make `ralph-mcp` globally available in your PATH
- Handle all dependencies and setup

### Manual Installation

If you prefer to install manually, you'll need [Bun](https://bun.sh) first:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then install ralph-cli via npm:

```bash
npm install -g ralph-cli
```

**Note:** Ralph CLI requires Bun to execute TypeScript files directly. The MCP server (`ralph-mcp`) uses `#!/usr/bin/env bun` and will not work with Node.js alone.

## MCP Server Setup (Claude Code)

Ralph CLI includes an MCP server for integration with Claude Code.

### If installed via Homebrew

Configure your `.mcp.json` with:

```json
{
  "mcpServers": {
    "ralph": {
      "command": "ralph-mcp"
    }
  }
}
```

### If installed via npm

Configure your `.mcp.json` with:

```json
{
  "mcpServers": {
    "ralph": {
      "command": "bunx",
      "args": ["--bun", "ralph-mcp"]
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "ralph": {
      "command": "ralph-mcp"
    }
  }
}
```

**Note:** The MCP server binary requires Bun because it executes TypeScript directly. If you encounter errors like `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, ensure Bun is installed and the command uses `bunx --bun` or points directly to the `ralph-mcp` binary with Bun in your PATH.

## Integration with OpenCode

Ralph CLI is a standalone workspace, but integrates with OpenCode via the `.opencode/` directory:

- **Source of truth:** All code lives in `ralph-cli/`
- **OpenCode discovery:** Tools are re-exported in `.opencode/tools/`
- **Agents/Commands:** Markdown files are copied to `.opencode/agents/` and `.opencode/commands/`

This separation allows Ralph to be:

- Developed and tested independently
- Reusable across projects
- Integrated seamlessly with OpenCode

---

## ✅ Migration Complete: Pure TypeScript Implementation

> **As of January 28, 2026, Ralph CLI is now 100% TypeScript!**
>
> All functionality has been migrated from bash to TypeScript. The tooling now:
>
> - Has **zero external dependencies** (no more bashrc_dir requirement)
> - Automatically detects PRD files (active.prd.json or prd.json)
> - Supports active/archive workflow out of the box
> - Provides better error handling and type safety
> - Is fully testable and maintainable
>
> The old bash scripts in `tmp/` are kept for reference only.

---

## Quick Start Commands

### `/ralph` - Execute one story

Run a single Ralph iteration (select story → implement → validate → commit).

### `/ralph-orchestrate` - Execute all remaining stories

**Recommended for autonomous operation.** Spawns a sub-agent that will execute the Ralph loop until all stories are complete.

**Usage:**

```
/ralph-orchestrate
```

This command will:

1. Call `ralph_runLoop` with high iteration count
2. Spawn a Task sub-agent that runs autonomously
3. Execute stories sequentially until all complete or max iterations reached
4. Report back with summary when done

---

## Available Tools

The following story management tools are available via the TypeScript CLI (`ralph-cli/tools/ralph.ts`).

### Story Management Tools

#### `ralph_findNext()`

Find the next available story to work on (respects dependencies and priority).

**Usage:**

```
ralph_findNext()
```

**Returns:** JSON object with complete story details:

```json
{
  "id": "story-1",
  "title": "Story Title",
  "description": "Story description",
  "priority": "high",
  "acceptanceCriteria": ["criteria 1", "criteria 2"],
  "dependencies": ["story-0"],
  "attemptCount": 2,
  "previousAttempts": [
    "progress/story-1_attempt1.md",
    "progress/story-1_attempt2.md"
  ],
  "passes": false,
  "attempts": [...],
  ...
}
```

**Key Fields:**

- `attemptCount` - Number of previous attempts (use to check if story should be blocked at 6)
- `previousAttempts` - Array of progress file paths to read for learning from failures
- All other story fields from PRD included

---

#### `ralph_getDetails(storyId)`

Get full details for a specific story including acceptance criteria and dependencies.

**Usage:**

```
ralph_getDetails(storyId: "story-9")
```

**Returns:** JSON object with complete story details:

```json
{
  "id": "story-9",
  "title": "Story Title",
  "description": "Story description",
  "priority": "medium",
  "acceptanceCriteria": ["criteria 1", "criteria 2"],
  "dependencies": [],
  "attemptCount": 0,
  "previousAttempts": [],
  "passes": false,
  "attempts": [],
  ...
}
```

**Key Fields:**

- `attemptCount` - Number of previous attempts
- `previousAttempts` - Array of progress file paths to read for context
- All other story fields from PRD included

---

#### `ralph_markComplete(storyId)`

Mark a story as complete by setting `passes=true` in prd.json.

**Usage:**

```
ralph_markComplete(storyId: "story-9")
```

**Returns:** Confirmation message

---

### Autonomous Loop Tool

#### `ralph_runLoop(maxIterations)`

Run an autonomous Ralph loop for N iterations.

**Usage:**

```
ralph_runLoop(maxIterations: 3)
```

**Returns:** A detailed prompt to use with the Task tool

---

## PRD File Resolution

Ralph intelligently resolves PRD files with the following priority order:

### Active PRD File (for reading/working on stories)

1. **Explicit parameter:** `ralph_findNext({ prdFile: "custom.prd.json" })`
2. **Environment variable:** `RALPH_PRD_FILE_ACTIVE=active.prd.json`
3. **Legacy env var (deprecated):** `RALPH_PRD_FILE=active.prd.json`
4. **Auto-detection:** Looks for `active.prd.json` first (modern workflow)
5. **Fallback:** Uses `prd.json` (legacy workflow)

### Archive File (for completed stories)

1. **Explicit parameter:** `ralph_markComplete({ storyId: "...", archiveFile: "custom-archive.prd.json" })`
2. **Environment variable:** `RALPH_PRD_FILE_ARCHIVE=archive.prd.json`
3. **Auto-detection:** Looks for `archive.prd.json` if it exists
4. **Fallback:** No archive (mark complete in place)

**Recommended Setup:**

```bash
# In your .env or environment
export RALPH_PRD_FILE_ACTIVE=active.prd.json
export RALPH_PRD_FILE_ARCHIVE=archive.prd.json
```

With this setup, `ralph_markComplete` will **automatically** move completed stories from active to archive!

**Example:**

```typescript
// Uses active.prd.json if it exists, otherwise prd.json
const next = await ralph_findNext({})

// Mark complete - automatically moves to archive.prd.json (if env var set)
await ralph_markComplete({ storyId: 'story-1' })

// Explicitly use specific files
const next = await ralph_findNext({ prdFile: 'custom.prd.json' })
await ralph_markComplete({
  storyId: 'story-1',
  archiveFile: 'custom-archive.prd.json',
})
```

---

## Progress Tracking

The autonomous loop updates `progress.txt` after each story with:

- What was implemented
- Files changed
- Learnings for future iterations
- Validation results
- Commit hashes

**Codebase Patterns Section:**
The top of progress.txt maintains a "Codebase Patterns" section with consolidated learnings that apply across multiple stories.

---

## Directory Structure

```
ralph-cli/
├── README.md                    # This file - Quick start guide
├── RALPH-OVERVIEW.md           # Complete function reference
├── MIGRATION.md                 # Migration notes (archived)
├── settings.local.json          # OpenCode settings
├── tools/                       # Source code (Pure TypeScript)
│   ├── ralph.ts                 # Main tool exports
│   ├── lib/                     # Modular implementation
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── prd-utils.ts         # Shared PRD file utilities
│   │   ├── find-next.ts         # Story selection logic
│   │   ├── get-details.ts       # Story detail retrieval
│   │   ├── get-attempts.ts      # Attempt tracking
│   │   ├── record-failure.ts    # Failure recording
│   │   ├── block-story.ts       # Story blocking
│   │   ├── is-complete.ts       # Completion checking
│   │   └── create-progress.ts   # Progress file generation
│   ├── forever.ts               # Auto-restart utility
│   ├── gclone.ts                # Git clone wrapper
│   └── gclone.test.ts           # Tests
├── agents/                      # Agent definitions (copied to .opencode/)
│   ├── ralph-gpt.md             # GPT-4.1 execution workflow
│   └── ralph-claude.md          # Claude Sonnet 4.5 workflow
├── commands/                    # Slash commands (copied to .opencode/)
│   ├── ralph.md                 # /ralph command
│   └── ralph-orchestrate.md    # /ralph-orchestrate command
└── tmp/                         # DEPRECATED bash scripts (reference only)
    └── [various .sh files]
```

**Integration with OpenCode:**

- Tools in `ralph-cli/tools/` are re-exported in `.opencode/tools/`
- Agents and commands are copied to `.opencode/agents/` and `.opencode/commands/`
- See `.opencode/README.md` for integration details

---

## Implementation Details

All tools are implemented in pure TypeScript with a modular architecture:

- **Main exports:** `ralph-cli/tools/ralph.ts` - OpenCode tool definitions
- **Core logic:** `ralph-cli/tools/lib/` - Separate, testable modules for each function
- **Zero dependencies:** No external bash scripts or system dependencies required
- **Type-safe:** Full TypeScript type definitions in `lib/types.ts`
- **Atomic operations:** All file writes use temp files + rename for safety

The old bash scripts in `tmp/` are kept for historical reference only.
