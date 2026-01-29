/**
 * Mark a story as complete
 * Can either set passes=true in place, or move story to archive file
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
  prdFile?: string
  archiveFile?: string
}

/**
 * Mark a story as complete
 *
 * Behavior:
 * 1. If archiveFile is explicitly provided, move story there
 * 2. If RALPH_PRD_FILE_ARCHIVE env var is set, move story there
 * 3. If archive.prd.json exists, move story there
 * 4. Otherwise, mark passes=true in place
 *
 * @param options - Configuration options
 * @returns Success message indicating what action was taken
 * @throws Error if story not found or operation fails
 *
 * @example
 * ```typescript
 * // Mark complete and auto-detect archive workflow
 * await markStoryComplete({ storyId: 'story-1' })
 *
 * // Mark complete with explicit archive file
 * await markStoryComplete({
 *   storyId: 'story-1',
 *   archiveFile: 'archive.prd.json'
 * })
 * ```
 */
export async function markStoryComplete(
  options: MarkCompleteOptions
): Promise<string> {
  const { storyId, prdFile, archiveFile } = options

  try {
    // Determine source PRD file
    const prdPath = await resolvePrdFile({ prdFile })
    const prd = await readPrdFile(prdPath)

    // Find the story
    const storyIndex = findStoryIndexById(prd, storyId)
    if (storyIndex === -1) {
      const prdFileName = prdFile || path.basename(prdPath)
      throw new Error(`Story '${storyId}' not found in ${prdFileName}`)
    }

    const story = prd.stories[storyIndex]

    // Check if we should use archive workflow
    const archivePath = await resolveArchiveFile({ archiveFile })

    if (archivePath) {
      // Archive workflow: move story to archive file
      return await moveStoryToArchive(
        prd,
        prdPath,
        archivePath,
        storyIndex,
        story,
        storyId,
        prdFile
      )
    } else {
      // In-place workflow: just mark as complete
      return await markStoryInPlace(prd, prdPath, story, storyId, prdFile)
    }
  } catch (error: any) {
    throw new Error(`Failed to mark story complete: ${error.message}`)
  }
}

/**
 * Move story to archive file
 */
async function moveStoryToArchive(
  prd: PrdDocument,
  prdPath: string,
  archivePath: string,
  storyIndex: number,
  story: any,
  storyId: string,
  prdFile?: string
): Promise<string> {
  // Read or create archive file
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

  const prdFileName = prdFile || path.basename(prdPath)
  const archiveFileName = path.basename(archivePath)
  return `Successfully moved story '${storyId}' from ${prdFileName} to ${archiveFileName}`
}

/**
 * Mark story as complete in place (no archiving)
 */
async function markStoryInPlace(
  prd: PrdDocument,
  prdPath: string,
  story: any,
  storyId: string,
  prdFile?: string
): Promise<string> {
  // Just mark as complete in place
  story.passes = true
  story.completedAt = new Date().toISOString()

  // Write atomically
  await writePrdFile(prdPath, prd)

  const prdFileName = prdFile || path.basename(prdPath)
  return `Successfully marked story '${storyId}' as complete in ${prdFileName}`
}
