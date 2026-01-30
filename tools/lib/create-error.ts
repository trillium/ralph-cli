/**
 * Create a GitHub issue for an error encountered during story execution
 * Uses gh CLI to automatically spawn an issue in the repository
 */

import { execSync } from 'child_process'

export interface CreateErrorOptions {
  storyId: string
  error: string
  context?: string
  attempted?: string
}

/**
 * Create a GitHub issue for an error
 *
 * Automatically creates a GitHub issue using `gh` CLI with:
 * - Repository: Always creates issues in trillium/ralph-cli (regardless of current directory)
 * - Title: "[Story ID] Error: [error summary]"
 * - Body: Formatted markdown with context, what was attempted, and error details
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

---

_This issue was automatically created by ralph_error()_
`.trim()

  // Create the issue using gh CLI - always target ralph-cli repo
  // Write body to a temp file to avoid shell escaping issues
  const { writeFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

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
