/**
 * Shared utilities for PRD file operations
 * Supports multiple PRD types with hierarchy-based selection
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { PrdDocument } from './types'
import {
  loadConfig,
  getPrdFilesForType,
  getHierarchy,
  ACTIVE_PRD_FILE,
  ARCHIVE_PRD_FILE,
} from './config'

export interface ResolvePrdOptions {
  prdFile?: string
  prdType?: string
}

/**
 * Resolve PRD file path for a specific type
 *
 * @param options - Options including prdFile override or prdType
 * @returns Full path to the active PRD file
 *
 * @example
 * ```typescript
 * // Use default type
 * const path = await resolvePrdFile()
 *
 * // Use specific type
 * const featurePath = await resolvePrdFile({ prdType: 'feature' })
 *
 * // Use explicit file
 * const customPath = await resolvePrdFile({ prdFile: 'custom.prd.json' })
 * ```
 */
export async function resolvePrdFile(options: ResolvePrdOptions = {}): Promise<string> {
  const cwd = process.cwd()

  // Explicit file override takes precedence
  if (options.prdFile) {
    return path.join(cwd, options.prdFile)
  }

  // Use specific type if provided
  if (options.prdType) {
    const typeConfig = getPrdFilesForType(options.prdType, cwd)
    return path.join(cwd, typeConfig.active)
  }

  // Default: use first type in hierarchy
  const hierarchy = getHierarchy(cwd)
  if (hierarchy.length > 0) {
    const typeConfig = getPrdFilesForType(hierarchy[0], cwd)
    return path.join(cwd, typeConfig.active)
  }

  // Fallback to default
  return path.join(cwd, ACTIVE_PRD_FILE)
}

/**
 * Resolve archive file path for a specific type
 *
 * @param options - Options including prdType
 * @returns Full path to the archive PRD file
 *
 * @example
 * ```typescript
 * // Use default type
 * const path = await resolveArchiveFile()
 *
 * // Use specific type
 * const featurePath = await resolveArchiveFile({ prdType: 'feature' })
 * ```
 */
export async function resolveArchiveFile(options: ResolvePrdOptions = {}): Promise<string> {
  const cwd = process.cwd()

  // Use specific type if provided
  if (options.prdType) {
    const typeConfig = getPrdFilesForType(options.prdType, cwd)
    return path.join(cwd, typeConfig.archive)
  }

  // Default: use first type in hierarchy
  const hierarchy = getHierarchy(cwd)
  if (hierarchy.length > 0) {
    const typeConfig = getPrdFilesForType(hierarchy[0], cwd)
    return path.join(cwd, typeConfig.archive)
  }

  // Fallback to default
  return path.join(cwd, ARCHIVE_PRD_FILE)
}

/**
 * Get all PRD file paths across all types in hierarchy order
 *
 * @returns Array of { type, active, archive } objects in hierarchy order
 */
export function getAllPrdPaths(): Array<{ type: string; active: string; archive: string }> {
  const cwd = process.cwd()
  const config = loadConfig(cwd)
  const hierarchy = config.hierarchy

  return hierarchy.map((type) => {
    const typeConfig = config.prdTypes[type]
    return {
      type,
      active: path.join(cwd, typeConfig.active),
      archive: path.join(cwd, typeConfig.archive),
    }
  })
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
 * Try to read a PRD file, returning null if it doesn't exist
 *
 * @param prdPath - Full path to the PRD file
 * @returns Parsed PRD document or null if file doesn't exist
 */
export async function tryReadPrdFile(prdPath: string): Promise<PrdDocument | null> {
  try {
    return await readPrdFile(prdPath)
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return null
    }
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
