/**
 * Tests for create-suggestion.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSuggestionIssue } from '../create-suggestion'
import { execSync } from 'child_process'

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

describe('create-suggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSuggestionIssue', () => {
    it('should create a GitHub issue with all fields', async () => {
      const mockExecSync = vi.mocked(execSync)

      // Mock gh --version check
      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)

      // Mock gh issue create (returns string when encoding is specified)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/123' as any)

      const result = await createSuggestionIssue({
        storyId: 'story-5',
        suggestion: 'Add caching layer to improve performance',
        context: 'Working on database query optimization',
        rationale: 'Current queries are hitting the database on every request',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/123')

      // Verify gh issue create was called with correct params
      expect(mockExecSync).toHaveBeenCalledTimes(2)
      const createCall = mockExecSync.mock.calls[1][0] as string
      expect(createCall).toContain('gh issue create')
      expect(createCall).toContain('--repo trillium/ralph-cli')
      expect(createCall).toContain('[story-5] Suggestion:')
      expect(createCall).toContain('--body-file')
      expect(createCall).toContain('--label enhancement')
    })

    it('should work with minimal fields (no context or rationale)', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/124' as any)

      const result = await createSuggestionIssue({
        storyId: 'story-10',
        suggestion: 'Consider using a different approach',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/124')
    })

    it('should truncate long suggestion messages in title', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/125' as any)

      const longSuggestion = 'A'.repeat(100)
      await createSuggestionIssue({
        storyId: 'story-15',
        suggestion: longSuggestion,
      })

      const createCall = mockExecSync.mock.calls[1][0] as string
      // Title should be truncated to 60 chars + "..."
      expect(createCall).toContain('[story-15] Suggestion: ' + 'A'.repeat(60) + '...')
    })

    it('should throw error if gh CLI is not available', async () => {
      const mockExecSync = vi.mocked(execSync)

      // Mock gh --version check to fail
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('command not found: gh')
      })

      await expect(
        createSuggestionIssue({
          storyId: 'story-20',
          suggestion: 'Some suggestion',
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
        createSuggestionIssue({
          storyId: 'story-25',
          suggestion: 'Some suggestion',
        })
      ).rejects.toThrow('Failed to create GitHub issue')
    })

    it('should include context and rationale in body when provided', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/126' as any)

      const result = await createSuggestionIssue({
        storyId: 'story-30',
        suggestion: 'Test suggestion',
        context: 'Working on feature X',
        rationale: 'This would improve maintainability',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/126')

      // Verify gh issue create was called with body-file
      const createCall = mockExecSync.mock.calls[1][0] as string
      expect(createCall).toContain('--body-file')
    })

    it('should not include context or rationale sections when not provided', async () => {
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementationOnce(() => 'gh version 2.0.0' as any)
      mockExecSync.mockImplementationOnce(() => 'https://github.com/user/repo/issues/127' as any)

      const result = await createSuggestionIssue({
        storyId: 'story-35',
        suggestion: 'Test suggestion',
      })

      expect(result).toContain('Successfully created GitHub issue')
      expect(result).toContain('https://github.com/user/repo/issues/127')
    })
  })
})
