/**
 * Check if all stories in PRD are complete
 */

import { resolvePrdFile, readPrdFile } from './prd-utils'

/**
 * Check if all stories in the PRD are complete
 *
 * @returns JSON string with completion status and detailed breakdown
 *
 * @example
 * ```typescript
 * const parsed = JSON.parse(result)
 * console.log(parsed.complete) // true or false
 * console.log(parsed.summary)  // "3 of 10 stories complete (2 blocked, 5 remaining)"
 * ```
 */
export async function checkIsComplete(options: {

}): Promise<string> {
  try {
    const prdPath = await resolvePrdFile()
    const prd = await readPrdFile(prdPath)

    // Gather detailed statistics
    const totalStories = prd.stories.length
    const completedStories = prd.stories.filter((s) => s.passes === true).length
    const blockedStories = prd.stories.filter((s) => s.blocked === true).length
    const remainingStories = totalStories - completedStories - blockedStories

    // Check if all stories have passes: true
    const allComplete = prd.stories.every((story) => story.passes === true)

    // Build detailed summary
    let summary = `${completedStories} of ${totalStories} stories complete`
    if (blockedStories > 0 || remainingStories > 0) {
      const parts: string[] = []
      if (blockedStories > 0) parts.push(`${blockedStories} blocked`)
      if (remainingStories > 0) parts.push(`${remainingStories} remaining`)
      summary += ` (${parts.join(', ')})`
    }

    return JSON.stringify(
      {
        complete: allComplete,
        totalStories,
        completedStories,
        blockedStories,
        remainingStories,
        summary,
        // Legacy compatibility
        result: allComplete ? 'yes' : 'no',
      },
      null,
      2
    )
  } catch (error: any) {
    // Return structured error for unparseable JSON or missing files
    return JSON.stringify(
      {
        complete: false,
        error: error.message,
        result: 'error',
        message: `Failed to check completion status: ${error.message}`,
      },
      null,
      2
    )
  }
}
