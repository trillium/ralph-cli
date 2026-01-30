/**
 * Create a GitHub issue for an error encountered during story execution
 * Uses gh CLI to automatically spawn an issue in the repository
 * Automatically includes diagnostic info for debugging
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadConfig, clearConfigCache } from './config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface CreateErrorOptions {
  storyId: string
  error: string
  context?: string
  attempted?: string
}

/**
 * Get the ralph-cli version from package.json
 */
function getVersion(): string {
  try {
    const packagePath = join(__dirname, '..', '..', 'package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
    return packageJson.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Get diagnostic info for debugging
 */
function getDiagnostics(): string {
  const cwd = process.cwd()
  const version = getVersion()
  const configPath = join(cwd, 'ralph.config.json')
  const configExists = existsSync(configPath)

  let diagnostics = `## Diagnostics

**ralph-cli version:** ${version}
**Working directory:** ${cwd}
**ralph.config.json exists:** ${configExists}
`

  if (configExists) {
    try {
      const configContent = readFileSync(configPath, 'utf-8')
      diagnostics += `
**ralph.config.json contents:**
\`\`\`json
${configContent}
\`\`\`
`
    } catch (e: any) {
      diagnostics += `\n**Failed to read config:** ${e.message}\n`
    }

    // Get parsed config
    try {
      clearConfigCache()
      const config = loadConfig(cwd)
      diagnostics += `
**Parsed hierarchy:** ${JSON.stringify(config.hierarchy)}
**Parsed PRD types:**
\`\`\`json
${JSON.stringify(config.prdTypes, null, 2)}
\`\`\`
`
    } catch (e: any) {
      diagnostics += `\n**Failed to parse config:** ${e.message}\n`
    }
  } else {
    diagnostics += `\n_Config file not found - using defaults (active.prd.json, archive.prd.json)_\n`
  }

  // Check which PRD files exist
  const prdFiles = ['active.prd.json', 'archive.prd.json']
  const existingPrds = prdFiles.filter((f) => existsSync(join(cwd, f)))
  diagnostics += `\n**PRD files found in cwd:** ${existingPrds.length > 0 ? existingPrds.join(', ') : 'none'}\n`

  return diagnostics
}

/**
 * Create a GitHub issue for an error
 *
 * Automatically creates a GitHub issue using `gh` CLI with:
 * - Repository: Always creates issues in trillium/ralph-cli (regardless of current directory)
 * - Title: "[Story ID] Error: [error summary]"
 * - Body: Formatted markdown with context, what was attempted, error details, and diagnostics
 * - Labels: "bug"
 *
 * @param options - Error details
 * @returns Success message with issue URL
 * @throws Error if gh CLI is not available or issue creation fails
 *
 * @example
 * ```typescript
 * await createErrorIssue({
 *   storyId: 'story-5',
 *   error: 'Build failed with 3 TypeScript errors',
 *   context: 'Implementing user authentication feature',
 *   attempted: 'Added login component and auth service'
 * })
 * ```
 */
export async function createErrorIssue(
  options: CreateErrorOptions
): Promise<string> {
  const { storyId, error, context, attempted } = options

  // Check if gh CLI is available
  try {
    execSync('gh --version', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'gh CLI is not available. Install it from https://cli.github.com/'
    )
  }

  // Gather diagnostics
  const diagnostics = getDiagnostics()

  // Create issue title (truncate error if too long)
  const errorSummary = error.length > 60 ? error.substring(0, 60) + '...' : error
  const title = `[${storyId}] Error: ${errorSummary}`

  // Create issue body in markdown
  const body = `
## Error Details

**Story ID:** ${storyId}

**Error:**
\`\`\`
${error}
\`\`\`

${context ? `**Context:**\n${context}\n` : ''}
${attempted ? `**What Was Attempted:**\n${attempted}\n` : ''}

${diagnostics}

---

_This issue was automatically created by ralph_error()_
`.trim()

  // Create the issue using gh CLI - always target ralph-cli repo
  // Write body to a temp file to avoid shell escaping issues
  const { writeFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')

  const tempFile = join(tmpdir(), `ralph-error-${Date.now()}.md`)

  try {
    // Write body to temp file
    writeFileSync(tempFile, body, 'utf-8')

    const result = execSync(
      `gh issue create --repo trillium/ralph-cli --title ${JSON.stringify(title)} --body-file ${tempFile} --label bug`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )

    const issueUrl = result.trim()

    // Clean up temp file
    try {
      unlinkSync(tempFile)
    } catch {
      // Ignore cleanup errors
    }

    return `Successfully created GitHub issue: ${issueUrl}`
  } catch (execError: any) {
    // Clean up temp file on error
    try {
      unlinkSync(tempFile)
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(
      `Failed to create GitHub issue: ${execError.message}\n` +
        `Make sure you have gh authenticated (run: gh auth login)`
    )
  }
}
