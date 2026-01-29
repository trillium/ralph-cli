/**
 * Tests for is-complete.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkIsComplete } from '../is-complete'
import { useTestDir, createTestPrd, sampleStories } from './test-utils'

describe('is-complete', () => {
  const testEnv = useTestDir('is-complete')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('checkIsComplete', () => {
    it('should return "yes" if all stories are complete', async () => {
      const testDir = process.cwd()
      const completedStory1 = { ...sampleStories.critical, passes: true }
      const completedStory2 = { ...sampleStories.high, passes: true }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [completedStory1, completedStory2],
      })

      const result = await checkIsComplete({})
      const parsed = JSON.parse(result)
      expect(parsed.complete).toBe(true)
      expect(parsed.result).toBe('yes')
      expect(parsed.totalStories).toBe(2)
      expect(parsed.completedStories).toBe(2)
    })

    it('should return "no" if any story is incomplete', async () => {
      const testDir = process.cwd()
      const completedStory = { ...sampleStories.critical, passes: true }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [completedStory, sampleStories.high],
      })

      const result = await checkIsComplete({})
      const parsed = JSON.parse(result)
      expect(parsed.complete).toBe(false)
      expect(parsed.result).toBe('no')
      expect(parsed.remainingStories).toBe(1)
    })

    it('should return "yes" for empty stories array', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [],
      })

      const result = await checkIsComplete({})
      const parsed = JSON.parse(result)
      expect(parsed.complete).toBe(true)
      expect(parsed.result).toBe('yes')
    })

    it('should ignore blocked stories in completion check', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [sampleStories.blocked],
      })

      const result = await checkIsComplete({})
      const parsed = JSON.parse(result)
      // Blocked story still has passes: false, so should return "no"
      expect(parsed.complete).toBe(false)
      expect(parsed.result).toBe('no')
      expect(parsed.blockedStories).toBe(1)
    })

    it('should use specified PRD file', async () => {
      const testDir = process.cwd()
      const completedStory = { ...sampleStories.critical, passes: true }
      await createTestPrd(testDir, 'custom.prd.json', {
        stories: [completedStory],
      })

      const result = await checkIsComplete({ prdFile: 'custom.prd.json' })
      const parsed = JSON.parse(result)
      expect(parsed.complete).toBe(true)
      expect(parsed.result).toBe('yes')
    })

    it('should return "no" if passes is explicitly false', async () => {
      const testDir = process.cwd()
      const story = { ...sampleStories.critical, passes: false }
      await createTestPrd(testDir, 'active.prd.json', {
        stories: [story],
      })

      const result = await checkIsComplete({})
      const parsed = JSON.parse(result)
      expect(parsed.complete).toBe(false)
      expect(parsed.result).toBe('no')
    })
  })
})
