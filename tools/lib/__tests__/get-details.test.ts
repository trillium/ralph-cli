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

    it('should respect prdFile parameter when explicitly provided', async () => {
      const testDir = process.cwd()
      // Create default PRD with one story
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })
      // Create alternate PRD with a different story
      await createTestPrd(testDir, 'other.prd.json', {
        stories: [{
          id: 'alternate-story',
          title: 'Alternate Story',
          description: 'In alternate PRD',
          priority: 'low' as const,
          acceptanceCriteria: ['done'],
        }],
      })

      // Without prdFile, should find story-1 in default active.prd.json
      const defaultResult = await getStoryDetails({ storyId: 'story-1' })
      const defaultParsed = JSON.parse(defaultResult)
      expect(defaultParsed.found).toBe(true)
      expect(defaultParsed.story.id).toBe('story-1')

      // With explicit prdFile, should find alternate-story in other.prd.json
      const altResult = await getStoryDetails({ storyId: 'alternate-story', prdFile: 'other.prd.json' })
      const altParsed = JSON.parse(altResult)
      expect(altParsed.found).toBe(true)
      expect(altParsed.story.id).toBe('alternate-story')
      expect(altParsed.story.title).toBe('Alternate Story')

      // With explicit prdFile, story-1 should NOT be found in other.prd.json
      const notFoundResult = await getStoryDetails({ storyId: 'story-1', prdFile: 'other.prd.json' })
      const notFoundParsed = JSON.parse(notFoundResult)
      expect(notFoundParsed.found).toBe(false)
    })

  })
})
