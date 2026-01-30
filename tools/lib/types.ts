/**
 * TypeScript type definitions for Ralph PRD structures
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export type StoryStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface Story {
  id: string
  title: string
  description: string
  priority: Priority
  passes: boolean
  blocked?: boolean
  blockedAt?: string
  completedAt?: string
  info?: string
  info2?: string
  acceptanceCriteria: string[]
  dependencies: string[]
  attempts?: string[]
}

export interface PrdDocument {
  project?: string
  description?: string
  stories: Story[]
}
