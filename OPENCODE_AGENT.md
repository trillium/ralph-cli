# Ralph-CLI Setup Guide for OpenCode Agents

This guide explains how to access Ralph-CLI tools in your own OpenCode environment.

---

## What is Ralph-CLI?

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

## Quick Start

### Option 1: Use Ralph-CLI from a Sibling Directory (Recommended)

If Ralph-CLI is in a sibling directory or monorepo:

**1. Ensure Ralph-CLI exists at the path:**

```
/parent-directory/
  ├── ralph-cli/          # The Ralph-CLI source
  │   └── tools/
  │       └── ralph.ts
  └── your-project/       # Your project
      └── .opencode/
          └── tools/
              └── ralph.ts
```

**2. Create `.opencode/tools/ralph.ts` with relative path:**

```typescript
// Re-export from sibling directory
export * from '../../../ralph-cli/tools/ralph'
```

**Adjust the path** based on your directory structure. The key is that the path resolves to `ralph-cli/tools/ralph.ts`.

### Option 2: Copy Ralph-CLI into Your Project

If you want Ralph-CLI embedded in your project:

**1. Copy the ralph-cli directory:**

```bash
cd /path/to/your/project
cp -r /path/to/ralph-cli ./ralph-cli
cd ralph-cli
bun install  # or npm install
```

**2. Create `.opencode/tools/ralph.ts` to re-export:**

```typescript
// Re-export from local ralph-cli directory
export * from '../../ralph-cli/tools/ralph'
```

---

## Key Concept: Tool Re-Exports

**You DON'T need to copy or duplicate Ralph-CLI code.** You only need to create **re-export files** in your `.opencode/tools/` directory that point to where Ralph-CLI is located.

The re-export pattern:

```typescript
// .opencode/tools/ralph.ts
export * from '<path-to-ralph-cli>/tools/ralph'
```

This makes all Ralph tools discoverable by OpenCode without duplicating any code.

---

## Setting Up Agents and Commands

Ralph-CLI provides agent and command definitions that you need to copy into your `.opencode/` directory.

### Agents (Required for /ralph slash commands)

Copy the agent definitions from Ralph-CLI to your project:

```bash
# Create the agents directory
mkdir -p .opencode/agents

# Copy agent files from Ralph-CLI
cp <path-to-ralph-cli>/agents/ralph-gpt.md .opencode/agents/
cp <path-to-ralph-cli>/agents/ralph-claude.md .opencode/agents/
```

**Example paths:**

- If Ralph-CLI is at `./ralph-cli/`: `cp ralph-cli/agents/*.md .opencode/agents/`
- If Ralph-CLI is at `../../ralph-cli/`: `cp ../../ralph-cli/agents/*.md .opencode/agents/`

These agents define the workflows for executing stories using GPT-4.1 and Claude Sonnet 4.5.

### Commands (Required for slash commands)

Copy the slash command definitions:

```bash
# Create the commands directory
mkdir -p .opencode/commands

# Copy command files from Ralph-CLI
cp <path-to-ralph-cli>/commands/ralph.md .opencode/commands/
cp <path-to-ralph-cli>/commands/ralph-orchestrate.md .opencode/commands/
```

This enables the `/ralph` and `/ralph-orchestrate` slash commands in your OpenCode environment.

### Your Final `.opencode/` Structure

```
your-project/
└── .opencode/
    ├── tools/              # Re-export Ralph tools
    │   └── ralph.ts        # export * from 'ralph-cli/tools/ralph'
    ├── agents/             # Copy from Ralph-CLI
    │   ├── ralph-gpt.md
    │   └── ralph-claude.md
    └── commands/           # Copy from Ralph-CLI
        ├── ralph.md
        └── ralph-orchestrate.md
```

---

## Available Tools

Once set up, you'll have access to these tools in OpenCode:

### Story Management Tools

All tools support optional `prdFile` parameter to specify which PRD file to use (e.g., `"active.prd.json"`). Defaults to `RALPH_PRD_FILE` env var or `"prd.json"`.

- `ralph_findNext({ prdFile? })` - Find the next available story to work on
- `ralph_getDetails({ storyId, prdFile? })` - Get full story details and acceptance criteria
- `ralph_getAttempts({ storyId, prdFile? })` - Get list of previous failed attempt files
- `ralph_markComplete({ storyId, prdFile?, archiveFile? })` - Mark complete (optionally move to archive)
- `ralph_recordFailure({ storyId, contextFilePath, prdFile? })` - Record a failed attempt
- `ralph_blockStory({ storyId, prdFile? })` - Block a story after max attempts (6)
- `ralph_isComplete({ prdFile? })` - Check if all stories are complete
- `ralph_createProgress(args)` - Create success log or failure context dump
- `ralph_addPrd({ title, description, priority, acceptanceCriteria, prdFile?, ... })` - Add new story

**Key Parameters:**

- `prdFile` - Which PRD file to operate on (e.g., `"active.prd.json"`)
- `archiveFile` - Where to move completed stories (e.g., `"archive.prd.json"`)

**Environment Variable:**
Set `RALPH_PRD_FILE=active.prd.json` to change the default for all tools.

---

## PRD File Structure

Ralph supports two PRD file workflows:

### Option 1: Single PRD File (prd.json)

Create a `prd.json` file in your project root. Stories are marked `passes: true` when complete but remain in the file:

```json
{
  "project": "Your Project Name",
  "description": "Brief description of your project",
  "critical_requirements": ["Important constraint 1", "Important constraint 2"],
  "stories": [
    {
      "id": "story-1",
      "title": "Story title",
      "description": "Detailed description of what needs to be implemented",
      "priority": "critical",
      "passes": false,
      "acceptanceCriteria": [
        "Criterion 1 that must be met",
        "Criterion 2 that must be met"
      ],
      "dependencies": [],
      "attempts": []
    }
  ]
}
```

**Priority Levels:**

- `critical` - Highest priority
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority

**Story Fields:**

- `id` - Unique story identifier (e.g., "story-1", "story-2")
- `title` - Short descriptive title
- `description` - Detailed explanation of requirements
- `priority` - Priority level (critical/high/medium/low)
- `passes` - Boolean indicating if story is complete (auto-managed by Ralph)
- `acceptanceCriteria` - Array of criteria that must be met
- `dependencies` - Array of story IDs that must be complete first
- `attempts` - Array of failure context file paths (auto-managed by Ralph)
- `completedAt` (optional) - ISO timestamp when story was completed (auto-added)
- `info` (optional) - Additional context or notes
- `info2` (optional) - More additional context

### Option 2: Active + Archive Workflow (active.prd.json + archive.prd.json)

**Recommended for projects with many stories.** Use two files to keep active work separate from completed stories:

**active.prd.json** - Contains stories being worked on:

```json
{
  "project": "Your Project Name",
  "description": "Active stories in progress",
  "stories": [
    {
      "id": "story-5",
      "title": "Add user authentication",
      "description": "Implement JWT-based auth",
      "priority": "high",
      "passes": false,
      "acceptanceCriteria": ["Users can login", "JWT tokens generated"],
      "dependencies": [],
      "attempts": []
    }
  ]
}
```

**archive.prd.json** - Contains completed stories (auto-populated):

```json
{
  "project": "Your Project Name",
  "description": "Completed stories archive",
  "stories": [
    {
      "id": "story-1",
      "title": "Database schema",
      "description": "Set up PostgreSQL schema",
      "priority": "critical",
      "passes": true,
      "completedAt": "2026-01-28T10:30:00.000Z",
      "acceptanceCriteria": ["Schema created", "Migrations work"],
      "dependencies": []
    }
  ]
}
```

**How it works:**

- Add new stories to `active.prd.json`
- When a story is marked complete with `archiveFile` parameter, it's **moved** from active to archive
- Keeps your active PRD clean and focused

**Configure via environment variable:**

```bash
export RALPH_PRD_FILE=active.prd.json
```

Or specify in each tool call:

```typescript
ralph_findNext({ prdFile: 'active.prd.json' })
ralph_markComplete({
  storyId: 'story-5',
  prdFile: 'active.prd.json',
  archiveFile: 'archive.prd.json',
})
```

---

## Usage: Slash Commands

### `/ralph` - Execute One Story

Run a single Ralph iteration using GPT-4.1:

```
/ralph
```

This will:

1. Find the next available story
2. Read previous attempts (if any)
3. Implement the story
4. Validate with build/tests
5. Commit on success or create failure context on failure

### `/ralph-orchestrate` - Execute All Stories

Run the full autonomous loop with multi-model retry:

```
/ralph-orchestrate
```

This will:

1. Loop through ALL incomplete stories
2. Use GPT-4.1 for attempts 1-3
3. Use Claude Sonnet 4.5 for attempts 4-6
4. Block stories that fail 6 times
5. Generate final summary with statistics

---

## Agent Definitions

### ralph-gpt (GPT-4.1)

Used for attempts 1-3. Fast and cost-effective for most tasks.

**Agent file:** `.opencode/agents/ralph-gpt.md`

**Workflow:**

1. Find next story
2. Get details and check for previous attempts
3. Learn from failures
4. Implement story
5. Validate (build + tests)
6. On success: Commit, mark complete, create progress log
7. On failure: Create context dump, record failure, revert code

### ralph-claude (Claude Sonnet 4.5)

Used for attempts 4-6. Higher capability for complex problems.

**Agent file:** `.opencode/agents/ralph-claude.md`

**Workflow:**
Same as ralph-gpt, but with emphasis on:

- Analyzing why GPT-4.1 failed
- Trying fundamentally different approaches
- More thorough error analysis

---

## Progress Tracking

Ralph creates progress files in a `progress/` directory:

**Success files:**

```
progress/story-{id}_{timestamp}_success.md
```

**Failure files:**

```
progress/story-{id}_{timestamp}_{issue-slug}.md
```

**Issue slug examples:**

- `build-errors`
- `test-failures`
- `type-errors`
- `runtime-exception`

These files contain:

- What was attempted
- What succeeded/failed
- Error messages
- Learnings
- Recommendations for next attempt

---

## Example Workflow

### Adding a Story Programmatically

```typescript
// Add to default prd.json
await ralph_addPrd({
  title: 'Add user authentication',
  description: 'Implement JWT-based auth with bcrypt password hashing',
  priority: 'high',
  acceptanceCriteria: [
    'Users can register with email/password',
    'Passwords are hashed with bcrypt',
    'JWT tokens are generated on login',
    'Protected routes require valid JWT',
  ],
  dependencies: ['story-5'], // Requires story-5 to be complete first
  info: 'Use express-jwt or next-auth',
})
// Returns: "Successfully added story 'story-6' to prd.json"

// Add to active.prd.json
await ralph_addPrd({
  title: 'Add rate limiting',
  description: 'Prevent API abuse with rate limiting',
  priority: 'medium',
  acceptanceCriteria: [
    '100 requests per minute per IP',
    'Returns 429 when exceeded',
  ],
  prdFile: 'active.prd.json',
})
// Returns: "Successfully added story 'story-7' to active.prd.json"
```

### Active + Archive Workflow Example

```typescript
// Set environment variable for all tools
process.env.RALPH_PRD_FILE = 'active.prd.json'

// 1. Find next story from active.prd.json
const nextStory = await ralph_findNext()
// Returns: "high story-6 Add user authentication"

// 2. Get details
const details = await ralph_getDetails({ storyId: 'story-6' })

// 3. Implement the story...
// ...

// 4. On success, move to archive
await ralph_markComplete({
  storyId: 'story-6',
  prdFile: 'active.prd.json',
  archiveFile: 'archive.prd.json',
})
// Story is removed from active.prd.json and added to archive.prd.json
// Returns: "Successfully moved story 'story-6' from active.prd.json to archive.prd.json"

// The archived story will have:
// - passes: true
// - completedAt: "2026-01-28T10:30:00.000Z" (auto-added timestamp)
```

### Manual Story Execution (Single PRD File)

```typescript
// 1. Find next story
const nextStory = await ralph_findNext()
// Returns: "high story-6 Add user authentication"

// 2. Get details
const details = await ralph_getDetails({ storyId: 'story-6' })
console.log(details.acceptanceCriteria)
console.log(details.attempts) // Previous failure context files

// 3. Read previous attempts to learn
if (details.attempts?.length > 0) {
  for (const attemptFile of details.attempts) {
    // Read the file to understand what was tried and why it failed
    // This prevents repeating the same mistakes
  }
}

// 4. Implement the story (your code here)
// ...

// 5. Validate
const buildResult = await runBuild()
const testResult = await runTests()

// 6a. On success
if (buildResult.success && testResult.success) {
  // Commit implementation
  await gitCommit('feat: story-6 - Add user authentication')

  // Mark complete
  await ralph_markComplete({ storyId: 'story-6' })

  // Commit PRD update
  await gitCommit('chore: Mark story-6 complete')

  // Create success log
  await ralph_createProgress({
    storyId: 'story-6',
    status: 'success',
    model: 'gpt-4.1',
    summary: 'Implemented JWT auth with bcrypt',
    filesChanged: 'api/auth.ts, middleware/jwt.ts',
    learnings: 'Use zod for validation, bcrypt rounds=10',
    validationResults: 'Build: PASS, Tests: 15/15 PASS',
  })
}

// 6b. On failure
else {
  // Create failure context
  const contextFile = await ralph_createProgress({
    storyId: 'story-6',
    status: 'failure',
    model: 'gpt-4.1',
    failureReason: 'Type errors in JWT middleware',
    whatAttempted: 'Created JWT middleware with Express types',
    errorsEncountered: "TS2345: Type 'Request' not assignable...",
    whatWasTried: 'Tried Express.Request, custom interface, NextRequest',
    recommendations: 'Use NextAuth.js or custom type definition',
  })

  // Record failure
  await ralph_recordFailure({
    storyId: 'story-6',
    contextFilePath: contextFile,
  })

  // Commit PRD update
  await gitCommit('track: Record failed attempt for story-6')

  // Revert code changes
  await gitCheckout('-- .')
}
```

---

## Build and Test Commands

Ralph needs to know how to validate your code. Configure these in your `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "test": "vitest run",
    "lint": "eslint ."
  }
}
```

Ralph will run:

- `bun run build` (or `npm run build`)
- `bun test` (or `npm test`)

Ensure these commands:

- Exit with code 0 on success
- Exit with non-zero code on failure
- Print clear error messages

---

## Directory Structure in Your Project

After setup, your project should look like:

```
your-project/
├── ralph-cli/              # Ralph CLI source code
│   ├── tools/
│   │   └── ralph.ts        # Main story management tools
│   ├── agents/
│   │   ├── ralph-gpt.md
│   │   └── ralph-claude.md
│   ├── commands/
│   │   ├── ralph.md
│   │   └── ralph-orchestrate.md
│   ├── README.md
│   ├── RALPH-OVERVIEW.md
│   └── package.json
├── .opencode/              # OpenCode configuration
│   ├── tools/
│   │   └── ralph.ts        # Re-export: export * from '../../ralph-cli/tools/ralph'
│   ├── agents/
│   │   ├── ralph-gpt.md    # Copied from ralph-cli/agents/
│   │   └── ralph-claude.md # Copied from ralph-cli/agents/
│   └── commands/
│       ├── ralph.md              # Copied from ralph-cli/commands/
│       └── ralph-orchestrate.md  # Copied from ralph-cli/commands/
├── progress/               # Auto-created by Ralph
│   ├── story-1_2026-01-28_120000_success.md
│   ├── story-2_2026-01-28_130000_build-errors.md
│   └── ...
├── prd.json                # Single PRD file (Option 1)
├── active.prd.json         # Active stories (Option 2)
├── archive.prd.json        # Completed stories (Option 2)
└── package.json            # Your project config
```

---

## Important Configuration Notes

### 1. Configuring PRD File Location

Ralph supports multiple PRD file configurations:

**Method 1: Environment Variable (Recommended)**

```bash
# In your shell or .env file
export RALPH_PRD_FILE=active.prd.json
```

**Method 2: Per-Tool Parameter**

```typescript
// Specify for each tool call
ralph_findNext({ prdFile: 'active.prd.json' })
ralph_addPrd({
  title: 'My story',
  prdFile: 'active.prd.json',
  // ... other fields
})
```

**Method 3: Default (prd.json)**
If neither environment variable nor parameter is set, defaults to `prd.json`.

### 2. Archive Workflow Setup

To enable the active→archive workflow:

1. Create `active.prd.json` with your active stories
2. Create `archive.prd.json` (can be empty initially):
   ```json
   {
     "project": "Your Project",
     "description": "Archived completed stories",
     "stories": []
   }
   ```
3. Set environment variable: `export RALPH_PRD_FILE=active.prd.json`
4. When marking complete, use both parameters:
   ```typescript
   ralph_markComplete({
     storyId: 'story-X',
     prdFile: 'active.prd.json',
     archiveFile: 'archive.prd.json',
   })
   ```

**Benefits:**

- Clean separation of active vs. completed work
- Faster lookups (smaller active file)
- Historical record of all completed work
- Can review archive for patterns and learnings

### 3. Ralph Script Path

The current implementation references a bash script at `~/bashrc_dir/ralph/ralph.sh`. You have two options:

**Option A: Use the TypeScript version directly (Recommended)**

Modify `.opencode/tools/ralph.ts` to use the TypeScript implementation directly instead of calling bash. This is the future-proof approach since the bash version is deprecated.

**Option B: Set up the bash compatibility layer**

If you need the bash version, ensure `~/bashrc_dir/ralph/ralph.sh` exists and is accessible. However, this is deprecated and will be removed in future versions.

### 2. Working Directory

Ralph operates in the current working directory (`process.cwd()`). Always run Ralph commands from your project root where `prd.json` exists.

### 3. Git Repository

Ralph requires your project to be a git repository. Initialize if needed:

```bash
git init
git add .
git commit -m "Initial commit"
```

---

## Tips for Success

### 1. Write Clear Acceptance Criteria

Good acceptance criteria are:

- Specific and measurable
- Testable (can be validated by build/tests)
- Complete (cover all requirements)

**Good example:**

```json
"acceptanceCriteria": [
  "User can submit email and password via POST /api/auth/register",
  "Password is hashed using bcrypt before storage",
  "Endpoint returns 400 if email is invalid",
  "Endpoint returns 409 if email already exists",
  "Database stores userId, email, hashedPassword"
]
```

**Bad example:**

```json
"acceptanceCriteria": [
  "Auth should work",
  "Make it secure"
]
```

### 2. Use Dependencies Wisely

Order stories so that:

- Foundation stories come first (no dependencies)
- Feature stories depend on foundation
- Integration stories depend on features

Example:

```
story-1: Database schema (no dependencies)
story-2: User model (depends on story-1)
story-3: Auth endpoints (depends on story-2)
story-4: Protected routes (depends on story-3)
```

### 3. Monitor Progress Files

Read the `progress/` directory regularly to:

- Understand what's being tried
- Learn from failures
- Identify patterns in errors
- Decide when to intervene manually

### 4. Block Stories Appropriately

If a story is blocked after 6 attempts:

1. Read all attempt context files
2. Identify the root cause
3. Consider if the story is:
   - Too vague (rewrite acceptance criteria)
   - Too large (split into smaller stories)
   - Technically impossible (reconsider approach)
4. Fix the issue manually or rewrite the story
5. Remove the "blocked" flag and retry

---

## Troubleshooting

### "Invalid project directory provided"

Ensure you're running from the project root where `prd.json` exists.

### "Story with id 'X' not found"

Check that the story exists in `prd.json` and the ID is spelled correctly.

### "Invalid dependencies: story-X does not exist"

Dependencies must be created before dependent stories. Add the dependency story first.

### Build/Test Failures

Ralph will retry validation 2 times. If it keeps failing:

- Check error messages in progress files
- Verify build command works manually
- Ensure test framework is configured correctly

### Tools Not Found

Verify:

- `.opencode/tools/` contains re-export files
- Re-export syntax is correct: `export * from '../../ralph-cli/tools/ralph'`
- Ralph-CLI dependencies are installed

---

## Advanced Usage

### Custom Build/Test Commands

If your project uses different commands, Ralph will still call `bun run build` and `bun test`. Add scripts to `package.json` that call your actual commands:

```json
{
  "scripts": {
    "build": "tsc && webpack --mode production",
    "test": "jest --ci"
  }
}
```

### Multiple Environments

For projects with multiple environments (dev/staging/prod), use info fields:

```json
{
  "id": "story-10",
  "title": "Deploy to staging",
  "info": "Environment: staging",
  "info2": "Deploy target: https://staging.example.com"
}
```

### Custom Validation

Add custom validation to acceptance criteria:

```json
"acceptanceCriteria": [
  "API returns 200 status",
  "Response time < 100ms",
  "Load test passes 1000 req/s",
  "Lighthouse score > 90"
]
```

---

## Migration from Bash Version

If you're migrating from the old bash-based Ralph:

1. **Stop using `ralph.sh`** - It's deprecated
2. **Use TypeScript tools** - All functionality is in `ralph-cli/tools/ralph.ts`
3. **Update automation** - Change scripts to use new TypeScript CLI
4. **Remove bash dependencies** - Clean up `~/bashrc_dir/ralph/` references

See `ralph-cli/MIGRATION.md` for detailed migration guide.

---

## Getting Help

For comprehensive documentation:

- `ralph-cli/README.md` - Quick start and overview
- `ralph-cli/RALPH-OVERVIEW.md` - Complete function reference (966 lines!)
- `ralph-cli/MIGRATION.md` - Migration from bash to TypeScript

For issues or questions:

- Check existing progress files for context
- Read the RALPH-OVERVIEW.md function reference
- Review example workflows in RALPH-OVERVIEW.md
- Open an issue on the Ralph-CLI repository

---

## Summary Checklist

To set up Ralph-CLI in your OpenCode environment:

- [ ] Copy `ralph-cli/` directory to your project
- [ ] Run `bun install` in `ralph-cli/`
- [ ] Create `.opencode/tools/` with re-export files
- [ ] Copy agent definitions to `.opencode/agents/`
- [ ] Copy slash commands to `.opencode/commands/`
- [ ] Create `prd.json` with your stories
- [ ] Configure build/test scripts in `package.json`
- [ ] Initialize git repository if needed
- [ ] Test with `/ralph` command
- [ ] Run full loop with `/ralph-orchestrate`

You're now ready to use autonomous Ralph development loops! 🚀
