/**
 * Create progress file (success log or failure context dump) for a story attempt
 */

import { promises as fs } from 'fs'
import path from 'path'

export interface ProgressOptions {
  storyId: string
  status: 'success' | 'failure'
  model: string

  // Success fields
  summary?: string
  filesChanged?: string
  learnings?: string
  validationResults?: string

  // Failure fields
  failureReason?: string
  whatAttempted?: string
  errorsEncountered?: string
  whatWasTried?: string
  recommendations?: string
}

/**
 * Generate timestamp in format: YYYY-MM-DD_HHMMSS
 */
function generateTimestamp(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '') // HHMMSS
  return `${date}_${time}`
}

/**
 * Generate success progress file content
 */
function generateSuccessContent(options: ProgressOptions): string {
  const {
    storyId,
    model,
    summary,
    filesChanged,
    learnings,
    validationResults,
  } = options

  return `# Story ${storyId} - SUCCESS

**Model:** ${model}
**Date:** ${new Date().toISOString()}

## Summary

${summary || 'No summary provided'}

## Files Changed

${filesChanged || 'No files listed'}

## Validation Results

${validationResults || 'No validation results provided'}

## Learnings

${learnings || 'No learnings recorded'}
`
}

/**
 * Generate failure progress file content
 */
function generateFailureContent(options: ProgressOptions): string {
  const {
    storyId,
    model,
    failureReason,
    whatAttempted,
    errorsEncountered,
    whatWasTried,
    recommendations,
  } = options

  return `# Story ${storyId} - FAILED

**Model:** ${model}
**Date:** ${new Date().toISOString()}
**Reason:** ${failureReason || 'Unknown failure'}

## What Was Attempted

${whatAttempted || 'No attempt details provided'}

## Errors Encountered

${errorsEncountered || 'No errors recorded'}

## What Was Tried

${whatWasTried || 'No fix attempts recorded'}

## Recommendations

${recommendations || 'No recommendations provided'}
`
}

/**
 * Create a progress file for a story attempt
 *
 * Creates a file in the progress/ directory with format:
 * progress/story-{id}_{timestamp}_{status}.md
 *
 * @param options - Progress file options
 * @returns Path to the created progress file
 *
 * @example
 * ```typescript
 * // Success
 * const file = await createProgressFile({
 *   storyId: 'story-1',
 *   status: 'success',
 *   model: 'claude-sonnet-4.5',
 *   summary: 'Implemented user authentication',
 *   filesChanged: 'src/auth.ts, src/login.tsx',
 *   learnings: 'Use bcrypt for password hashing'
 * })
 *
 * // Failure
 * const file = await createProgressFile({
 *   storyId: 'story-30',
 *   status: 'failure',
 *   model: 'gpt-4.1',
 *   failureReason: 'Build failed due to type errors',
 *   whatAttempted: 'Attempted to add TypeScript types to legacy code',
 *   errorsEncountered: 'Type "string" is not assignable to type "number"'
 * })
 * ```
 */
export async function createProgressFile(
  options: ProgressOptions
): Promise<string> {
  const { storyId, status } = options

  // Create progress directory if it doesn't exist
  const progressDir = path.join(process.cwd(), 'progress')
  try {
    await fs.mkdir(progressDir, { recursive: true })
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create progress directory: ${error.message}`)
    }
  }

  // Generate filename with timestamp
  const timestamp = generateTimestamp()
  const filename = `${storyId}_${timestamp}_${status}.md`
  const filePath = path.join(progressDir, filename)

  // Generate content based on status
  const content =
    status === 'success'
      ? generateSuccessContent(options)
      : generateFailureContent(options)

  // Write file
  try {
    await fs.writeFile(filePath, content, 'utf-8')
  } catch (error: any) {
    throw new Error(`Failed to write progress file: ${error.message}`)
  }

  // Return relative path
  return path.join('progress', filename)
}
