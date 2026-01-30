/**
 * Ralph CLI - Autonomous Development Loop System
 * Pure TypeScript implementation (no bash dependencies)
 */

import { tool } from '@opencode-ai/plugin'
import path from 'path'

// Import all the modular implementations
import { findNextStory } from './lib/find-next'
import { getStoryDetails } from './lib/get-details'
import { getStoryAttempts } from './lib/get-attempts'
import { recordStoryFailure } from './lib/record-failure'
import { blockStory as blockStoryImpl } from './lib/block-story'
import { checkIsComplete } from './lib/is-complete'
import { createProgressFile } from './lib/create-progress'
import { createFailureDocument } from './lib/create-failure'
import { createErrorIssue } from './lib/create-error'
import { markStoryComplete } from './lib/mark-complete'
import type { ProgressOptions } from './lib/create-progress'

// Import shared utilities
import {
  resolvePrdFile,
  readPrdFile,
  writePrdFile,
  findStoryById,
  resolveArchiveFile,
} from './lib/prd-utils'

export const findNext = tool({
  description:
    'Find the next available story to work on (respects dependencies and priority). Returns full story details including attemptCount and previousAttempts array.',
  args: {
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await findNextStory({ prdFile: args.prdFile })
  },
})

export const getDetails = tool({
  description:
    'Get full details for a specific story ID including acceptance criteria, dependencies, attemptCount, and previousAttempts array',
  args: {
    storyId: tool.schema
      .string()
      .describe("Story ID to get details for (e.g., 'story-1')"),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await getStoryDetails({
      storyId: args.storyId,
      prdFile: args.prdFile,
    })
  },
})

export const getAttempts = tool({
  description:
    'Get list of previous attempt file paths for a specific story ID from attempts array',
  args: {
    storyId: tool.schema
      .string()
      .describe("Story ID to get attempts for (e.g., 'story-1')"),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await getStoryAttempts({
      storyId: args.storyId,
      prdFile: args.prdFile,
    })
  },
})

export const markComplete = tool({
  description:
    'Mark a story as complete. Automatically moves to archive if RALPH_PRD_FILE_ARCHIVE env var is set or archive.prd.json exists, otherwise marks passes=true in place.',
  args: {
    storyId: tool.schema
      .string()
      .describe("Story ID to mark complete (e.g., 'story-1')"),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'"
      ),
    archiveFile: tool.schema
      .string()
      .optional()
      .describe(
        "Archive file to move completed story to (e.g., 'archive.prd.json'). If not provided, uses RALPH_PRD_FILE_ARCHIVE env var or auto-detects archive.prd.json"
      ),
  },
  async execute(args) {
    return await markStoryComplete({
      storyId: args.storyId,
      prdFile: args.prdFile,
      archiveFile: args.archiveFile,
    })
  },
})

export const recordFailure = tool({
  description:
    "Record a failed attempt by adding context file to story's attempts array",
  args: {
    storyId: tool.schema.string().describe("Story ID (e.g., 'story-30')"),
    contextFilePath: tool.schema
      .string()
      .describe(
        "Path to context dump file (e.g., 'progress/story-30_2026-01-26_143022_issue.md')"
      ),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await recordStoryFailure({
      storyId: args.storyId,
      contextFilePath: args.contextFilePath,
      prdFile: args.prdFile,
    })
  },
})

export const blockStory = tool({
  description: 'Mark a story as blocked after exceeding max attempts (6)',
  args: {
    storyId: tool.schema
      .string()
      .describe("Story ID to block (e.g., 'story-30')"),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await blockStoryImpl({
      storyId: args.storyId,
      prdFile: args.prdFile,
    })
  },
})

export const isComplete = tool({
  description: 'Check if all stories in PRD are complete',
  args: {
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to check (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    return await checkIsComplete({ prdFile: args.prdFile })
  },
})

export const createProgress = tool({
  description:
    'Create a progress file (success log or failure context dump) for a story attempt',
  args: {
    storyId: tool.schema.string().describe("Story ID (e.g., 'story-30')"),
    status: tool.schema.string().describe("'success' or 'failure'"),
    model: tool.schema
      .string()
      .describe("Model used (e.g., 'gpt-4.1' or 'claude-sonnet-4.5')"),

    // Success fields
    summary: tool.schema
      .string()
      .optional()
      .describe('Brief description of what was implemented (success only)'),
    filesChanged: tool.schema
      .string()
      .optional()
      .describe('Comma-separated list of files changed (success only)'),
    learnings: tool.schema
      .string()
      .optional()
      .describe('Key patterns or learnings (success only)'),
    validationResults: tool.schema
      .string()
      .optional()
      .describe('Validation results (success only)'),

    // Failure fields
    failureReason: tool.schema
      .string()
      .optional()
      .describe('One-line failure summary (failure only)'),
    whatAttempted: tool.schema
      .string()
      .optional()
      .describe('Step-by-step narrative (failure only)'),
    errorsEncountered: tool.schema
      .string()
      .optional()
      .describe('Full error messages (failure only)'),
    whatWasTried: tool.schema
      .string()
      .optional()
      .describe('Each fix attempt and result (failure only)'),
    recommendations: tool.schema
      .string()
      .optional()
      .describe('Next steps to try (failure only)'),
  },
  async execute(args) {
    const options: ProgressOptions = {
      storyId: args.storyId,
      status: args.status as 'success' | 'failure',
      model: args.model,
      summary: args.summary,
      filesChanged: args.filesChanged,
      learnings: args.learnings,
      validationResults: args.validationResults,
      failureReason: args.failureReason,
      whatAttempted: args.whatAttempted,
      errorsEncountered: args.errorsEncountered,
      whatWasTried: args.whatWasTried,
      recommendations: args.recommendations,
    }

    return await createProgressFile(options)
  },
})

/**
 * Create a failure document when an agent encounters an error
 *
 * This is a simplified tool for agents to quickly document failures without
 * needing to provide all the detailed fields required by createProgress.
 */
export const createFailure = tool({
  description:
    'Create a failure document for a story when encountering an error. Simpler alternative to createProgress for quick error reporting.',
  args: {
    storyId: tool.schema.string().describe("Story ID (e.g., 'story-30')"),
    error: tool.schema
      .string()
      .describe(
        'The error message or description of what went wrong (e.g., "Build failed with 5 TypeScript errors")'
      ),
    context: tool.schema
      .string()
      .optional()
      .describe(
        'Additional context about what was happening when the error occurred (optional)'
      ),
    attempted: tool.schema
      .string()
      .optional()
      .describe('What was attempted before the error occurred (optional)'),
    model: tool.schema
      .string()
      .optional()
      .describe(
        "Model that encountered the error (e.g., 'claude-sonnet-4.5'). Defaults to 'unknown'"
      ),
  },
  async execute(args) {
    return await createFailureDocument({
      storyId: args.storyId,
      error: args.error,
      context: args.context,
      attempted: args.attempted,
      model: args.model,
    })
  },
})

/**
 * Create a GitHub issue for an error encountered during story execution
 *
 * This tool uses the gh CLI to automatically create a GitHub issue
 * with the error details, context, and what was attempted.
 */
export const error = tool({
  description:
    'Create a GitHub issue for an error encountered during story execution. Uses gh CLI to automatically spawn an issue in the repository.',
  args: {
    storyId: tool.schema.string().describe("Story ID (e.g., 'story-30')"),
    error: tool.schema
      .string()
      .describe('The error message or description of what went wrong'),
    context: tool.schema
      .string()
      .optional()
      .describe(
        'Additional context about what was happening when the error occurred (optional)'
      ),
    attempted: tool.schema
      .string()
      .optional()
      .describe('What was attempted before the error occurred (optional)'),
  },
  async execute(args) {
    return await createErrorIssue({
      storyId: args.storyId,
      error: args.error,
      context: args.context,
      attempted: args.attempted,
    })
  },
})

/**
 * Add a new PRD entry to the active PRD file.
 *
 * This tool validates the PRD entry structure, checks for duplicate IDs,
 * and atomically writes the updated PRD file.
 *
 * If no ID is provided, the tool automatically determines the next available
 * story ID by finding the highest numeric story ID and incrementing it.
 */
export const addPrd = tool({
  description:
    'Add a new PRD entry with validation and duplicate checking. Auto-increments story ID if not provided. Supports custom PRD files (e.g., active.prd.json)',
  args: {
    id: tool.schema
      .string()
      .optional()
      .describe(
        "Unique story ID (e.g., 'story-48'). If not provided, auto-increments from highest existing ID."
      ),
    title: tool.schema.string().describe('Story title'),
    description: tool.schema
      .string()
      .describe('Detailed description of the story'),
    priority: tool.schema
      .enum(['critical', 'high', 'medium', 'low'])
      .describe('Story priority level'),
    acceptanceCriteria: tool.schema
      .array(tool.schema.string())
      .describe('Array of acceptance criteria strings'),
    dependencies: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe('Array of story IDs this story depends on (optional)'),
    info: tool.schema
      .string()
      .optional()
      .describe('Optional additional context or notes'),
    info2: tool.schema
      .string()
      .optional()
      .describe('Optional additional context or notes (second field)'),
    prdFile: tool.schema
      .string()
      .optional()
      .describe(
        "PRD file to add story to (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'"
      ),
  },
  async execute(args) {
    try {
      // Determine PRD file path
      const prdPath = await resolvePrdFile({ prdFile: args.prdFile })
      const prd = await readPrdFile(prdPath)

      // Auto-increment ID if not provided
      let storyId = args.id
      if (!storyId) {
        // Find highest numeric story ID
        const numericIds = prd.stories
          .map((s: any) => s.id)
          .filter((id: string) => /^story-\d+$/.test(id))
          .map((id: string) => parseInt(id.replace('story-', ''), 10))

        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0
        const nextId = maxId + 1
        storyId = `story-${nextId}`
      }

      // Check for duplicate ID
      const existingStory = findStoryById(prd, storyId)
      if (existingStory) {
        const prdFile = args.prdFile || path.basename(prdPath)
        throw new Error(
          `Story with id '${storyId}' already exists in ${prdFile}`
        )
      }

      // Validate dependencies exist (check both active and archive)
      if (args.dependencies && args.dependencies.length > 0) {
        const existingIds = new Set(prd.stories.map((s: any) => s.id))

        // Check archive for missing dependencies
        const missingDeps: string[] = []
        for (const dep of args.dependencies) {
          if (!existingIds.has(dep)) {
            // Not in active, check archive
            const archivePath = await resolveArchiveFile({})
            let foundInArchive = false

            if (archivePath) {
              try {
                const archivePrd = await readPrdFile(archivePath)
                const archivedStory = findStoryById(archivePrd, dep)
                if (archivedStory) {
                  foundInArchive = true
                }
              } catch {
                // Archive doesn't exist or can't be read
              }
            }

            if (!foundInArchive) {
              missingDeps.push(dep)
            }
          }
        }

        if (missingDeps.length > 0) {
          const prdFile = args.prdFile || path.basename(prdPath)
          throw new Error(
            `Invalid dependencies: ${missingDeps.join(', ')} do not exist in ${prdFile} or archive`
          )
        }
      }

      // Create new PRD entry
      const newStory = {
        id: storyId,
        title: args.title,
        description: args.description,
        priority: args.priority,
        passes: false,
        ...(args.info && { info: args.info }),
        ...(args.info2 && { info2: args.info2 }),
        acceptanceCriteria: args.acceptanceCriteria,
        dependencies: args.dependencies || [],
      }

      // Add to stories array
      prd.stories.push(newStory)

      // Write atomically
      await writePrdFile(prdPath, prd)

      const prdFile = args.prdFile || path.basename(prdPath)
      return `Successfully added story '${storyId}' to ${prdFile}`
    } catch (error: any) {
      throw new Error(`Failed to add PRD entry: ${error.message}`)
    }
  },
})
