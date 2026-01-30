/**
 * Configuration for Ralph CLI
 * Simple hardcoded defaults - this is personal software!
 */

/**
 * Ralph configuration constants
 */
export const ACTIVE_PRD_FILE = 'active.prd.json'
export const ARCHIVE_PRD_FILE = 'archive.prd.json'

/**
 * Get the active PRD file name
 * Always returns 'active.prd.json'
 */
export function getActivePrdFile(): string {
  return ACTIVE_PRD_FILE
}

/**
 * Get the archive PRD file name
 * Always returns 'archive.prd.json'
 */
export function getArchivePrdFile(): string {
  return ARCHIVE_PRD_FILE
}
