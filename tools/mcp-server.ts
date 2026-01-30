#!/usr/bin/env node
/**
 * Ralph CLI - MCP Server Implementation
 *
 * This server exposes all ralph-cli tools via the Model Context Protocol (MCP),
 * making them accessible to Claude Code, OpenCode, and other MCP-compatible clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

// Import all the modular implementations (core logic)
import { findNextStory } from './lib/find-next.js'
import { getStoryDetails } from './lib/get-details.js'
import { getStoryAttempts } from './lib/get-attempts.js'
import { recordStoryFailure } from './lib/record-failure.js'
import { blockStory as blockStoryImpl } from './lib/block-story.js'
import { checkIsComplete } from './lib/is-complete.js'
import { createProgressFile } from './lib/create-progress.js'
import { createFailureDocument } from './lib/create-failure.js'
import { markStoryComplete } from './lib/mark-complete.js'
import type { ProgressOptions } from './lib/create-progress.js'
import { resolvePrdFile, readPrdFile, writePrdFile, findStoryById, resolveArchiveFile } from './lib/prd-utils.js'
import path from 'path'

// Create MCP server instance
const server = new Server(
  {
    name: 'ralph-cli',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ralph_findNext',
        description: 'Find the next available story to work on (respects dependencies and priority). Returns full story details including attemptCount and previousAttempts array.',
        inputSchema: {
          type: 'object',
          properties: {
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'",
            },
          },
        },
      },
      {
        name: 'ralph_getDetails',
        description: 'Get full details for a specific story ID including acceptance criteria, dependencies, attemptCount, and previousAttempts array',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID to get details for (e.g., 'story-1')",
            },
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'",
            },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'ralph_getAttempts',
        description: 'Get list of previous attempt file paths for a specific story ID from attempts array',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID to get attempts for (e.g., 'story-1')",
            },
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'",
            },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'ralph_markComplete',
        description: 'Mark a story as complete. Automatically moves to archive if RALPH_PRD_FILE_ARCHIVE env var is set or archive.prd.json exists, otherwise marks passes=true in place.',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID to mark complete (e.g., 'story-1')",
            },
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE_ACTIVE env var or 'active.prd.json'",
            },
            archiveFile: {
              type: 'string',
              description: "Archive file to move completed story to (e.g., 'archive.prd.json'). If not provided, uses RALPH_PRD_FILE_ARCHIVE env var or auto-detects archive.prd.json",
            },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'ralph_recordFailure',
        description: "Record a failed attempt by adding context file to story's attempts array",
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID (e.g., 'story-30')",
            },
            contextFilePath: {
              type: 'string',
              description: "Path to context dump file (e.g., 'progress/story-30_2026-01-26_143022_issue.md')",
            },
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'",
            },
          },
          required: ['storyId', 'contextFilePath'],
        },
      },
      {
        name: 'ralph_blockStory',
        description: 'Mark a story as blocked after exceeding max attempts (6)',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID to block (e.g., 'story-30')",
            },
            prdFile: {
              type: 'string',
              description: "PRD file to use (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'",
            },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'ralph_isComplete',
        description: 'Check if all stories in PRD are complete',
        inputSchema: {
          type: 'object',
          properties: {
            prdFile: {
              type: 'string',
              description: "PRD file to check (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'",
            },
          },
        },
      },
      {
        name: 'ralph_createProgress',
        description: 'Create a progress file (success log or failure context dump) for a story attempt',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID (e.g., 'story-30')",
            },
            status: {
              type: 'string',
              description: "'success' or 'failure'",
            },
            model: {
              type: 'string',
              description: "Model used (e.g., 'gpt-4.1' or 'claude-sonnet-4.5')",
            },
            // Success fields
            summary: {
              type: 'string',
              description: 'Brief description of what was implemented (success only)',
            },
            filesChanged: {
              type: 'string',
              description: 'Comma-separated list of files changed (success only)',
            },
            learnings: {
              type: 'string',
              description: 'Key patterns or learnings (success only)',
            },
            validationResults: {
              type: 'string',
              description: 'Validation results (success only)',
            },
            // Failure fields
            failureReason: {
              type: 'string',
              description: 'One-line failure summary (failure only)',
            },
            whatAttempted: {
              type: 'string',
              description: 'Step-by-step narrative (failure only)',
            },
            errorsEncountered: {
              type: 'string',
              description: 'Full error messages (failure only)',
            },
            whatWasTried: {
              type: 'string',
              description: 'Each fix attempt and result (failure only)',
            },
            recommendations: {
              type: 'string',
              description: 'Next steps to try (failure only)',
            },
          },
          required: ['storyId', 'status', 'model'],
        },
      },
      {
        name: 'ralph_createFailure',
        description: 'Create a failure document for a story when encountering an error. Simpler alternative to createProgress for quick error reporting.',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: {
              type: 'string',
              description: "Story ID (e.g., 'story-30')",
            },
            error: {
              type: 'string',
              description: 'The error message or description of what went wrong (e.g., "Build failed with 5 TypeScript errors")',
            },
            context: {
              type: 'string',
              description: 'Additional context about what was happening when the error occurred (optional)',
            },
            attempted: {
              type: 'string',
              description: 'What was attempted before the error occurred (optional)',
            },
            model: {
              type: 'string',
              description: "Model that encountered the error (e.g., 'claude-sonnet-4.5'). Defaults to 'unknown'",
            },
          },
          required: ['storyId', 'error'],
        },
      },
      {
        name: 'ralph_addPrd',
        description: 'Add a new PRD entry with validation and duplicate checking. Auto-increments story ID if not provided. Supports custom PRD files (e.g., active.prd.json)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: "Unique story ID (e.g., 'story-48'). If not provided, auto-increments from highest existing ID.",
            },
            title: {
              type: 'string',
              description: 'Story title',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the story',
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: 'Story priority level',
            },
            acceptanceCriteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of acceptance criteria strings',
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of story IDs this story depends on (optional)',
            },
            info: {
              type: 'string',
              description: 'Optional additional context or notes',
            },
            info2: {
              type: 'string',
              description: 'Optional additional context or notes (second field)',
            },
            prdFile: {
              type: 'string',
              description: "PRD file to add story to (e.g., 'active.prd.json'). Defaults to RALPH_PRD_FILE env var or 'active.prd.json'",
            },
          },
          required: ['title', 'description', 'priority', 'acceptanceCriteria'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'ralph_findNext': {
        const result = await findNextStory({ prdFile: args?.prdFile as string | undefined })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_getDetails': {
        const result = await getStoryDetails({
          storyId: args.storyId as string,
          prdFile: args?.prdFile as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_getAttempts': {
        const result = await getStoryAttempts({
          storyId: args.storyId as string,
          prdFile: args?.prdFile as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_markComplete': {
        const result = await markStoryComplete({
          storyId: args.storyId as string,
          prdFile: args?.prdFile as string | undefined,
          archiveFile: args?.archiveFile as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_recordFailure': {
        const result = await recordStoryFailure({
          storyId: args.storyId as string,
          contextFilePath: args.contextFilePath as string,
          prdFile: args?.prdFile as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_blockStory': {
        const result = await blockStoryImpl({
          storyId: args.storyId as string,
          prdFile: args?.prdFile as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_isComplete': {
        const result = await checkIsComplete({ prdFile: args?.prdFile as string | undefined })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_createProgress': {
        const options: ProgressOptions = {
          storyId: args.storyId as string,
          status: args.status as 'success' | 'failure',
          model: args.model as string,
          summary: args.summary as string | undefined,
          filesChanged: args.filesChanged as string | undefined,
          learnings: args.learnings as string | undefined,
          validationResults: args.validationResults as string | undefined,
          failureReason: args.failureReason as string | undefined,
          whatAttempted: args.whatAttempted as string | undefined,
          errorsEncountered: args.errorsEncountered as string | undefined,
          whatWasTried: args.whatWasTried as string | undefined,
          recommendations: args.recommendations as string | undefined,
        }
        const result = await createProgressFile(options)
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_createFailure': {
        const result = await createFailureDocument({
          storyId: args.storyId as string,
          error: args.error as string,
          context: args.context as string | undefined,
          attempted: args.attempted as string | undefined,
          model: args.model as string | undefined,
        })
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      case 'ralph_addPrd': {
        // Determine PRD file path
        const prdPath = await resolvePrdFile({ prdFile: args?.prdFile as string | undefined })
        const prd = await readPrdFile(prdPath)

        // Auto-increment ID if not provided
        let storyId = args?.id as string | undefined
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
          const prdFile = (args?.prdFile as string) || path.basename(prdPath)
          throw new Error(`Story with id '${storyId}' already exists in ${prdFile}`)
        }

        // Validate dependencies exist (check both active and archive)
        if (args?.dependencies && (args.dependencies as string[]).length > 0) {
          const existingIds = new Set(prd.stories.map((s: any) => s.id))

          // Check archive for missing dependencies
          const missingDeps: string[] = []
          for (const dep of args.dependencies as string[]) {
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
            const prdFile = (args?.prdFile as string) || path.basename(prdPath)
            throw new Error(
              `Invalid dependencies: ${missingDeps.join(', ')} do not exist in ${prdFile} or archive`
            )
          }
        }

        // Create new PRD entry
        const newStory = {
          id: storyId,
          title: args.title as string,
          description: args.description as string,
          priority: args.priority as string,
          passes: false,
          ...(args.info && { info: args.info as string }),
          ...(args.info2 && { info2: args.info2 as string }),
          acceptanceCriteria: args.acceptanceCriteria as string[],
          dependencies: (args?.dependencies as string[]) || [],
        }

        // Add to stories array
        prd.stories.push(newStory)

        // Write atomically
        await writePrdFile(prdPath, prd)

        const prdFile = (args?.prdFile as string) || path.basename(prdPath)
        const result = `Successfully added story '${storyId}' to ${prdFile}`
        return {
          content: [{ type: 'text', text: result }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    }
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Ralph CLI MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
