/**
 * Get full details for a specific story
 */

import { resolvePrdFile, readPrdFile, findStoryById } from './prd-utils'

/**
 * Get full details for a specific story ID
 *
 * @param storyId - Story ID to retrieve
 * @param prdFile - Optional PRD file path
 * @returns JSON string with full story details and metadata, or error object
 *
 * @example
 * ```typescript
 * const details = await getStoryDetails({
 *   storyId: 'story-1',
 *   prdFile: 'active.prd.json'
 * })
 * const result = JSON.parse(details)
 * if (result.found) {
 *   console.log(result.story.attemptCount)    // 2
 * } else {
 *   console.log(result.error)  // Error message
 * }
 * ```
 */
export async function getStoryDetails(options: {
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
        },
        null,
        2
      )
    }

    const attempts = story.attempts || []

    return JSON.stringify(
      {
        found: true,
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
    return JSON.stringify(
      {
        found: false,
        error: error.message,
        message: `Failed to get story details: ${error.message}`,
      },
      null,
      2
    )
  }
}
