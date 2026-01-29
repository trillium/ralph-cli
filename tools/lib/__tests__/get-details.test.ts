/**
 * Tests for get-details.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getStoryDetails } from '../get-details'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('get-details', () => {
  const testEnv = useTestDir('get-details')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('getStoryDetails', () => {
    it('should return story details with attemptCount and previousAttempts', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await getStoryDetails({ storyId: 'story-1' })
      const parsed = JSON.parse(result)

      expect(parsed.found).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.title).toBe('Critical Story')
      expect(parsed.story.priority).toBe('critical')
      expect(parsed.story.acceptanceCriteria).toHaveLength(2)
      expect(parsed.story.attemptCount).toBe(0)
      expect(parsed.story.previousAttempts).toEqual([])
    })

    it('should include attemptCount and previousAttempts when story has attempts', async () => {
      const testDir = process.cwd()
      const storyWithAttempts = {
        ...sampleStories.critical,
        attempts: [
          'progress/story-1_attempt1.md',
          'progress/story-1_attempt2.md',
        ],
      }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [storyWithAttempts],
      })

      const result = await getStoryDetails({ storyId: 'story-1' })
      const parsed = JSON.parse(result)

      expect(parsed.found).toBe(true)
      expect(parsed.story.attemptCount).toBe(2)
      expect(parsed.story.previousAttempts).toEqual([
        'progress/story-1_attempt1.md',
        'progress/story-1_attempt2.md',
      ])
      expect(parsed.story.attempts).toHaveLength(2) // Original field still present
    })

    it('should return error object if story not found', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await getStoryDetails({ storyId: 'nonexistent' })
      const parsed = JSON.parse(result)
      expect(parsed.found).toBe(false)
      expect(parsed.error).toContain("Story 'nonexistent' not found")
    })

    it('should use specified PRD file', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'custom.prd.json', {
        stories: [sampleStories.high],
      })

      const result = await getStoryDetails({
        storyId: 'story-2',
        prdFile: 'custom.prd.json',
      })
      const parsed = JSON.parse(result)

      expect(parsed.found).toBe(true)
      expect(parsed.story.id).toBe('story-2')
      expect(parsed.story.title).toBe('High Priority Story')
    })
  })
})
