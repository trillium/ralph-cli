/**
 * Create failure document for a story when an agent encounters an error
 * Simplified wrapper around createProgressFile for quick failure reporting
 */

import { createProgressFile } from './create-progress'

export interface FailureOptions {
  storyId: string
  error: string
  context?: string
  attempted?: string
  model?: string
}

/**
 * Create a failure document for a story
 *
 * This is a simplified wrapper around createProgressFile specifically for
 * agents to quickly document errors they encounter. It creates a failure
 * file in the progress/ directory and returns the path.
 *
 * @param options - Failure documentation options
 * @returns JSON string with file path and success status
 *
 * @example
 * ```typescript
 * const result = await createFailureDocument({
 *   storyId: 'story-30',
 *   error: 'Build failed with 5 TypeScript errors',
 *   context: 'Attempting to add strict null checks to legacy codebase',
 *   attempted: 'Modified 3 files to add proper type annotations',
 *   model: 'claude-sonnet-4.5'
 * })
 * const parsed = JSON.parse(result)
 * console.log(parsed.filePath) // "progress/story-30_2026-01-28_143022_failure.md"
 * ```
 */
export async function createFailureDocument(
  options: FailureOptions
): Promise<string> {
  try {
    const { storyId, error, context, attempted, model } = options

    // Build failure content
    const failureReason = error
    const errorsEncountered = error
    const whatAttempted = attempted || context || 'No details provided'
    const whatWasTried = context || attempted || 'No context provided'

    // Create progress file with failure status
    const filePath = await createProgressFile({
      storyId,
      status: 'failure',
      model: model || 'unknown',
      failureReason,
      whatAttempted,
      errorsEncountered,
      whatWasTried,
      recommendations:
        'Review the error details above and consider alternative approaches.',
    })

    return JSON.stringify(
      {
        success: true,
        filePath,
        storyId,
        message: `Failure document created at ${filePath}`,
      },
      null,
      2
    )
  } catch (error: any) {
    return JSON.stringify(
      {
        success: false,
        error: error.message,
        message: `Failed to create failure document: ${error.message}`,
      },
      null,
      2
    )
  }
}
