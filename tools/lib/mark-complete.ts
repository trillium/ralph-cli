/**
 * Mark a story as complete by moving it to archive.prd.json
 * Simple and opinionated: always archive completed stories
 */

import path from 'path'
import {
  resolvePrdFile,
  resolveArchiveFile,
  readPrdFile,
  writePrdFile,
  findStoryIndexById,
} from './prd-utils'
import type { PrdDocument } from './types'

export interface MarkCompleteOptions {
  storyId: string
}

/**
 * Mark a story as complete by moving it from active.prd.json to archive.prd.json
 *
 * @param options - Configuration options
 * @returns Success message
 * @throws Error if story not found or operation fails
 *
 * @example
 * ```typescript
 * await markStoryComplete({ storyId: 'story-1' })
 * ```
 */
export async function markStoryComplete(
  options: MarkCompleteOptions
): Promise<string> {
  const { storyId } = options

  try {
    // Read active PRD
    const prdPath = await resolvePrdFile()
    const prd = await readPrdFile(prdPath)

    // Find the story
    const storyIndex = findStoryIndexById(prd, storyId)
    if (storyIndex === -1) {
      throw new Error(`Story '${storyId}' not found in active.prd.json`)
    }

    const story = prd.stories[storyIndex]

    // Read or create archive
    const archivePath = await resolveArchiveFile()
    let archive: PrdDocument
    try {
      archive = await readPrdFile(archivePath)
    } catch (error) {
      // Archive doesn't exist, create new structure
      archive = {
        project: prd.project || 'Archived Stories',
        description: prd.description || 'Completed stories archive',
        stories: [],
      }
    }

    if (!archive.stories || !Array.isArray(archive.stories)) {
      archive.stories = []
    }

    // Mark story as complete and add completion timestamp
    story.passes = true
    story.completedAt = new Date().toISOString()

    // Move story to archive
    archive.stories.push(story)
    prd.stories.splice(storyIndex, 1)

    // Write both files atomically
    await writePrdFile(prdPath, prd)
    await writePrdFile(archivePath, archive)

    return `Successfully moved story '${storyId}' from active.prd.json to archive.prd.json`
  } catch (error: any) {
    throw new Error(`Failed to mark story complete: ${error.message}`)
  }
}
