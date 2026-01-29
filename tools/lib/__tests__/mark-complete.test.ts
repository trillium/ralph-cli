/**
 * Tests for mark-complete.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { markStoryComplete } from '../mark-complete'
import type { PrdDocument } from '../types'

describe('mark-complete', () => {
  let testDir: string
  let originalCwd: string
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    // Create isolated test directory
    testDir = await mkdtemp(join(tmpdir(), 'ralph-mark-complete-test-'))
    originalCwd = process.cwd()
    originalEnv = { ...process.env }
    process.chdir(testDir)
  })

  afterEach(async () => {
    // Restore environment
    process.chdir(originalCwd)
    process.env = originalEnv

    // Clean up test directory
    await rm(testDir, { recursive: true, force: true })
  })

  describe('in-place completion (no archive)', () => {
    it('should mark story as complete in place when no archive exists', async () => {
      const prd: PrdDocument = {
        project: 'Test',
        stories: [
          {
            id: 'story-1',
            title: 'Test Story',
            description: 'Test',
            priority: 'high',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({ storyId: 'story-1' })

      expect(result).toContain('Successfully marked story')
      expect(result).toContain('story-1')
      expect(result).toContain('active.prd.json')

      const updated = JSON.parse(
        await readFile('active.prd.json', 'utf-8')
      ) as PrdDocument
      expect(updated.stories[0].passes).toBe(true)
      expect(updated.stories[0].completedAt).toBeDefined()
      expect(updated.stories).toHaveLength(1) // Story still in active
    })

    it('should mark story as complete in prd.json when no archive exists', async () => {
      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-2',
            title: 'Test Story 2',
            description: 'Test',
            priority: 'medium',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({ storyId: 'story-2' })

      expect(result).toContain('story-2')
      expect(result).toContain('prd.json')

      const updated = JSON.parse(
        await readFile('prd.json', 'utf-8')
      ) as PrdDocument
      expect(updated.stories[0].passes).toBe(true)
      expect(updated.stories).toHaveLength(1)
    })
  })

  describe('archive workflow', () => {
    it('should move story to archive when archive.prd.json exists', async () => {
      const prd: PrdDocument = {
        project: 'Test',
        stories: [
          {
            id: 'story-3',
            title: 'Archive Test',
            description: 'Test',
            priority: 'low',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      const archive: PrdDocument = {
        project: 'Test Archive',
        stories: [],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))
      await writeFile('archive.prd.json', JSON.stringify(archive, null, 2))

      const result = await markStoryComplete({ storyId: 'story-3' })

      expect(result).toContain('Successfully moved story')
      expect(result).toContain('story-3')
      expect(result).toContain('active.prd.json')
      expect(result).toContain('archive.prd.json')

      // Check active file - story should be removed
      const updatedActive = JSON.parse(
        await readFile('active.prd.json', 'utf-8')
      ) as PrdDocument
      expect(updatedActive.stories).toHaveLength(0)

      // Check archive file - story should be added
      const updatedArchive = JSON.parse(
        await readFile('archive.prd.json', 'utf-8')
      ) as PrdDocument
      expect(updatedArchive.stories).toHaveLength(1)
      expect(updatedArchive.stories[0].id).toBe('story-3')
      expect(updatedArchive.stories[0].passes).toBe(true)
      expect(updatedArchive.stories[0].completedAt).toBeDefined()
    })

    it('should create archive file if it does not exist when using explicit archiveFile param', async () => {
      const prd: PrdDocument = {
        project: 'Test',
        stories: [
          {
            id: 'story-4',
            title: 'Create Archive Test',
            description: 'Test',
            priority: 'high',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({
        storyId: 'story-4',
        archiveFile: 'archive.prd.json',
      })

      expect(result).toContain('Successfully moved story')

      // Archive file should now exist
      const archive = JSON.parse(
        await readFile('archive.prd.json', 'utf-8')
      ) as PrdDocument
      expect(archive.stories).toHaveLength(1)
      expect(archive.stories[0].id).toBe('story-4')
    })

    it('should use RALPH_PRD_FILE_ARCHIVE env var', async () => {
      process.env.RALPH_PRD_FILE_ARCHIVE = 'my-archive.prd.json'

      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-5',
            title: 'Env Var Archive Test',
            description: 'Test',
            priority: 'medium',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({ storyId: 'story-5' })

      expect(result).toContain('my-archive.prd.json')

      // Check that archive was created at env var path
      const archive = JSON.parse(
        await readFile('my-archive.prd.json', 'utf-8')
      ) as PrdDocument
      expect(archive.stories).toHaveLength(1)
      expect(archive.stories[0].id).toBe('story-5')
    })

    it('should prefer explicit archiveFile param over env var', async () => {
      process.env.RALPH_PRD_FILE_ARCHIVE = 'env-archive.prd.json'

      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-6',
            title: 'Priority Test',
            description: 'Test',
            priority: 'critical',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({
        storyId: 'story-6',
        archiveFile: 'explicit-archive.prd.json',
      })

      expect(result).toContain('explicit-archive.prd.json')
      expect(result).not.toContain('env-archive.prd.json')

      // Explicit archive should exist
      const archive = JSON.parse(
        await readFile('explicit-archive.prd.json', 'utf-8')
      ) as PrdDocument
      expect(archive.stories).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('should throw error when story not found', async () => {
      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-99',
            title: 'Other Story',
            description: 'Test',
            priority: 'low',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('active.prd.json', JSON.stringify(prd, null, 2))

      await expect(markStoryComplete({ storyId: 'story-404' })).rejects.toThrow(
        'not found'
      )
    })

    it('should throw error when PRD file does not exist', async () => {
      await expect(markStoryComplete({ storyId: 'story-1' })).rejects.toThrow(
        'No PRD file found'
      )
    })
  })

  describe('custom PRD file', () => {
    it('should work with custom prdFile parameter', async () => {
      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-7',
            title: 'Custom PRD Test',
            description: 'Test',
            priority: 'high',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('custom.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({
        storyId: 'story-7',
        prdFile: 'custom.prd.json',
      })

      expect(result).toContain('custom.prd.json')

      const updated = JSON.parse(
        await readFile('custom.prd.json', 'utf-8')
      ) as PrdDocument
      expect(updated.stories[0].passes).toBe(true)
    })

    it('should use RALPH_PRD_FILE_ACTIVE env var', async () => {
      process.env.RALPH_PRD_FILE_ACTIVE = 'my-active.prd.json'

      const prd: PrdDocument = {
        stories: [
          {
            id: 'story-8',
            title: 'Env Var PRD Test',
            description: 'Test',
            priority: 'medium',
            passes: false,
            acceptanceCriteria: ['test'],
            dependencies: [],
          },
        ],
      }

      await writeFile('my-active.prd.json', JSON.stringify(prd, null, 2))

      const result = await markStoryComplete({ storyId: 'story-8' })

      expect(result).toContain('my-active.prd.json')

      const updated = JSON.parse(
        await readFile('my-active.prd.json', 'utf-8')
      ) as PrdDocument
      expect(updated.stories[0].passes).toBe(true)
    })
  })
})
