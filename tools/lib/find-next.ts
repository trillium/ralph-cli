/**
 * Find next available story to work on
 * Respects dependencies, priority ordering, and PRD type hierarchy
 */

import type { PrdDocument, Story, Priority } from './types'
import {
  getAllPrdPaths,
  readPrdFile,
  tryReadPrdFile,
  findStoryById,
} from './prd-utils'
import { loadConfig, clearConfigCache } from './config'

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
 * Check if a story exists in any archive and is completed
 *
 * @param storyId - Story ID to check
 * @param prdPaths - All PRD paths to check
 * @returns true if story exists in any archive and is complete, false otherwise
 */
async function isStoryInAnyArchive(
  storyId: string,
  prdPaths: Array<{ type: string; active: string; archive: string }>
): Promise<boolean> {
  for (const { archive } of prdPaths) {
    try {
      const archivePrd = await tryReadPrdFile(archive)
      if (archivePrd) {
        const archivedStory = findStoryById(archivePrd, storyId)
        if (archivedStory && archivedStory.passes === true) {
          return true
        }
      }
    } catch {
      // Archive doesn't exist or can't be read - continue to next
    }
  }
  return false
}

/**
 * Check if all dependencies for a story are satisfied
 * Checks across all PRD types (both active and archive)
 *
 * @param story - Story to check
 * @param allPrds - Map of type to PRD document
 * @param prdPaths - All PRD paths for archive checking
 * @returns true if all dependencies are complete, false otherwise
 */
async function areDependenciesSatisfied(
  story: Story,
  allPrds: Map<string, PrdDocument>,
  prdPaths: Array<{ type: string; active: string; archive: string }>
): Promise<boolean> {
  if (!story.dependencies || story.dependencies.length === 0) {
    return true
  }

  for (const depId of story.dependencies) {
    // Check all active PRDs for the dependency
    let found = false
    for (const prd of allPrds.values()) {
      const depStory = findStoryById(prd, depId)
      if (depStory) {
        if (!depStory.passes) {
          // Dependency found but not complete
          return false
        }
        found = true
        break
      }
    }

    if (!found) {
      // Not found in any active PRD - check archives
      const inArchive = await isStoryInAnyArchive(depId, prdPaths)
      if (!inArchive) {
        // Dependency not found anywhere - consider unsatisfied
        return false
      }
    }
  }

  return true
}

/**
 * Find the next available story to work on
 *
 * Selection criteria:
 * 1. Iterate through PRD types in hierarchy order
 * 2. For each type, find available stories:
 *    - Story must not be complete (passes !== true)
 *    - Story must not be blocked (blocked !== true)
 *    - All dependencies must be satisfied (have passes: true in any PRD)
 * 3. Sort candidates by priority (critical > high > medium > low)
 * 4. Return first match with FULL details including attempts and prdType
 *
 * @returns JSON string with story details or status object
 *
 * @example
 * ```typescript
 * const next = await findNextStory()
 * const result = JSON.parse(next)
 * if (result.available) {
 *   console.log(result.story.id)              // "story-1"
 *   console.log(result.prdType)               // "default"
 *   console.log(result.story.attemptCount)    // 2
 * } else {
 *   console.log(result.reason)                // "no_stories_available"
 * }
 * ```
 */
export async function findNextStory(): Promise<string> {
  try {
    // Clear config cache to ensure fresh read each time
    clearConfigCache()

    const cwd = process.cwd()
    const config = loadConfig(cwd)
    const prdPaths = getAllPrdPaths()

    // Load all PRDs that exist
    const allPrds = new Map<string, PrdDocument>()
    for (const { type, active } of prdPaths) {
      const prd = await tryReadPrdFile(active)
      if (prd) {
        allPrds.set(type, prd)
      }
    }

    if (allPrds.size === 0) {
      return JSON.stringify(
        {
          available: false,
          reason: 'no_prd_files',
          message: 'No PRD files found. Create at least one PRD file to get started.',
          checkedPaths: prdPaths.map((p) => p.active),
          _debug: {
            cwd,
            configHierarchy: config.hierarchy,
            prdFiles: prdPaths.map((p) => ({ type: p.type, active: p.active })),
          },
        },
        null,
        2
      )
    }

    // Gather statistics across all PRDs
    let totalStories = 0
    let completedStories = 0
    let blockedStories = 0

    for (const prd of allPrds.values()) {
      totalStories += prd.stories.length
      completedStories += prd.stories.filter((s) => s.passes).length
      blockedStories += prd.stories.filter((s) => s.blocked).length
    }

    // Iterate through hierarchy to find first available story
    for (const { type } of prdPaths) {
      const prd = allPrds.get(type)
      if (!prd) continue

      // Find candidates in this PRD
      const candidates: Story[] = []
      for (const story of prd.stories) {
        // Skip completed stories
        if (story.passes) continue

        // Skip blocked stories
        if (story.blocked) continue

        // Check dependencies (across all PRDs)
        const depsSatisfied = await areDependenciesSatisfied(story, allPrds, prdPaths)
        if (depsSatisfied) {
          candidates.push(story)
        }
      }

      if (candidates.length > 0) {
        // Sort by priority
        candidates.sort((a, b) => {
          const aPriority = PRIORITY_ORDER[a.priority] ?? 999
          const bPriority = PRIORITY_ORDER[b.priority] ?? 999
          return aPriority - bPriority
        })

        // Return first match with full details
        const story = candidates[0]
        const attempts = story.attempts || []

        return JSON.stringify(
          {
            available: true,
            prdType: type,
            story: {
              ...story,
              attemptCount: attempts.length,
              previousAttempts: attempts,
            },
            _debug: {
              cwd,
              configHierarchy: config.hierarchy,
              prdFiles: prdPaths.map((p) => ({ type: p.type, active: p.active })),
            },
          },
          null,
          2
        )
      }
    }

    // No candidates found in any PRD
    const incompleteCount = totalStories - completedStories - blockedStories

    // Count stories waiting on dependencies
    let waitingOnDeps = 0
    for (const prd of allPrds.values()) {
      for (const story of prd.stories) {
        if (!story.passes && !story.blocked) {
          const depsSatisfied = await areDependenciesSatisfied(story, allPrds, prdPaths)
          if (!depsSatisfied) {
            waitingOnDeps++
          }
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
        prdTypesChecked: Array.from(allPrds.keys()),
        message:
          incompleteCount === 0
            ? 'All stories are either completed or blocked'
            : waitingOnDeps > 0
              ? `${waitingOnDeps} incomplete stories are waiting on dependencies`
              : 'No available stories to work on',
        _debug: {
          cwd,
          configHierarchy: config.hierarchy,
          prdFiles: prdPaths.map((p) => ({ type: p.type, active: p.active })),
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
