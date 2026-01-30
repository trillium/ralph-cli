/**
 * Tests for record-failure.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { recordStoryFailure } from '../record-failure'
import {
  useTestDir,
  createTestPrd,
  readTestPrd,
  sampleStories,
} from './test-utils'

describe('record-failure', () => {
  const testEnv = useTestDir('record-failure')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('recordStoryFailure', () => {
    it('should add context file to attempts array', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      await recordStoryFailure({
        storyId: 'story-1',
        contextFilePath: 'progress/story-1_failure.md',
      })

      const prd = await readTestPrd(prdPath)
      const story = prd.stories[0]

      expect(story.attempts).toHaveLength(1)
      expect(story.attempts![0]).toBe('progress/story-1_failure.md')
    })

    it('should initialize attempts array if not exists', async () => {
      const testDir = process.cwd()
      const storyWithoutAttempts = { ...sampleStories.critical }
      delete (storyWithoutAttempts as any).attempts
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [storyWithoutAttempts],
      })

      await recordStoryFailure({
        storyId: 'story-1',
        contextFilePath: 'progress/story-1_first.md',
      })

      const prd = await readTestPrd(prdPath)
      expect(prd.stories[0].attempts).toBeDefined()
      expect(prd.stories[0].attempts).toHaveLength(1)
    })

    it('should append to existing attempts', async () => {
      const testDir = process.cwd()
      const storyWithAttempts = {
        ...sampleStories.critical,
        attempts: ['progress/story-1_attempt1.md'],
      }
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [storyWithAttempts],
      })

      await recordStoryFailure({
        storyId: 'story-1',
        contextFilePath: 'progress/story-1_attempt2.md',
      })

      const prd = await readTestPrd(prdPath)
      const story = prd.stories[0]

      expect(story.attempts).toHaveLength(2)
      expect(story.attempts![1]).toBe('progress/story-1_attempt2.md')
    })

    it('should return success message with attempt count', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await recordStoryFailure({
        storyId: 'story-1',
        contextFilePath: 'progress/story-1_failure.md',
      })

      expect(result).toBe("Recorded failure for story 'story-1' (attempt 1)")
    })

    it('should throw error if story not found', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      await expect(
        recordStoryFailure({
          storyId: 'nonexistent',
          contextFilePath: 'progress/nonexistent.md',
        })
      ).rejects.toThrow("Story 'nonexistent' not found")
    })

  })
})
