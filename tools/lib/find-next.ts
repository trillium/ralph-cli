/**
 * Find next available story to work on
 * Respects dependencies and priority ordering
 */

import type { PrdDocument, Story, Priority } from './types'
import {
  resolvePrdFile,
  readPrdFile,
  findStoryById,
  resolveArchiveFile,
} from './prd-utils'

/**
 * Priority ordering for story selection
 */
const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

/**
 * Check if a story exists in the archive and is completed
 *
 * @param storyId - Story ID to check
 * @returns true if story exists in archive and is complete, false otherwise
 */
async function isStoryInArchive(storyId: string): Promise<boolean> {
  try {
    const archivePath = await resolveArchiveFile({})
    if (!archivePath) {
      // No archive file exists
      return false
    }

    const archivePrd = await readPrdFile(archivePath)
    const archivedStory = findStoryById(archivePrd, storyId)

    // Story is satisfied if it exists in archive and is marked as complete
    return archivedStory ? archivedStory.passes === true : false
  } catch (error) {
    // Archive file doesn't exist or can't be read
    return false
  }
}

/**
 * Check if all dependencies for a story are satisfied
 *
 * @param story - Story to check
 * @param prd - PRD document containing all stories
 * @returns true if all dependencies are complete, false otherwise
 */
async function areDependenciesSatisfied(
  story: Story,
  prd: PrdDocument
): Promise<boolean> {
  if (!story.dependencies || story.dependencies.length === 0) {
    return true
  }

  for (const depId of story.dependencies) {
    const depStory = findStoryById(prd, depId)
    if (!depStory) {
      // Dependency not found in active PRD - check archive
      const inArchive = await isStoryInArchive(depId)
      if (!inArchive) {
        // Dependency not found in either active or archive - consider unsatisfied
        return false
      }
      // Dependency found in archive and is complete - continue checking other deps
      continue
    }
    if (!depStory.passes) {
      // Dependency not complete
      return false
    }
  }

  return true
}

/**
 * Find the next available story to work on
 *
 * Selection criteria:
 * 1. Story must not be complete (passes !== true)
 * 2. Story must not be blocked (blocked !== true)
 * 3. All dependencies must be satisfied (have passes: true)
 * 4. Sort by priority (critical > high > medium > low)
 * 5. Return first match with FULL details including attempts
 *
 * @param prdFile - Optional PRD file path
 * @returns JSON string with story details or status object
 *
 * @example
 * ```typescript
 * const next = await findNextStory({ prdFile: 'active.prd.json' })
 * const result = JSON.parse(next)
 * if (result.available) {
 *   console.log(result.story.id)              // "story-1"
 *   console.log(result.story.attemptCount)    // 2
 * } else {
 *   console.log(result.reason)                // "no_stories_available"
 * }
 * ```
 */
export async function findNextStory(options: {
  prdFile?: string
}): Promise<string> {
  try {
    const prdPath = await resolvePrdFile({ prdFile: options.prdFile })
    const prd = await readPrdFile(prdPath)

    // Gather statistics for better diagnostics
    const totalStories = prd.stories.length
    const completedStories = prd.stories.filter((s) => s.passes).length
    const blockedStories = prd.stories.filter((s) => s.blocked).length

    // Filter candidate stories
    const candidates: Story[] = []
    for (const story of prd.stories) {
      // Skip completed stories
      if (story.passes) continue

      // Skip blocked stories
      if (story.blocked) continue

      // Check dependencies (now async)
      const depsSatisfied = await areDependenciesSatisfied(story, prd)
      if (depsSatisfied) {
        candidates.push(story)
      }
    }

    if (candidates.length === 0) {
      // Determine the reason for no candidates
      const incompleteCount = totalStories - completedStories - blockedStories

      // Count stories waiting on dependencies (async check)
      let waitingOnDeps = 0
      for (const story of prd.stories) {
        if (!story.passes && !story.blocked) {
          const depsSatisfied = await areDependenciesSatisfied(story, prd)
          if (!depsSatisfied) {
            waitingOnDeps++
          }
        }
      }

      return JSON.stringify(
        {
          available: false,
          reason: 'no_stories_available',
          totalStories,
          completedStories,
          blockedStories,
          incompleteStories: incompleteCount,
          storiesWaitingOnDependencies: waitingOnDeps,
          message:
            incompleteCount === 0
              ? 'All stories are either completed or blocked'
              : waitingOnDeps > 0
                ? `${waitingOnDeps} incomplete stories are waiting on dependencies`
                : 'No available stories to work on',
        },
        null,
        2
      )
    }

    // Sort by priority
    candidates.sort((a, b) => {
      const aPriority = PRIORITY_ORDER[a.priority] ?? 999
      const bPriority = PRIORITY_ORDER[b.priority] ?? 999
      return aPriority - bPriority
    })

    // Return first match with full details and metadata
    const story = candidates[0]
    const attempts = story.attempts || []

    return JSON.stringify(
      {
        available: true,
        story: {
          ...story,
          attemptCount: attempts.length,
          previousAttempts: attempts,
        },
      },
      null,
      2
    )
  } catch (error: any) {
    // Return structured error for unparseable JSON or missing files
    return JSON.stringify(
      {
        available: false,
        reason: 'error',
        error: error.message,
        message: `Failed to find next story: ${error.message}`,
      },
      null,
      2
    )
  }
}
