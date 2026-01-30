/**
 * Mark a story as blocked after exceeding max attempts
 */

import {
  resolvePrdFile,
  readPrdFile,
  writePrdFile,
  findStoryById,
} from './prd-utils'

/**
 * Mark a story as blocked
 * Sets blocked=true and adds a timestamp
 *
 * @param storyId - Story ID to block
 * @returns Success message
 * @throws Error if story is not found
 *
 * @example
 * ```typescript
 * await blockStory({
 *   storyId: 'story-30',
 * })
 * ```
 */
export async function blockStory(options: {
  storyId: string

}): Promise<string> {
  const prdPath = await resolvePrdFile()
  const prd = await readPrdFile(prdPath)

  const story = findStoryById(prd, options.storyId)
  if (!story) {
    throw new Error(`Story '${options.storyId}' not found in ${prdPath}`)
  }

  // Mark as blocked with timestamp
  story.blocked = true
  story.blockedAt = new Date().toISOString()

  // Write atomically
  await writePrdFile(prdPath, prd)

  return `Story '${options.storyId}' marked as blocked`
}
