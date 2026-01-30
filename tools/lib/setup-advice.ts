/**
 * Provide setup advice and validate repository configuration
 */

import { existsSync } from 'fs'
import { join } from 'path'

const CONFIG_FILENAME = 'ralph.config.json'

export interface SetupAdviceOptions {
  cwd?: string
}

/**
 * Check if the repository has a valid ralph.config.json file
 * Throws an error if the config file is missing
 */
export function validateConfig(cwd: string = process.cwd()): void {
  const configPath = join(cwd, CONFIG_FILENAME)

  if (!existsSync(configPath)) {
    throw new Error(
      `Repository is not configured for Ralph CLI.\n\n` +
      `Missing required file: ${CONFIG_FILENAME}\n\n` +
      `To set up this repository, create a ${CONFIG_FILENAME} file with:\n\n` +
      `{\n` +
      `  "$schema": "https://raw.githubusercontent.com/trillium/ralph-cli/main/ralph.config.schema.json",\n` +
      `  "activePrdFile": "active.prd.json",\n` +
      `  "archivePrdFile": "archive.prd.json"\n` +
      `}\n\n` +
      `Then create your PRD files (active.prd.json and optionally archive.prd.json).\n\n` +
      `Run ralph_setupAdvice() for detailed setup instructions.`
    )
  }
}

/**
 * Get setup advice for configuring a repository to use Ralph CLI
 *
 * @param options - Options including working directory
 * @returns Setup instructions as a formatted string
 *
 * @example
 * ```typescript
 * const advice = await getSetupAdvice()
 * console.log(advice)
 * ```
 */
export async function getSetupAdvice(
  options: SetupAdviceOptions = {}
): Promise<string> {
  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, CONFIG_FILENAME)
  const hasConfig = existsSync(configPath)

  const configStatus = hasConfig
    ? `✅ ${CONFIG_FILENAME} found`
    : `❌ ${CONFIG_FILENAME} missing`

  // Check for PRD files
  const activePrdPath = join(cwd, 'active.prd.json')
  const archivePrdPath = join(cwd, 'archive.prd.json')
  const hasActivePrd = existsSync(activePrdPath)
  const hasArchivePrd = existsSync(archivePrdPath)

  const activePrdStatus = hasActivePrd
    ? `✅ active.prd.json found`
    : `❌ active.prd.json missing`

  const archivePrdStatus = hasArchivePrd
    ? `✅ archive.prd.json found (optional)`
    : `ℹ️  archive.prd.json not found (optional)`

  const setupComplete = hasConfig && hasActivePrd

  return `
# Ralph CLI Setup Guide

## Current Status
${configStatus}
${activePrdStatus}
${archivePrdStatus}

${setupComplete ? '✅ Repository is properly configured!' : '⚠️  Setup incomplete - see instructions below'}

## Setup Instructions

### Step 1: Create ralph.config.json

Create a \`ralph.config.json\` file in your repository root.

**Simple config (single PRD):**
\`\`\`json
{
  "$schema": "https://raw.githubusercontent.com/trillium/ralph-cli/main/ralph.config.schema.json",
  "prdTypes": {
    "default": {
      "active": "active.prd.json",
      "archive": "archive.prd.json"
    }
  },
  "hierarchy": ["default"]
}
\`\`\`

**Multi-type config (multiple PRD buckets):**
\`\`\`json
{
  "$schema": "https://raw.githubusercontent.com/trillium/ralph-cli/main/ralph.config.schema.json",
  "prdTypes": {
    "default": {
      "active": "active.prd.json",
      "archive": "archive.prd.json"
    },
    "feature": {
      "active": "feature.active.prd.json",
      "archive": "feature.archive.prd.json"
    },
    "explore": {
      "active": "explore.active.prd.json",
      "archive": "explore.archive.prd.json"
    }
  },
  "hierarchy": ["default", "feature", "explore"]
}
\`\`\`

The **hierarchy** array determines the order in which PRD types are checked.
Stories from "default" will be worked on first, then "feature", then "explore".

### Step 2: Create your PRD file(s)

Create PRD files for each type defined in your config:

\`\`\`json
{
  "projectName": "Your Project Name",
  "stories": [
    {
      "id": "story-1",
      "title": "Example Story",
      "description": "Description of what needs to be done",
      "priority": "high",
      "passes": false,
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "dependencies": []
    }
  ]
}
\`\`\`

### Step 3: (Optional) Create archive files

Create archive files for completed stories (one per PRD type):

\`\`\`json
{
  "projectName": "Your Project Name - Archive",
  "stories": []
}
\`\`\`

## Available Tools

Once configured, you can use these Ralph CLI tools:

- **ralph_findNext** - Find the next available story to work on
- **ralph_getDetails** - Get full details for a specific story
- **ralph_getAttempts** - Get previous attempt files for a story
- **ralph_markComplete** - Mark a story as complete (moves to archive)
- **ralph_recordFailure** - Record a failed attempt
- **ralph_blockStory** - Block a story after too many failures
- **ralph_isComplete** - Check if all stories are done
- **ralph_createProgress** - Create a progress file for an attempt
- **ralph_createFailure** - Quick error documentation
- **ralph_error** - Create a GitHub issue for errors
- **ralph_suggest** - Create a GitHub issue for suggestions
- **ralph_addPrd** - Add a new story to the PRD

## Environment Variables (Optional)

You can override config file settings with environment variables:

- \`RALPH_PRD_FILE_ACTIVE\` - Path to active PRD file
- \`RALPH_PRD_FILE_ARCHIVE\` - Path to archive PRD file

## Need Help?

- Documentation: https://github.com/trillium/ralph-cli
- Issues: https://github.com/trillium/ralph-cli/issues
`.trim()
}
