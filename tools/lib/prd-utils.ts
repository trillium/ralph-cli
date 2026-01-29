/**
 * Shared utilities for PRD file operations
 * Provides intelligent file resolution, reading, and writing with atomic operations
 */

import { promises as fs } from 'fs'
import path from 'path'
import type {
  PrdDocument,
  PrdFileResolutionOptions,
  ArchiveFileResolutionOptions,
} from './types'

/**
 * Resolve PRD file path with intelligent fallback
 * Priority: explicit param > RALPH_PRD_FILE_ACTIVE env var > active.prd.json > prd.json
 *
 * @param options - Resolution options
 * @returns Full path to the PRD file
 * @throws Error if no valid PRD file is found
 *
 * @example
 * ```typescript
 * // Use explicit file
 * const path = await resolvePrdFile({ prdFile: 'active.prd.json' })
 *
 * // Use environment variable or auto-detect
 * const path = await resolvePrdFile({})
 * ```
 */
export async function resolvePrdFile(
  options: PrdFileResolutionOptions = {}
): Promise<string> {
  const { prdFile, throwOnNotFound = true } = options

  // Priority 1: Explicit parameter
  if (prdFile) {
    const fullPath = path.join(process.cwd(), prdFile)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      if (throwOnNotFound) {
        throw new Error(`Specified PRD file not found: ${prdFile}`)
      }
      throw new Error(`PRD file not accessible: ${prdFile}`)
    }
  }

  // Priority 2: RALPH_PRD_FILE_ACTIVE environment variable (new)
  if (process.env.RALPH_PRD_FILE_ACTIVE) {
    const fullPath = path.join(process.cwd(), process.env.RALPH_PRD_FILE_ACTIVE)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      if (throwOnNotFound) {
        throw new Error(
          `RALPH_PRD_FILE_ACTIVE not found: ${process.env.RALPH_PRD_FILE_ACTIVE}`
        )
      }
      // Fall through to auto-detection
    }
  }

  // Priority 3: RALPH_PRD_FILE environment variable (legacy, for backward compatibility)
  if (process.env.RALPH_PRD_FILE) {
    const fullPath = path.join(process.cwd(), process.env.RALPH_PRD_FILE)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      if (throwOnNotFound) {
        throw new Error(
          `RALPH_PRD_FILE not found: ${process.env.RALPH_PRD_FILE}`
        )
      }
      // Fall through to auto-detection
    }
  }

  // Priority 4: active.prd.json (modern workflow)
  const activePath = path.join(process.cwd(), 'active.prd.json')
  try {
    await fs.access(activePath)
    return activePath
  } catch {
    // Fall through to legacy
  }

  // Priority 5: prd.json (legacy)
  const legacyPath = path.join(process.cwd(), 'prd.json')
  try {
    await fs.access(legacyPath)
    return legacyPath
  } catch {
    if (throwOnNotFound) {
      throw new Error(
        `No PRD file found. Expected 'active.prd.json' or 'prd.json' in ${process.cwd()}`
      )
    }
    // Return the preferred path even if it doesn't exist
    return activePath
  }
}

/**
 * Resolve archive file path with intelligent fallback
 * Priority: explicit param > RALPH_PRD_FILE_ARCHIVE env var > archive.prd.json
 *
 * @param options - Resolution options
 * @returns Full path to the archive file, or null if no archive workflow is configured
 *
 * @example
 * ```typescript
 * // Use explicit file
 * const path = await resolveArchiveFile({ archiveFile: 'archive.prd.json' })
 *
 * // Use environment variable or auto-detect
 * const path = await resolveArchiveFile({})
 * ```
 */
export async function resolveArchiveFile(
  options: ArchiveFileResolutionOptions = {}
): Promise<string | null> {
  const { archiveFile, throwOnNotFound = false } = options

  // Priority 1: Explicit parameter
  if (archiveFile) {
    const fullPath = path.join(process.cwd(), archiveFile)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      if (throwOnNotFound) {
        throw new Error(`Specified archive file not found: ${archiveFile}`)
      }
      // Return path even if it doesn't exist yet (will be created)
      return fullPath
    }
  }

  // Priority 2: RALPH_PRD_FILE_ARCHIVE environment variable
  if (process.env.RALPH_PRD_FILE_ARCHIVE) {
    const fullPath = path.join(
      process.cwd(),
      process.env.RALPH_PRD_FILE_ARCHIVE
    )
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      // Return path even if it doesn't exist yet (will be created)
      return fullPath
    }
  }

  // Priority 3: Auto-detect archive.prd.json if it exists
  const defaultArchivePath = path.join(process.cwd(), 'archive.prd.json')
  try {
    await fs.access(defaultArchivePath)
    return defaultArchivePath
  } catch {
    // No archive file found - return null to indicate no archive workflow
    return null
  }
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
 * const prdPath = await resolvePrdFile({})
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
