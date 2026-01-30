/**
 * Tests for create-error.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createErrorIssue } from '../create-error'
import { execSync } from 'child_process'

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

describe('create-error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createErrorIssue', () => {
    it('should create a GitHub issue with all fields', async () => {
      const mockExecSync = vi.mocked(execSync)

      // Mock gh --version check
      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)

      // Mock gh issue create (returns string when encoding is specified)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/123' as any)

      const result = await createErrorIssue({
        storyId: 'story-5',
        error: 'Build failed with 3 TypeScript errors',
        context: 'Implementing user authentication feature',
        attempted: 'Added login component and auth service',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/123')

      // Verify gh issue create was called with correct params
      expect(mockExecSync).toHaveBeenCalledTimes(2)
      const createCall = mockExecSync.mock.calls[1][0] as string
      expect(createCall).toContain('gh issue create')
      expect(createCall).toContain('--repo trillium/ralph-cli')
      expect(createCall).toContain('[story-5] Error:')
      expect(createCall).toContain('--body-file')
      expect(createCall).toContain('--label bug')
    })

    it('should work with minimal fields (no context or attempted)', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/124' as any)

      const result = await createErrorIssue({
        storyId: 'story-10',
        error: 'npm test failed',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/124')
    })

    it('should truncate long error messages in title', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/125' as any)

      const longError = 'A'.repeat(100)
      await createErrorIssue({
        storyId: 'story-15',
        error: longError,
      })

      const createCall = mockExecSync.mock.calls[1][0] as string
      // Title should be truncated to 60 chars + "..."
      expect(createCall).toContain('[story-15] Error: ' + 'A'.repeat(60) + '...')
    })

    it('should throw error if gh CLI is not available', async () => {
      const mockExecSync = vi.mocked(execSync)

      // Mock gh --version check to fail
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('command not found: gh')
      })

      await expect(
        createErrorIssue({
          storyId: 'story-20',
          error: 'Some error',
        })
      ).rejects.toThrow('gh CLI is not available')
    })

    it('should throw error if gh issue create fails', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('gh: Not authenticated')
      })

      await expect(
        createErrorIssue({
          storyId: 'story-25',
          error: 'Some error',
        })
      ).rejects.toThrow('Failed to create GitHub issue')
    })

    it('should include context and attempted in body when provided', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/126' as any)

      const result = await createErrorIssue({
        storyId: 'story-30',
        error: 'Test error',
        context: 'Working on feature X',
        attempted: 'Tried approach Y',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/126')

      // Verify gh issue create was called with body-file
      const createCall = mockExecSync.mock.calls[1][0] as string
      expect(createCall).toContain('--body-file')
    })

    it('should not include context or attempted sections when not provided', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/127' as any)

      const result = await createErrorIssue({
        storyId: 'story-35',
        error: 'Test error',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/127')
    })
  })
})
