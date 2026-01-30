/**
 * Configuration for Ralph CLI
 * Reads from ralph.config.json with support for multiple PRD types and hierarchy
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const CONFIG_FILENAME = 'ralph.config.json'

/**
 * PRD type configuration
 */
export interface PrdTypeConfig {
  active: string
  archive: string
}

/**
 * Ralph configuration structure
 */
export interface RalphConfig {
  prdTypes: Record<string, PrdTypeConfig>
  hierarchy: string[]
}

/**
 * Legacy configuration structure (for backwards compatibility)
 */
interface LegacyConfig {
  activePrdFile?: string
  archivePrdFile?: string
}

/**
 * Default configuration when no config file exists
 */
const DEFAULT_CONFIG: RalphConfig = {
  prdTypes: {
    default: {
      active: 'active.prd.json',
      archive: 'archive.prd.json',
    },
  },
  hierarchy: ['default'],
}

/**
 * Cached configuration
 */
let cachedConfig: RalphConfig | null = null
let cachedConfigPath: string | null = null

/**
 * Load and parse the ralph.config.json file
 * Supports both new multi-type format and legacy single-file format
 *
 * @param cwd - Working directory to look for config (defaults to process.cwd())
 * @returns Parsed configuration
 */
export function loadConfig(cwd: string = process.cwd()): RalphConfig {
  const configPath = join(cwd, CONFIG_FILENAME)

  // Return cached config if same path
  if (cachedConfig && cachedConfigPath === configPath) {
    return cachedConfig
  }

  if (!existsSync(configPath)) {
    // Return default config if no config file
    cachedConfig = DEFAULT_CONFIG
    cachedConfigPath = configPath
    return DEFAULT_CONFIG
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(content)

    // Check if this is the new format (has prdTypes)
    if (parsed.prdTypes && typeof parsed.prdTypes === 'object') {
      const config: RalphConfig = {
        prdTypes: parsed.prdTypes,
        hierarchy: parsed.hierarchy || Object.keys(parsed.prdTypes),
      }
      cachedConfig = config
      cachedConfigPath = configPath
      return config
    }

    // Legacy format - convert to new format
    const legacyConfig = parsed as LegacyConfig
    const config: RalphConfig = {
      prdTypes: {
        default: {
          active: legacyConfig.activePrdFile || 'active.prd.json',
          archive: legacyConfig.archivePrdFile || 'archive.prd.json',
        },
      },
      hierarchy: ['default'],
    }
    cachedConfig = config
    cachedConfigPath = configPath
    return config
  } catch (error: any) {
    throw new Error(`Failed to parse ${CONFIG_FILENAME}: ${error.message}`)
  }
}

/**
 * Clear the cached configuration
 * Useful for testing or when config file changes
 */
export function clearConfigCache(): void {
  cachedConfig = null
  cachedConfigPath = null
}

/**
 * Get PRD files for a specific type
 *
 * @param prdType - The PRD type (e.g., 'default', 'feature')
 * @param cwd - Working directory
 * @returns Object with active and archive file paths
 */
export function getPrdFilesForType(
  prdType: string,
  cwd: string = process.cwd()
): PrdTypeConfig {
  const config = loadConfig(cwd)
  const typeConfig = config.prdTypes[prdType]

  if (!typeConfig) {
    throw new Error(
      `Unknown PRD type '${prdType}'. Available types: ${Object.keys(config.prdTypes).join(', ')}`
    )
  }

  return typeConfig
}

/**
 * Get the hierarchy of PRD types
 *
 * @param cwd - Working directory
 * @returns Array of PRD type names in priority order
 */
export function getHierarchy(cwd: string = process.cwd()): string[] {
  const config = loadConfig(cwd)
  return config.hierarchy
}

/**
 * Get all configured PRD types
 *
 * @param cwd - Working directory
 * @returns Record of all PRD type configurations
 */
export function getAllPrdTypes(
  cwd: string = process.cwd()
): Record<string, PrdTypeConfig> {
  const config = loadConfig(cwd)
  return config.prdTypes
}

// Legacy exports for backwards compatibility
export const ACTIVE_PRD_FILE = 'active.prd.json'
export const ARCHIVE_PRD_FILE = 'archive.prd.json'

export function getActivePrdFile(): string {
  return ACTIVE_PRD_FILE
}

export function getArchivePrdFile(): string {
  return ARCHIVE_PRD_FILE
}
