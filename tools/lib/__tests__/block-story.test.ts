/**
 * Tests for block-story.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { blockStory } from '../block-story'
import {
  useTestDir,
  createTestPrd,
  readTestPrd,
  sampleStories,
} from './test-utils'

describe('block-story', () => {
  const testEnv = useTestDir('block-story')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('blockStory', () => {
    it('should mark story as blocked', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      await blockStory({ storyId: 'story-1' })

      const prd = await readTestPrd(prdPath)
      const story = prd.stories[0]

      expect(story.blocked).toBe(true)
    })

    it('should add blockedAt timestamp', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const beforeTime = new Date().toISOString()
      await blockStory({ storyId: 'story-1' })
      const afterTime = new Date().toISOString()

      const prd = await readTestPrd(prdPath)
      const story = prd.stories[0]

      expect(story.blockedAt).toBeDefined()
      expect(story.blockedAt!).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(story.blockedAt! >= beforeTime).toBe(true)
      expect(story.blockedAt! <= afterTime).toBe(true)
    })

    it('should return success message', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      const result = await blockStory({ storyId: 'story-1' })
      expect(result).toBe("Story 'story-1' marked as blocked")
    })

    it('should throw error if story not found', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.critical],
      })

      await expect(blockStory({ storyId: 'nonexistent' })).rejects.toThrow(
        "Story 'nonexistent' not found"
      )
    })

    it('should use specified PRD file', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'custom.prd.json', {
        stories: [sampleStories.high],
      })

      await blockStory({ storyId: 'story-2', prdFile: 'custom.prd.json' })

      const prd = await readTestPrd(prdPath)
      expect(prd.stories[0].blocked).toBe(true)
    })

    it('should allow blocking already blocked story', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.blocked],
      })

      await blockStory({ storyId: 'story-5' })

      const prd = await readTestPrd(prdPath)
      expect(prd.stories[0].blocked).toBe(true)
    })
  })
})
