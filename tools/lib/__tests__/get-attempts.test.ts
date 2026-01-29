/**
 * Tests for get-attempts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getStoryAttempts } from '../get-attempts'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('get-attempts', () => {
  const testEnv = useTestDir('get-attempts')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('getStoryAttempts', () => {
    it('should return JSON object with empty array if no attempts', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await getStoryAttempts({ storyId: 'story-1' })
      const parsed = JSON.parse(result)
      expect(parsed.found).toBe(true)
      expect(parsed.attempts).toEqual([])
      expect(parsed.count).toBe(0)
    })

    it('should return JSON object with list of attempts', async () => {
      const testDir = process.cwd()
      const storyWithAttempts = {
        ...sampleStories.critical,
        attempts: [
          'progress/story-1_attempt1.md',
          'progress/story-1_attempt2.md',
          'progress/story-1_attempt3.md',
        ],
      }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [storyWithAttempts],
      })

      const result = await getStoryAttempts({ storyId: 'story-1' })
      const parsed = JSON.parse(result)

      expect(parsed.found).toBe(true)
      expect(parsed.count).toBe(3)
      expect(parsed.attempts).toEqual([
        'progress/story-1_attempt1.md',
        'progress/story-1_attempt2.md',
        'progress/story-1_attempt3.md',
      ])
    })

    it('should return error object if story not found', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await getStoryAttempts({ storyId: 'nonexistent' })
      const parsed = JSON.parse(result)
      expect(parsed.found).toBe(false)
      expect(parsed.error).toContain("Story 'nonexistent' not found")
    })

    it('should use specified PRD file', async () => {
      const testDir = process.cwd()
      const storyWithAttempts = {
        ...sampleStories.high,
        attempts: ['progress/story-2_attempt1.md'],
      }
      await createTestPrd(testDir, 'custom.prd.json', {
        stories: [storyWithAttempts],
      })

      const result = await getStoryAttempts({
        storyId: 'story-2',
        prdFile: 'custom.prd.json',
      })
      const parsed = JSON.parse(result)

      expect(parsed.found).toBe(true)
      expect(parsed.attempts).toEqual(['progress/story-2_attempt1.md'])
    })
  })
})
