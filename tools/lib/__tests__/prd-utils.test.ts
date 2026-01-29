/**
 * Tests for prd-utils.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  resolvePrdFile,
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
    delete process.env.RALPH_PRD_FILE
  })

  describe('resolvePrdFile', () => {
    it('should use explicit prdFile parameter first', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'custom.prd.json', { stories: [] })
      await createTestPrd(testDir, 'active.prd.json', { stories: [] })
      await createTestPrd(testDir, 'prd.json', { stories: [] })

      const resolved = await resolvePrdFile({ prdFile: 'custom.prd.json' })
      expect(resolved).toBe(path.join(testDir, 'custom.prd.json'))
    })

    it('should use RALPH_PRD_FILE environment variable second', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'env.prd.json', { stories: [] })
      await createTestPrd(testDir, 'active.prd.json', { stories: [] })

      process.env.RALPH_PRD_FILE = 'env.prd.json'

      const resolved = await resolvePrdFile({})
      expect(resolved).toBe(path.join(testDir, 'env.prd.json'))
    })

    it('should auto-detect active.prd.json third', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'active.prd.json', { stories: [] })
      await createTestPrd(testDir, 'prd.json', { stories: [] })

      const resolved = await resolvePrdFile({})
      expect(resolved).toBe(path.join(testDir, 'active.prd.json'))
    })

    it('should fallback to prd.json fourth', async () => {
      const testDir = process.cwd()
      await createTestPrd(testDir, 'prd.json', { stories: [] })

      const resolved = await resolvePrdFile({})
      expect(resolved).toBe(path.join(testDir, 'prd.json'))
    })

    it('should throw error if specified file not found', async () => {
      await expect(
        resolvePrdFile({ prdFile: 'nonexistent.json' })
      ).rejects.toThrow('Specified PRD file not found: nonexistent.json')
    })

    it('should throw error if no PRD file found', async () => {
      await expect(resolvePrdFile({})).rejects.toThrow(
        'No PRD file found. Expected'
      )
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
