/**
 * Tests for create-progress.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { createProgressFile } from '../create-progress'
import { useTestDir } from './test-utils'

describe('create-progress', () => {
  const testEnv = useTestDir('create-progress')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('createProgressFile', () => {
    it('should create success progress file', async () => {
      const testDir = process.cwd()
      const filePath = await createProgressFile({
        storyId: 'story-1',
        status: 'success',
        model: 'claude-sonnet-4.5',
        summary: 'Implemented feature X',
        filesChanged: 'src/feature.ts, src/feature.test.ts',
        learnings: 'Use TypeScript for better type safety',
        validationResults: 'All tests passed',
      })

      expect(filePath).toMatch(
        /^progress\/story-1_\d{4}-\d{2}-\d{2}_\d{6}_success\.md$/
      )

      const fullPath = path.join(testDir, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      expect(content).toContain('# Story story-1 - SUCCESS')
      expect(content).toContain('**Model:** claude-sonnet-4.5')
      expect(content).toContain('Implemented feature X')
      expect(content).toContain('src/feature.ts, src/feature.test.ts')
      expect(content).toContain('Use TypeScript for better type safety')
      expect(content).toContain('All tests passed')
    })

    it('should create failure progress file', async () => {
      const testDir = process.cwd()
      const filePath = await createProgressFile({
        storyId: 'story-30',
        status: 'failure',
        model: 'gpt-4.1',
        failureReason: 'Build failed due to type errors',
        whatAttempted: 'Attempted to add TypeScript types',
        errorsEncountered: 'Type "string" not assignable to "number"',
        whatWasTried: 'Fixed type definitions',
        recommendations: 'Review type interfaces',
      })

      expect(filePath).toMatch(
        /^progress\/story-30_\d{4}-\d{2}-\d{2}_\d{6}_failure\.md$/
      )

      const fullPath = path.join(testDir, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      expect(content).toContain('# Story story-30 - FAILED')
      expect(content).toContain('**Model:** gpt-4.1')
      expect(content).toContain('**Reason:** Build failed due to type errors')
      expect(content).toContain('Attempted to add TypeScript types')
      expect(content).toContain('Type "string" not assignable to "number"')
      expect(content).toContain('Fixed type definitions')
      expect(content).toContain('Review type interfaces')
    })

    it('should create progress directory if not exists', async () => {
      const testDir = process.cwd()
      const progressDir = path.join(testDir, 'progress')

      // Ensure it doesn't exist
      try {
        await fs.rm(progressDir, { recursive: true })
      } catch {}

      await createProgressFile({
        storyId: 'story-1',
        status: 'success',
        model: 'test-model',
      })

      const stat = await fs.stat(progressDir)
      expect(stat.isDirectory()).toBe(true)
    })

    it('should generate unique filenames with timestamp', async () => {
      const file1 = await createProgressFile({
        storyId: 'story-1',
        status: 'success',
        model: 'test-model',
      })

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      const file2 = await createProgressFile({
        storyId: 'story-1',
        status: 'failure',
        model: 'test-model',
      })

      expect(file1).not.toBe(file2)
      expect(file1).toContain('success')
      expect(file2).toContain('failure')
    })

    it('should handle missing optional fields in success', async () => {
      const testDir = process.cwd()
      const filePath = await createProgressFile({
        storyId: 'story-1',
        status: 'success',
        model: 'test-model',
      })

      const fullPath = path.join(testDir, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      expect(content).toContain('No summary provided')
      expect(content).toContain('No files listed')
      expect(content).toContain('No validation results provided')
      expect(content).toContain('No learnings recorded')
    })

    it('should handle missing optional fields in failure', async () => {
      const testDir = process.cwd()
      const filePath = await createProgressFile({
        storyId: 'story-1',
        status: 'failure',
        model: 'test-model',
      })

      const fullPath = path.join(testDir, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      expect(content).toContain('**Reason:** Unknown failure')
      expect(content).toContain('No attempt details provided')
      expect(content).toContain('No errors recorded')
      expect(content).toContain('No fix attempts recorded')
      expect(content).toContain('No recommendations provided')
    })

    it('should include ISO timestamp in file', async () => {
      const testDir = process.cwd()
      const filePath = await createProgressFile({
        storyId: 'story-1',
        status: 'success',
        model: 'test-model',
      })

      const fullPath = path.join(testDir, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      expect(content).toMatch(
        /\*\*Date:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      )
    })
  })
})
