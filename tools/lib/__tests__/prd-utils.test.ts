/**
 * Tests for prd-utils.ts
 * Simplified - always uses active.prd.json and archive.prd.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  resolvePrdFile,
  resolveArchiveFile,
  readPrdFile,
  writePrdFile,
  findStoryById,
  findStoryIndexById,
} from '../prd-utils'
import {
  useTestDir,
  createTestPrd,
  readTestPrd,
  sampleStories,
} from './test-utils'

describe('prd-utils', () => {
  const testEnv = useTestDir('prd-utils')

  beforeEach(async () => {
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('resolvePrdFile', () => {
    it('should always return active.prd.json', async () => {
      const testDir = process.cwd()
      const resolved = await resolvePrdFile()
      expect(resolved).toBe(path.join(testDir, 'active.prd.json'))
    })
  })

  describe('resolveArchiveFile', () => {
    it('should always return archive.prd.json', async () => {
      const testDir = process.cwd()
      const resolved = await resolveArchiveFile()
      expect(resolved).toBe(path.join(testDir, 'archive.prd.json'))
    })
  })

  describe('readPrdFile', () => {
    it('should read and parse valid PRD file', async () => {
      const testDir = process.cwd()
      const prdPath = await createTestPrd(testDir, 'test.prd.json', {
        stories: [sampleStories.critical],
      })

      const prd = await readPrdFile(prdPath)
      expect(prd.stories).toHaveLength(1)
      expect(prd.stories[0].id).toBe('story-1')
    })

    it('should throw error if file not found', async () => {
      await expect(readPrdFile('/nonexistent/prd.json')).rejects.toThrow(
        'PRD file not found'
      )
    })

    it('should throw error if invalid JSON', async () => {
      const testDir = process.cwd()
      const invalidPath = path.join(testDir, 'invalid.json')
      await fs.writeFile(invalidPath, 'not valid json', 'utf-8')

      await expect(readPrdFile(invalidPath)).rejects.toThrow(
        'Invalid JSON in PRD file'
      )
    })

    it('should throw error if stories array missing', async () => {
      const testDir = process.cwd()
      const invalidPath = path.join(testDir, 'no-stories.json')
      await fs.writeFile(invalidPath, '{"project": "Test"}', 'utf-8')

      await expect(readPrdFile(invalidPath)).rejects.toThrow(
        'Invalid PRD structure: missing or invalid'
      )
    })
  })

  describe('writePrdFile', () => {
    it('should write PRD file atomically', async () => {
      const testDir = process.cwd()
      const prdPath = path.join(testDir, 'output.prd.json')

      const prd = {
        project: 'Test',
        description: 'Test project',
        stories: [sampleStories.critical],
      }

      await writePrdFile(prdPath, prd)

      const written = await readTestPrd(prdPath)
      expect(written.stories).toHaveLength(1)
      expect(written.stories[0].id).toBe('story-1')
    })

    it('should format JSON with 2-space indentation', async () => {
      const testDir = process.cwd()
      const prdPath = path.join(testDir, 'formatted.prd.json')

      const prd = {
        project: 'Test',
        description: 'Test',
        stories: [],
      }

      await writePrdFile(prdPath, prd)

      const content = await fs.readFile(prdPath, 'utf-8')
      expect(content).toContain('  "project": "Test"')
    })

    it('should clean up temp file on error', async () => {
      const invalidPath = '/nonexistent/dir/prd.json'
      const prd = { project: 'Test', stories: [] }

      await expect(writePrdFile(invalidPath, prd)).rejects.toThrow()
    })
  })

  describe('findStoryById', () => {
    it('should find story by ID', () => {
      const prd = {
        stories: [sampleStories.critical, sampleStories.high],
      }

      const story = findStoryById(prd, 'story-2')
      expect(story?.title).toBe('High Priority Story')
    })

    it('should return undefined if story not found', () => {
      const prd = { stories: [sampleStories.critical] }

      const story = findStoryById(prd, 'nonexistent')
      expect(story).toBeUndefined()
    })
  })

  describe('findStoryIndexById', () => {
    it('should find story index by ID', () => {
      const prd = {
        stories: [sampleStories.critical, sampleStories.high],
      }

      const index = findStoryIndexById(prd, 'story-2')
      expect(index).toBe(1)
    })

    it('should return -1 if story not found', () => {
      const prd = { stories: [sampleStories.critical] }

      const index = findStoryIndexById(prd, 'nonexistent')
      expect(index).toBe(-1)
    })
  })
})
