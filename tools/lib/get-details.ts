/**
 * Get full details for a specific story
 */

import path from 'path'
import { existsSync } from 'fs'
import { resolvePrdFile, readPrdFile, findStoryById } from './prd-utils'
import { getAllPrdTypes } from './config'

/**
 * Search all configured PRD files for a story and return suggestions
 */
async function findStoryInOtherPrdFiles(
  storyId: string,
  searchedPrdPath: string
): Promise<{ prdFile: string; storyTitle: string }[]> {
  const cwd = process.cwd()
  const prdTypes = getAllPrdTypes(cwd)
  const suggestions: { prdFile: string; storyTitle: string }[] = []
  const searchedBasename = path.basename(searchedPrdPath)

  for (const [_typeName, typeConfig] of Object.entries(prdTypes)) {
    // Check active PRD file
    if (typeConfig.active !== searchedBasename) {
      const activePath = path.join(cwd, typeConfig.active)
      if (existsSync(activePath)) {
        try {
          const prd = await readPrdFile(activePath)
          const story = findStoryById(prd, storyId)
          if (story) {
            suggestions.push({ prdFile: typeConfig.active, storyTitle: story.title })
          }
        } catch {
          // Ignore errors reading other PRD files
        }
      }
    }

    // Check archive PRD file
    if (typeConfig.archive !== searchedBasename) {
      const archivePath = path.join(cwd, typeConfig.archive)
      if (existsSync(archivePath)) {
        try {
          const prd = await readPrdFile(archivePath)
          const story = findStoryById(prd, storyId)
          if (story) {
            suggestions.push({ prdFile: typeConfig.archive, storyTitle: story.title })
          }
        } catch {
          // Ignore errors reading other PRD files
        }
      }
    }
  }

  return suggestions
}

/**
 * Get full details for a specific story ID
 *
 * @param storyId - Story ID to retrieve
 * @returns JSON string with full story details and metadata, or error object
 *
 * @example
 * ```typescript
 * const details = await getStoryDetails({
 *   storyId: 'story-1',
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
      // Look for the story in other configured PRD files
      const suggestions = await findStoryInOtherPrdFiles(options.storyId, prdPath)

      const response: {
        found: false
        error: string
        message: string
        didYouMean?: { prdFile: string; storyTitle: string }[]
      } = {
        found: false,
        error: `Story '${options.storyId}' not found`,
        message: `Story '${options.storyId}' not found in ${prdPath}`,
      }

      if (suggestions.length > 0) {
        response.didYouMean = suggestions
      }

      return JSON.stringify(response, null, 2)
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
