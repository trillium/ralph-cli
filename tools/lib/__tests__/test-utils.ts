/**
 * Test utilities and fixtures for Ralph tests
 */

import { promises as fs } from 'fs'
import path from 'path'
import { afterEach } from 'vitest'
import type { PrdDocument } from '../types'

/**
 * Create a temporary test directory
 */
export async function createTestDir(testName: string): Promise<string> {
  const tmpDir = path.join(
    process.cwd(),
    'tools',
    'lib',
    '__tests__',
    '.tmp',
    testName
  )
  await fs.mkdir(tmpDir, { recursive: true })
  return tmpDir
}

/**
 * Clean up test directory
 */
export async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await fs.rm(testDir, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a sample PRD file for testing
 */
export async function createTestPrd(
  dir: string,
  filename: string,
  prd: Partial<PrdDocument>
): Promise<string> {
  const fullPath = path.join(dir, filename)
  const defaultPrd: PrdDocument = {
    project: 'Test Project',
    description: 'Test project description',
    stories: [],
    ...prd,
  }
  await fs.writeFile(fullPath, JSON.stringify(defaultPrd, null, 2), 'utf-8')
  return fullPath
}

/**
 * Read PRD file from disk
 */
export async function readTestPrd(filePath: string): Promise<PrdDocument> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Sample story fixtures
 */
export const sampleStories = {
  critical: {
    id: 'story-1',
    title: 'Critical Story',
    description: 'This is a critical story',
    priority: 'critical' as const,
    passes: false,
    acceptanceCriteria: ['Should work correctly', 'Should be tested'],
    dependencies: [],
  },
  high: {
    id: 'story-2',
    title: 'High Priority Story',
    description: 'This is a high priority story',
    priority: 'high' as const,
    passes: false,
    acceptanceCriteria: ['Should implement feature'],
    dependencies: ['story-1'],
  },
  medium: {
    id: 'story-3',
    title: 'Medium Priority Story',
    description: 'This is a medium priority story',
    priority: 'medium' as const,
    passes: false,
    acceptanceCriteria: ['Should complete task'],
    dependencies: [],
  },
  completed: {
    id: 'story-4',
    title: 'Completed Story',
    description: 'This story is already complete',
    priority: 'high' as const,
    passes: true,
    completedAt: '2026-01-28T00:00:00.000Z',
    acceptanceCriteria: ['Was completed'],
    dependencies: [],
  },
  blocked: {
    id: 'story-5',
    title: 'Blocked Story',
    description: 'This story is blocked',
    priority: 'medium' as const,
    passes: false,
    blocked: true,
    blockedAt: '2026-01-28T00:00:00.000Z',
    acceptanceCriteria: ['Cannot proceed'],
    dependencies: [],
  },
}

/**
 * Auto-cleanup hook for tests
 */
export function useTestDir(testName: string) {
  let testDir: string | null = null
  let originalCwd: string

  return {
    async setup() {
      originalCwd = process.cwd()
      testDir = await createTestDir(testName)
      process.chdir(testDir)
      return testDir
    },
    async cleanup() {
      if (testDir) {
        process.chdir(originalCwd)
        await cleanupTestDir(testDir)
        testDir = null
      }
    },
  }
}
