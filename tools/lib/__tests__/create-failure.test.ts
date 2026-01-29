/**
 * Tests for create-failure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { createFailureDocument } from '../create-failure'

describe('create-failure', () => {
  const testDir = path.join(process.cwd(), 'test-failure-output')
  const progressDir = path.join(testDir, 'progress')

  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(progressDir, { recursive: true })
    // Change to test directory
    process.chdir(testDir)
  })

  afterEach(async () => {
    // Return to original directory
    process.chdir(path.join(testDir, '..'))
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('createFailureDocument', () => {
    it('should create a failure document with minimal fields', async () => {
      const resultJson = await createFailureDocument({
        storyId: 'story-1',
        error: 'Build failed with TypeScript errors',
      })

      const result = JSON.parse(resultJson)

      expect(result.success).toBe(true)
      expect(result.storyId).toBe('story-1')
      expect(result.filePath).toMatch(
        /^progress\/story-1_\d{4}-\d{2}-\d{2}_\d{6}_failure\.md$/
      )

      // Verify file was created
      const fileExists = await fs
        .access(result.filePath)
        .then(() => true)
        .catch(() => false)
      expect(fileExists).toBe(true)

      // Verify file content
      const content = await fs.readFile(result.filePath, 'utf-8')
      expect(content).toContain('# Story story-1 - FAILED')
      expect(content).toContain('Build failed with TypeScript errors')
      expect(content).toContain('**Model:** unknown')
    })

    it('should create a failure document with all fields', async () => {
      const resultJson = await createFailureDocument({
        storyId: 'story-30',
        error: 'Build failed with 5 TypeScript errors',
        context: 'Adding strict null checks to legacy codebase',
        attempted: 'Modified 3 files to add proper type annotations',
        model: 'claude-sonnet-4.5',
      })

      const result = JSON.parse(resultJson)

      expect(result.success).toBe(true)
      expect(result.storyId).toBe('story-30')

      // Verify file content includes all details
      const content = await fs.readFile(result.filePath, 'utf-8')
      expect(content).toContain('# Story story-30 - FAILED')
      expect(content).toContain('Build failed with 5 TypeScript errors')
      expect(content).toContain('Adding strict null checks to legacy codebase')
      expect(content).toContain(
        'Modified 3 files to add proper type annotations'
      )
      expect(content).toContain('**Model:** claude-sonnet-4.5')
    })

    it('should handle errors gracefully', async () => {
      // Try to write to a directory that doesn't exist and we can't create
      const originalCwd = process.cwd()
      process.chdir('/') // Root directory where we can't create progress/

      const resultJson = await createFailureDocument({
        storyId: 'story-1',
        error: 'Test error',
      })

      const result = JSON.parse(resultJson)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.message).toContain('Failed to create failure document')

      process.chdir(originalCwd)
    })

    it('should create unique filenames with timestamps', async () => {
      const result1Json = await createFailureDocument({
        storyId: 'story-1',
        error: 'First error',
      })

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const result2Json = await createFailureDocument({
        storyId: 'story-1',
        error: 'Second error',
      })

      const result1 = JSON.parse(result1Json)
      const result2 = JSON.parse(result2Json)

      expect(result1.filePath).not.toBe(result2.filePath)

      // Verify both files exist
      const file1Exists = await fs
        .access(result1.filePath)
        .then(() => true)
        .catch(() => false)
      const file2Exists = await fs
        .access(result2.filePath)
        .then(() => true)
        .catch(() => false)

      expect(file1Exists).toBe(true)
      expect(file2Exists).toBe(true)
    })

    it('should use context as attempted when attempted is not provided', async () => {
      const resultJson = await createFailureDocument({
        storyId: 'story-1',
        error: 'Test error',
        context: 'Working on authentication feature',
      })

      const result = JSON.parse(resultJson)
      const content = await fs.readFile(result.filePath, 'utf-8')

      expect(content).toContain('Working on authentication feature')
    })

    it('should include default recommendations', async () => {
      const resultJson = await createFailureDocument({
        storyId: 'story-1',
        error: 'Test error',
      })

      const result = JSON.parse(resultJson)
      const content = await fs.readFile(result.filePath, 'utf-8')

      expect(content).toContain('## Recommendations')
      expect(content).toContain('Review the error details above')
    })
  })
})
