/**
 * Get list of previous attempt file paths for a story
 */

import { resolvePrdFile, readPrdFile, findStoryById } from './prd-utils'

/**
 * Get list of previous attempt file paths for a specific story
 *
 * @param storyId - Story ID to get attempts for
 * @param prdFile - Optional PRD file path
 * @returns JSON string with attempts array and metadata
 *
 * @example
 * ```typescript
 * const result = await getStoryAttempts({
 *   storyId: 'story-30',
 *   prdFile: 'active.prd.json'
 * })
 * const parsed = JSON.parse(result)
 * if (parsed.found) {
 *   console.log(parsed.attempts)  // ["progress/...", "progress/..."]
 *   console.log(parsed.count)     // 2
 * }
 * ```
 */
export async function getStoryAttempts(options: {
  storyId: string
  prdFile?: string
}): Promise<string> {
  try {
    const prdPath = await resolvePrdFile({ prdFile: options.prdFile })
    const prd = await readPrdFile(prdPath)

    const story = findStoryById(prd, options.storyId)
    if (!story) {
      return JSON.stringify(
        {
          found: false,
          error: `Story '${options.storyId}' not found`,
          message: `Story '${options.storyId}' not found in ${prdPath}`,
          attempts: [],
          count: 0,
        },
        null,
        2
      )
    }

    const attempts = story.attempts || []

    return JSON.stringify(
      {
        found: true,
        storyId: options.storyId,
        attempts,
        count: attempts.length,
      },
      null,
      2
    )
  } catch (error: any) {
    return JSON.stringify(
      {
        found: false,
        error: error.message,
        message: `Failed to get story attempts: ${error.message}`,
        attempts: [],
        count: 0,
      },
      null,
      2
    )
  }
}
