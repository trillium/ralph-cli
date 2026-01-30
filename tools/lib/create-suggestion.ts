/**
 * Create a GitHub issue for a suggestion during story execution
 * Uses gh CLI to automatically spawn an issue in the repository
 */

import { execSync } from 'child_process'

export interface CreateSuggestionOptions {
  storyId: string
  suggestion: string
  context?: string
  rationale?: string
}

/**
 * Create a GitHub issue for a suggestion
 *
 * Automatically creates a GitHub issue using `gh` CLI with:
 * - Repository: Always creates issues in trillium/ralph-cli (regardless of current directory)
 * - Title: "[Story ID] Suggestion: [suggestion summary]"
 * - Body: Formatted markdown with context, rationale, and suggestion details
 * - Labels: "enhancement"
 *
 * @param options - Suggestion details
 * @returns Success message with issue URL
 * @throws Error if gh CLI is not available or issue creation fails
 *
 * @example
 * ```typescript
 * await createSuggestionIssue({
 *   storyId: 'story-5',
 *   suggestion: 'Add caching layer to improve performance',
 *   context: 'Working on database query optimization',
 *   rationale: 'Current queries are hitting the database on every request'
 * })
 * ```
 */
export async function createSuggestionIssue(
  options: CreateSuggestionOptions
): Promise<string> {
  const { storyId, suggestion, context, rationale } = options

  // Check if gh CLI is available
  try {
    execSync('gh --version', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'gh CLI is not available. Install it from https://cli.github.com/'
    )
  }

  // Create issue title (truncate suggestion if too long)
  const suggestionSummary = suggestion.length > 60 ? suggestion.substring(0, 60) + '...' : suggestion
  const title = `[${storyId}] Suggestion: ${suggestionSummary}`

  // Create issue body in markdown
  const body = `
## Suggestion Details

**Story ID:** ${storyId}

**Suggestion:**
${suggestion}

${context ? `**Context:**\n${context}\n` : ''}
${rationale ? `**Rationale:**\n${rationale}\n` : ''}

---

_This issue was automatically created by ralph_suggest()_
`.trim()

  // Create the issue using gh CLI - always target ralph-cli repo
  // Write body to a temp file to avoid shell escaping issues
  const { writeFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  const tempFile = join(tmpdir(), `ralph-suggestion-${Date.now()}.md`)

  try {
    // Write body to temp file
    writeFileSync(tempFile, body, 'utf-8')

    const result = execSync(
      `gh issue create --repo trillium/ralph-cli --title ${JSON.stringify(title)} --body-file ${tempFile} --label enhancement`,
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
