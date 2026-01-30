/**
 * Shared utilities for PRD file operations
 * Simple, opinionated approach: always use active.prd.json and archive.prd.json
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { PrdDocument } from './types'
import { ACTIVE_PRD_FILE, ARCHIVE_PRD_FILE } from './config'

/**
 * Resolve PRD file path
 * Always returns active.prd.json in current directory
 *
 * @returns Full path to active.prd.json
 *
 * @example
 * ```typescript
 * const path = await resolvePrdFile()
 * ```
 */
export async function resolvePrdFile(): Promise<string> {
  return path.join(process.cwd(), ACTIVE_PRD_FILE)
}

/**
 * Resolve archive file path
 * Always returns archive.prd.json in current directory
 *
 * @returns Full path to archive.prd.json
 *
 * @example
 * ```typescript
 * const path = await resolveArchiveFile()
 * ```
 */
export async function resolveArchiveFile(): Promise<string> {
  return path.join(process.cwd(), ARCHIVE_PRD_FILE)
}

/**
 * Read and parse a PRD file with validation
 *
 * @param prdPath - Full path to the PRD file
 * @returns Parsed PRD document
 * @throws Error if file doesn't exist, is invalid JSON, or has invalid structure
 *
 * @example
 * ```typescript
 * const prdPath = await resolvePrdFile()
 * const prd = await readPrdFile(prdPath)
 * console.log(prd.stories.length)
 * ```
 */
export async function readPrdFile(prdPath: string): Promise<PrdDocument> {
  try {
    const content = await fs.readFile(prdPath, 'utf-8')

    let prd: any
    try {
      prd = JSON.parse(content)
    } catch (parseError: any) {
      throw new Error(
        `Invalid JSON in PRD file ${prdPath}: ${parseError.message}. The file cannot be parsed. Please check the file for syntax errors.`
      )
    }

    if (!prd.stories || !Array.isArray(prd.stories)) {
      throw new Error(
        `Invalid PRD structure: missing or invalid 'stories' array in ${prdPath}. Expected format: { "stories": [...] }`
      )
    }

    return prd as PrdDocument
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`PRD file not found: ${prdPath}`)
    }
    // Re-throw our custom errors or any other errors
    throw error
  }
}

/**
 * Write PRD file atomically
 * Uses temp file + rename for atomic writes to prevent corruption
 *
 * @param prdPath - Full path to the PRD file
 * @param prd - PRD document to write
 *
 * @example
 * ```typescript
 * const prd = await readPrdFile(prdPath)
 * prd.stories.push(newStory)
 * await writePrdFile(prdPath, prd)
 * ```
 */
export async function writePrdFile(
  prdPath: string,
  prd: PrdDocument
): Promise<void> {
  const tempPath = `${prdPath}.tmp`
  try {
    await fs.writeFile(tempPath, JSON.stringify(prd, null, 2) + '\n', 'utf-8')
    await fs.rename(tempPath, prdPath)
  } catch (error: any) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to write PRD file: ${error.message}`)
  }
}

/**
 * Find a story by ID in a PRD document
 *
 * @param prd - PRD document
 * @param storyId - Story ID to find
 * @returns Story object or undefined if not found
 *
 * @example
 * ```typescript
 * const story = findStoryById(prd, 'story-1')
 * if (story) {
 *   console.log(story.title)
 * }
 * ```
 */
export function findStoryById(prd: PrdDocument, storyId: string) {
  return prd.stories.find((s) => s.id === storyId)
}

/**
 * Find index of a story by ID in a PRD document
 *
 * @param prd - PRD document
 * @param storyId - Story ID to find
 * @returns Index of story or -1 if not found
 */
export function findStoryIndexById(prd: PrdDocument, storyId: string): number {
  return prd.stories.findIndex((s) => s.id === storyId)
}
