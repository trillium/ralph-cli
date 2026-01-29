/**
 * Tests for find-next.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { findNextStory } from '../find-next'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('find-next', () => {
  const testEnv = useTestDir('find-next')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('findNextStory', () => {
    it('should return full story details with attemptCount for highest priority story', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.medium, sampleStories.critical],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)

      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.title).toBe('Critical Story')
      expect(parsed.story.priority).toBe('critical')
      expect(parsed.story.attemptCount).toBe(0)
      expect(parsed.story.previousAttempts).toEqual([])
    })

    it('should include attempt data when story has previous attempts', async () => {
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

      const result = await findNextStory({})
      const parsed = JSON.parse(result)

      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.attemptCount).toBe(2)
      expect(parsed.story.previousAttempts).toEqual([
        'progress/story-1_attempt1.md',
        'progress/story-1_attempt2.md',
      ])
    })

    it('should skip completed stories', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.completed, sampleStories.high],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      // story-2 depends on story-1, and story-4 is completed
      // Since story-1 doesn't exist, story-2 should not be selected
      expect(parsed.available).toBe(false)
      expect(parsed.reason).toBe('no_stories_available')
    })

    it('should skip blocked stories', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.blocked, sampleStories.critical],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.priority).toBe('critical')
    })

    it('should respect dependencies', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [
          sampleStories.critical, // story-1, no deps
          sampleStories.high, // story-2, depends on story-1
        ],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      // Should select story-1 because story-2 depends on it
      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.title).toBe('Critical Story')
    })

    it('should select story when dependencies are satisfied', async () => {
      const testDir = process.cwd()
      const completedStory1 = { ...sampleStories.critical, passes: true }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [
          completedStory1, // story-1, completed
          sampleStories.high, // story-2, depends on story-1
        ],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      // story-2 should be selected because story-1 is complete
      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-2')
      expect(parsed.story.priority).toBe('high')
    })

    it('should return structured response if no stories available', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.completed, sampleStories.blocked],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      expect(parsed.available).toBe(false)
      expect(parsed.reason).toBe('no_stories_available')
      expect(parsed.message).toBe('All stories are either completed or blocked')
    })

    it('should prioritize by critical > high > medium > low', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [
          sampleStories.medium, // medium priority
          { ...sampleStories.high, dependencies: [] }, // high priority, no deps
          { ...sampleStories.critical, id: 'story-10' }, // critical priority
        ],
      })

      const result = await findNextStory({})
      const parsed = JSON.parse(result)
      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-10')
      expect(parsed.story.priority).toBe('critical')
    })

    it('should use specified PRD file', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'custom.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await findNextStory({ prdFile: 'custom.prd.json' })
      const parsed = JSON.parse(result)
      expect(parsed.available).toBe(true)
      expect(parsed.story.id).toBe('story-1')
      expect(parsed.story.title).toBe('Critical Story')
    })
  })
})
