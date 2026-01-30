/**
 * Record a failed attempt by adding context file to story's attempts array
 */

import {
  resolvePrdFile,
  readPrdFile,
  writePrdFile,
  findStoryById,
} from './prd-utils'

/**
 * Record a failed attempt for a story
 * Appends the context file path to the story's attempts array
 *
 * @param storyId - Story ID
 * @param contextFilePath - Path to context dump file
 * @returns Success message
 * @throws Error if story is not found
 *
 * @example
 * ```typescript
 * await recordStoryFailure({
 *   storyId: 'story-30',
 *   contextFilePath: 'progress/story-30_2026-01-26_143022_issue.md',
 * })
 * ```
 */
export async function recordStoryFailure(options: {
  storyId: string
  contextFilePath: string

}): Promise<string> {
  const prdPath = await resolvePrdFile()
  const prd = await readPrdFile(prdPath)

  const story = findStoryById(prd, options.storyId)
  if (!story) {
    throw new Error(`Story '${options.storyId}' not found in ${prdPath}`)
  }

  // Initialize attempts array if not exists
  if (!story.attempts) {
    story.attempts = []
  }

  // Append context file path
  story.attempts.push(options.contextFilePath)

  // Write atomically
  await writePrdFile(prdPath, prd)

  return `Recorded failure for story '${options.storyId}' (attempt ${story.attempts.length})`
}
