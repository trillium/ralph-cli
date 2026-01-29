# Ralph-CLI Complete Overview

This document provides a comprehensive guide to the ralph-cli directory structure, detailing every file and function.

---

## Table of Contents

1. [What is Ralph?](#what-is-ralph)
2. [Directory Structure](#directory-structure)
3. [Core Tools](#core-tools)
4. [Agents](#agents)
5. [Commands](#commands)
6. [Utility Scripts (tmp/)](#utility-scripts-tmp)
7. [Workflow Examples](#workflow-examples)

---

## What is Ralph?

Ralph is an autonomous development loop system that:
- Manages PRD (Product Requirements Document) stories
- Executes story implementations autonomously using AI agents
- Validates implementations through build/test cycles
- Tracks progress and failures for iterative learning
- Supports multi-model execution (GPT-4.1 → Claude Sonnet 4.5) with automatic fallback
- Blocks stories after 6 failed attempts for manual intervention

**Cost Optimization Strategy:**
- First 3 attempts: GPT-4.1 (fast, cost-effective)
- Next 3 attempts: Claude Sonnet 4.5 (high capability, more expensive)
- After 6 attempts: Block story for manual review

---

## Directory Structure

```
ralph-cli/
├── README.md                    # Quick start guide and migration info
├── MIGRATION.md                 # Bash → TypeScript migration guide
├── RALPH-OVERVIEW.md           # This file - comprehensive documentation
├── settings.local.json          # OpenCode settings configuration
├── tools/                       # Core TypeScript tools
│   ├── ralph.ts                 # Main Ralph CLI tool with all story management functions
│   ├── forever.ts               # Auto-restart utility for long-running processes
│   ├── gclone.ts                # Git clone wrapper for code directory
│   └── gclone.test.ts           # Tests for gclone
├── agents/                      # Agent definitions for autonomous execution
│   ├── ralph-gpt.md             # GPT-4.1 story execution agent (attempts 1-3)
│   └── ralph-claude.md          # Claude Sonnet 4.5 agent (attempts 4-6)
├── commands/                    # Slash command definitions
│   ├── ralph.md                 # /ralph command - execute one story
│   └── ralph-orchestrate.md    # /ralph-orchestrate - execute all stories
└── tmp/                         # Deprecated bash scripts (compatibility layer)
    ├── ralph.sh                 # DEPRECATED: Old bash wrapper
    ├── forever.sh               # DEPRECATED: Bash version of forever
    ├── gclone.sh                # DEPRECATED: Bash version of gclone
    ├── git_wrapper.sh           # DEPRECATED: Git safety wrapper
    └── [other utility scripts]
```

---

## Core Tools

### tools/ralph.ts

The main Ralph CLI tool providing all story management functions.

**Location:** `ralph-cli/tools/ralph.ts`

#### Functions Overview

##### 1. `findNext()`

Find the next available story to work on, respecting dependencies and priority.

**Arguments:** None

**Returns:** String in format `[priority] [story-id] [title]`

**Example:**
```typescript
ralph_findNext()
// Returns: "high story-42 Implement user authentication"
```

**Usage:**
- Called at the start of each Ralph iteration
- Respects story dependencies (won't return a story if its dependencies aren't complete)
- Orders by priority: critical > high > medium > low

---

##### 2. `getDetails(storyId)`

Get full details for a specific story including acceptance criteria and dependencies.

**Arguments:**
- `storyId` (string): Story ID (e.g., "story-42")

**Returns:** JSON object with story details

**Example:**
```typescript
ralph_getDetails(storyId: "story-42")
// Returns:
{
  "id": "story-42",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to API",
  "priority": "high",
  "passes": false,
  "acceptanceCriteria": [
    "Users can login with email/password",
    "JWT tokens are generated on successful login"
  ],
  "dependencies": ["story-40", "story-41"],
  "attempts": ["progress/story-42_2026-01-26_143022_issue.md"]
}
```

**Usage:**
- Called to understand story requirements before implementation
- Check `attempts` array to read previous failure context
- Verify `dependencies` are met

---

##### 3. `getAttempts(storyId)`

Get list of previous attempt file paths for a specific story.

**Arguments:**
- `storyId` (string): Story ID (e.g., "story-42")

**Returns:** Array of file paths to context dump files

**Example:**
```typescript
ralph_getAttempts(storyId: "story-42")
// Returns:
[
  "progress/story-42_2026-01-26_143022_build-errors.md",
  "progress/story-42_2026-01-26_150132_test-failures.md"
]
```

**Usage:**
- Read these files to learn from previous failures
- Understand what approaches were tried and why they failed
- Avoid repeating the same mistakes

---

##### 4. `markComplete(storyId)`

Mark a story as complete by setting `passes=true` in prd.json.

**Arguments:**
- `storyId` (string): Story ID (e.g., "story-42")

**Returns:** Confirmation message

**Example:**
```typescript
ralph_markComplete(storyId: "story-42")
// Returns: "Story story-42 marked as complete"
```

**Usage:**
- Only call after successful validation (build + tests pass)
- Must be committed to git after marking complete

---

##### 5. `recordFailure(storyId, contextFilePath)`

Record a failed attempt by adding context file to story's attempts array in prd.json.

**Arguments:**
- `storyId` (string): Story ID (e.g., "story-42")
- `contextFilePath` (string): Path to context dump file

**Example:**
```typescript
ralph_recordFailure(
  storyId: "story-42",
  contextFilePath: "progress/story-42_2026-01-26_143022_build-errors.md"
)
```

**Usage:**
- Called after creating a failure context dump
- Adds the context file to the story's attempts array for future reference
- Must be committed to git

---

##### 6. `blockStory(storyId)`

Mark a story as blocked after exceeding max attempts (6).

**Arguments:**
- `storyId` (string): Story ID (e.g., "story-42")

**Returns:** Confirmation message

**Example:**
```typescript
ralph_blockStory(storyId: "story-42")
// Returns: "Story story-42 blocked after 6 attempts"
```

**Usage:**
- Automatically called when a story fails 6 times (3 GPT + 3 Claude)
- Sets a "blocked" flag in prd.json
- Story requires manual intervention before it can be retried

---

##### 7. `isComplete()`

Check if all stories in PRD are complete.

**Arguments:** None

**Returns:** String indicating completion status

**Example:**
```typescript
ralph_isComplete()
// Returns: "COMPLETE" or "INCOMPLETE: 5 remaining, 2 blocked"
```

**Usage:**
- Called at the start of orchestration loop
- Determines whether to continue processing or exit

---

##### 8. `createProgress(args)`

Create a progress file (success log or failure context dump) for a story attempt.

**Arguments:**
- `storyId` (string): Story ID
- `status` (string): "success" or "failure"
- `model` (string): Model used (e.g., "gpt-4.1", "claude-sonnet-4.5")

**Success-specific arguments:**
- `summary` (string, optional): Brief description of implementation
- `filesChanged` (string, optional): Comma-separated list of files
- `learnings` (string, optional): Key patterns or learnings
- `validationResults` (string, optional): Build/test results

**Failure-specific arguments:**
- `failureReason` (string, optional): One-line failure summary
- `whatAttempted` (string, optional): Step-by-step narrative
- `errorsEncountered` (string, optional): Full error messages
- `whatWasTried` (string, optional): Each fix attempt and result
- `recommendations` (string, optional): Next steps to try

**Returns:** File path to created progress file

**Example (Success):**
```typescript
ralph_createProgress(
  storyId: "story-42",
  status: "success",
  model: "gpt-4.1",
  summary: "Added JWT authentication with login endpoint",
  filesChanged: "api/auth.ts, middleware/jwt.ts",
  learnings: "Use bcrypt for password hashing, zod for validation",
  validationResults: "Build: PASS, Tests: 12/12 PASS"
)
// Returns: "progress/story-42_2026-01-26_143022_success.md"
```

**Example (Failure):**
```typescript
ralph_createProgress(
  storyId: "story-42",
  status: "failure",
  model: "gpt-4.1",
  failureReason: "Type errors in JWT middleware signature",
  whatAttempted: "Implemented JWT middleware with Express request type",
  errorsEncountered: "TS2345: Argument of type 'Request' is not assignable...",
  whatWasTried: "Tried Request type, tried custom interface, tried NextRequest",
  recommendations: "Consider using NextAuth.js or custom type definition"
)
// Returns: "progress/story-42_2026-01-26_143022_type-errors.md"
```

**Usage:**
- Called after every story attempt (success or failure)
- Creates a markdown file in the progress/ directory
- Timestamped and includes issue slug for failures
- Critical for learning from failures in subsequent attempts

---

##### 9. `addPrd(args)`

Add a new PRD entry to prd.json with validation and auto-incremented ID.

**Arguments:**
- `id` (string, optional): Story ID - auto-incremented if not provided
- `title` (string): Story title
- `description` (string): Detailed description
- `priority` (enum): "critical" | "high" | "medium" | "low"
- `acceptanceCriteria` (string[]): Array of criteria
- `dependencies` (string[], optional): Array of story IDs
- `info` (string, optional): Additional context
- `info2` (string, optional): Additional context (second field)

**Returns:** Success message with generated story ID

**Example (Auto-increment ID):**
```typescript
ralph_addPrd(
  title: "Add dark mode toggle",
  description: "Implement dark mode with localStorage persistence",
  priority: "medium",
  acceptanceCriteria: [
    "Toggle button in settings",
    "Persists across sessions",
    "Applies to all UI components"
  ],
  dependencies: ["story-40"]
)
// Returns: "Successfully added story 'story-48' to prd.json"
```

**Example (Explicit ID):**
```typescript
ralph_addPrd(
  id: "story-99",
  title: "Custom story",
  description: "Special implementation",
  priority: "high",
  acceptanceCriteria: ["Criteria 1", "Criteria 2"]
)
```

**Usage:**
- Automatically finds next available story ID if not provided
- Validates that dependencies exist in prd.json
- Ensures no duplicate story IDs
- Writes atomically (temp file + rename)

---

### tools/forever.ts

Auto-restart a command in a loop when it exits. Useful for development servers and long-running processes.

**Location:** `ralph-cli/tools/forever.ts`

#### Functions

##### `runForever(command, args, opts)`

Run a command continuously, restarting on exit with a delay.

**Arguments:**
- `command` (string): Command to run (e.g., "bun", "node")
- `args` (string[]): Command arguments (e.g., ["run", "dev"])
- `opts` (object, optional):
  - `delaySecs` (number): Delay before restart (default: 2)
  - `onRestart` (function): Callback on restart with exit code

**Returns:** Promise that resolves when loop is manually stopped

**Example:**
```typescript
import { runForever } from './forever'

// Run dev server with auto-restart
await runForever("bun", ["run", "dev"])

// Custom delay
await runForever("node", ["server.js"], { delaySecs: 5 })

// With callback
await runForever("bun", ["test"], {
  onRestart: (code) => console.log(`Exited with code ${code}`)
})
```

**CLI Usage:**
```bash
bun run ralph-cli/tools/forever.ts bun run dev
bun run ralph-cli/tools/forever.ts node server.js
```

**Features:**
- Shows exit code on each restart
- 2-second countdown before restart
- Handles Ctrl+C (SIGINT) cleanly
- Displays clear usage help with `--help`

---

##### `printUsage()`

Print CLI usage information.

**Arguments:** None

**Returns:** void (prints to console)

---

### tools/gclone.ts

Clone git repositories to a standardized code directory with subdirectory support.

**Location:** `ralph-cli/tools/gclone.ts`

#### Functions

##### `cloneGitRepo(opts)`

Clone a git repository to ~/code or a custom directory.

**Arguments (GCloneOptions):**
- `gitUrl` (string): Git URL (https:// or git@)
- `customName` (string, optional): Custom directory name
- `dir` (string, optional): Subdirectory within code directory
- `codeDir` (string, optional): Override base code directory

**Returns:** `{ success: boolean, message: string }`

**Example:**
```typescript
import { cloneGitRepo } from './gclone'

// Clone to ~/code/repo-name
cloneGitRepo({ gitUrl: "https://github.com/user/repo.git" })

// Clone to ~/code/projects/repo-name
cloneGitRepo({
  gitUrl: "https://github.com/user/repo.git",
  dir: "projects"
})

// Custom name
cloneGitRepo({
  gitUrl: "https://github.com/user/repo.git",
  customName: "my-project"
})

// Nested subdirectory
cloneGitRepo({
  gitUrl: "git@github.com:user/repo.git",
  dir: "work/clients",
  customName: "client-project"
})
```

**CLI Usage:**
```bash
bun run ralph-cli/tools/gclone.ts https://github.com/user/repo.git
bun run ralph-cli/tools/gclone.ts --dir projects https://github.com/user/repo.git
bun run ralph-cli/tools/gclone.ts https://github.com/user/repo.git my-name
```

**Features:**
- Defaults to ~/code directory
- Creates subdirectories if needed
- Accepts both HTTPS and SSH Git URLs
- Allows custom target directory names
- Automatic repo name extraction from URL

---

##### `parseArgs(argv)`

Parse command-line arguments.

**Arguments:**
- `argv` (string[]): Command-line arguments

**Returns:** `GCloneOptions | 'help' | null`

---

##### `printUsage(codeDir?)`

Print CLI usage information.

**Arguments:**
- `codeDir` (string, optional): Override default code directory for display

**Returns:** void

---

## Agents

Agents define autonomous execution workflows for implementing stories. They are spawned by the orchestration system.

### agents/ralph-gpt.md

**Purpose:** Execute stories using GPT-4.1 (attempts 1-3)

**Model:** `github-copilot/gpt-4.1`

**When Used:** First 3 attempts at a story (cost-effective, fast)

**Key Features:**
- Reads previous attempt context if available
- Implements story following acceptance criteria
- Validates with build/test cycles
- Max 2 validation retry attempts
- Creates detailed failure context dumps
- Reverts code changes on failure

**Workflow:**
1. Find next story (`ralph_findNext`)
2. Get story details and attempts
3. Check for blocking (6+ attempts)
4. Learn from previous failures
5. Check codebase patterns
6. Implement the story
7. Validate (build + tests)
8. On success: Commit, mark complete, create progress
9. On failure: Create context dump, record failure, revert code

**Returns:**
```json
// Success
{ "status": "SUCCESS", "storyId": "story-X", "model": "gpt-4.1", "attemptNumber": 1 }

// Failure
{ "status": "FAILED", "storyId": "story-X", "model": "gpt-4.1", "contextFile": "progress/...", "attemptNumber": 2 }

// Complete (no more stories)
{ "status": "COMPLETE" }
```

---

### agents/ralph-claude.md

**Purpose:** Execute stories using Claude Sonnet 4.5 (attempts 4-6)

**Model:** `github-copilot/claude-sonnet-4.5`

**When Used:** After GPT-4.1 has failed 3 times (high capability fallback)

**Key Features:**
- Reads ALL previous attempt context (likely 3+ GPT failures)
- Analyzes WHY GPT-4.1 failed
- Tries fundamentally different approaches
- Higher capability for complex problems
- Same validation and error handling as GPT agent

**Workflow:**
Same as ralph-gpt, but with additional emphasis on:
- Deep analysis of previous GPT-4.1 failures
- Trying approaches GPT didn't consider
- More thorough error analysis

**Returns:**
Same format as ralph-gpt, but with `"model": "claude-sonnet-4.5"`

---

## Commands

Slash commands that can be invoked in OpenCode.

### commands/ralph.md

**Command:** `/ralph`

**Purpose:** Execute one story using GPT-4.1

**Agent:** ralph-gpt

**Description:** Runs a single Ralph iteration (select story → implement → validate → commit)

**When to Use:**
- Test a single story
- Debug the Ralph workflow
- Manual story-by-story execution

---

### commands/ralph-orchestrate.md

**Command:** `/ralph-orchestrate`

**Purpose:** Execute all remaining stories with multi-model retry strategy

**Description:** Spawns an orchestrator agent that manages autonomous execution of all stories until completion.

**Multi-Model Strategy:**
- Attempts 1-3: Use GPT-4.1 (cheap, fast)
- Attempts 4-6: Use Claude Sonnet 4.5 (expensive, capable)
- After 6 attempts: Block story for manual intervention

**Orchestration Loop:**
1. Check completion status (`ralph_isComplete`)
2. Find next available story (`ralph_findNext`)
3. Get story details and count attempts
4. Spawn appropriate agent based on attempt count:
   - 0-2: ralph-gpt
   - 3-5: ralph-claude
   - 6+: Block story
5. Handle result (success/failure)
6. Repeat until all stories complete or blocked

**Safety Features:**
- Max 100 iterations to prevent infinite loops
- Automatic blocking after 6 failures
- Clean git state maintained
- Comprehensive progress tracking

**Final Summary:**
Generates detailed report including:
- Total stories completed/blocked/remaining
- Model usage statistics (success/failure counts)
- Blocked story details with context file references
- Cost optimization metrics

**When to Use:**
- Autonomous PRD implementation
- Batch story execution
- Unattended operation with multi-model fallback

---

## Utility Scripts (tmp/)

**⚠️ WARNING:** All scripts in tmp/ are DEPRECATED. They exist only for compatibility during migration. Use TypeScript versions instead.

### tmp/ralph.sh

**Status:** DEPRECATED - Use `tools/ralph.ts`

Original bash wrapper for Ralph CLI. Calls the main Ralph script at `~/bashrc_dir/ralph/ralph.sh`.

### tmp/forever.sh

**Status:** DEPRECATED - Use `tools/forever.ts`

Bash version of auto-restart utility.

### tmp/gclone.sh

**Status:** DEPRECATED - Use `tools/gclone.ts`

Bash version of git clone wrapper.

### tmp/git_wrapper.sh

**Status:** DEPRECATED

Git safety wrapper that prevents accidental `git add .` without `--force` flag.

### tmp/kill_port.sh

**Status:** DEPRECATED

Kills processes running on specified port or by application name.

### Other tmp/ files

Various bash utilities that have been or will be ported to TypeScript. See `MIGRATION.md` for details.

---

## Workflow Examples

### Example 1: Single Story Execution

```typescript
// 1. Find next story
const nextStory = await ralph_findNext()
// "high story-42 Implement user authentication"

// 2. Get details
const details = await ralph_getDetails(storyId: "story-42")
console.log(details.acceptanceCriteria)

// 3. Read previous attempts if any
if (details.attempts?.length > 0) {
  for (const attemptFile of details.attempts) {
    const context = await readFile(attemptFile)
    // Learn from previous failures
  }
}

// 4. Implement the story
// ... implementation code ...

// 5. Validate
const buildResult = execSync('bun run build')
const testResult = execSync('bun test')

// 6. On success
if (buildResult.success && testResult.success) {
  execSync('git add .')
  execSync('git commit -m "feat: story-42 - Implement user authentication"')
  
  await ralph_markComplete(storyId: "story-42")
  
  execSync('git add prd.json')
  execSync('git commit -m "chore: Mark story-42 complete"')
  
  await ralph_createProgress(
    storyId: "story-42",
    status: "success",
    model: "gpt-4.1",
    summary: "Added JWT auth with bcrypt password hashing",
    filesChanged: "api/auth.ts, middleware/jwt.ts, types/user.ts",
    learnings: "Use zod for request validation, bcrypt for passwords",
    validationResults: "Build: PASS, Tests: 12/12 PASS"
  )
}

// 7. On failure
else {
  const contextFile = await ralph_createProgress(
    storyId: "story-42",
    status: "failure",
    model: "gpt-4.1",
    failureReason: "Type errors in JWT middleware",
    whatAttempted: "Created JWT middleware with Express Request type",
    errorsEncountered: "TS2345: Argument of type 'Request' is not assignable to parameter",
    whatWasTried: "Tried Express.Request, custom interface, NextRequest",
    recommendations: "Try NextAuth.js or create custom type with proper JWT payload"
  )
  
  await ralph_recordFailure(storyId: "story-42", contextFilePath: contextFile)
  
  execSync('git add prd.json progress/')
  execSync('git commit -m "track: Record failed attempt for story-42 (GPT-4.1)"')
  
  execSync('git checkout -- .')
}
```

### Example 2: Autonomous Orchestration

```
User: /ralph-orchestrate
```

The orchestrator will:
1. Loop through all incomplete stories
2. For each story:
   - Check attempt count
   - Use GPT-4.1 for attempts 1-3
   - Use Claude Sonnet 4.5 for attempts 4-6
   - Block after 6 failures
3. Generate final summary with:
   - Stories completed: 45
   - Stories blocked: 3
   - GPT-4.1 success rate: 38/42 (90%)
   - Claude success rate: 4/9 (44%)
   - Total cost optimization: ~90% solved with cheaper model

### Example 3: Adding a New Story

```typescript
// Auto-increment ID
await ralph_addPrd(
  title: "Add rate limiting to API endpoints",
  description: "Implement rate limiting middleware to prevent abuse",
  priority: "high",
  acceptanceCriteria: [
    "Rate limit of 100 requests per minute per IP",
    "Returns 429 status code when limit exceeded",
    "Configurable limits per endpoint",
    "Redis-based counter for distributed systems"
  ],
  dependencies: ["story-42"], // Depends on auth being complete
  info: "Use express-rate-limit package or implement custom middleware"
)
// Returns: "Successfully added story 'story-48' to prd.json"
```

### Example 4: Running Forever Loop

```bash
# Start dev server with auto-restart
bun run ralph-cli/tools/forever.ts bun run dev

# Output:
# [forever] Starting: bun run dev
# ... dev server runs ...
# [forever] Command exited with code: 1
# Restarting in 3... 
# Restarting in 2... 
# Restarting in 1... 
# [forever] Starting: bun run dev
```

### Example 5: Clone Multiple Repos

```bash
# Clone to ~/code/client-work/project1
bun run ralph-cli/tools/gclone.ts --dir client-work https://github.com/client/project1.git

# Clone to ~/code/client-work/project2
bun run ralph-cli/tools/gclone.ts --dir client-work https://github.com/client/project2.git

# Clone with custom name to ~/code/my-fork
bun run ralph-cli/tools/gclone.ts https://github.com/user/repo.git my-fork
```

---

## Progress Tracking

All story attempts (success or failure) are tracked in the `progress/` directory:

**File Naming:**
- Success: `progress/story-{id}_{timestamp}_success.md`
- Failure: `progress/story-{id}_{timestamp}_{issue-slug}.md`

**Issue Slug Examples:**
- `build-errors`
- `test-failures`
- `type-errors`
- `runtime-exception`

**Progress File Format (Success):**
```markdown
# Story {id}: {title}

**Status:** SUCCESS
**Model:** {model}
**Timestamp:** {timestamp}

## Summary
{what was implemented}

## Files Changed
{comma-separated list}

## Learnings
{key patterns, gotchas, best practices}

## Validation Results
Build: PASS
Tests: 12/12 PASS
```

**Progress File Format (Failure):**
```markdown
# Story {id}: {title} - FAILED

**Status:** FAILED
**Model:** {model}
**Timestamp:** {timestamp}

## Failure Reason
{one-line summary}

## What Was Attempted
{step-by-step narrative}

## Errors Encountered
```
{full error messages}
```

## What Was Tried
1. First attempt: {description} - {result}
2. Second attempt: {description} - {result}

## Learnings
{root cause analysis}

## Recommendations
{specific next steps for next attempt}
```

---

## Configuration

### settings.local.json

OpenCode-specific settings for Ralph CLI.

**Location:** `ralph-cli/settings.local.json`

**Content:**
```json
{
  "allowedTools": {
    "patterns": [
      "Bash(ralph find-next:*)",
      "Bash(ralph:*)"
    ]
  }
}
```

**Purpose:**
- Whitelists Ralph bash commands for OpenCode
- Allows Ralph tools to be invoked from agents

---

## Migration from Bash

**Status:** Bash version is DEPRECATED as of January 2026

**Action Required:**
1. Stop using `ralph.sh` or any bash aliases
2. Use TypeScript tools: `ralph-cli/tools/ralph.ts`
3. Update automation to call TypeScript versions
4. Remove references to `~/bashrc_dir/ralph/ralph.sh`

**See:** `MIGRATION.md` for detailed migration guide

**Timeline:**
- Now: Bash version frozen (security/compatibility fixes only)
- Soon: tmp/ compatibility wrappers removed
- Future: Full removal of bash version

---

## Summary

Ralph-CLI provides a complete autonomous development system with:

✅ **9 Core Story Management Functions**
- findNext, getDetails, getAttempts, markComplete, recordFailure, blockStory, isComplete, createProgress, addPrd

✅ **2 Utility Tools**
- forever (auto-restart)
- gclone (git clone wrapper)

✅ **2 AI Agents**
- ralph-gpt (GPT-4.1, cost-effective)
- ralph-claude (Claude Sonnet 4.5, high capability)

✅ **2 Slash Commands**
- /ralph (single story)
- /ralph-orchestrate (all stories)

✅ **Multi-Model Retry Strategy**
- 3 attempts GPT → 3 attempts Claude → Block

✅ **Comprehensive Progress Tracking**
- Success logs with learnings
- Failure context dumps for learning
- Git-tracked for full history

✅ **TypeScript-First Architecture**
- Type safety
- Better tooling
- Easier testing
- Modern async/await patterns

For questions or issues, see the main README.md or open a GitHub issue.
