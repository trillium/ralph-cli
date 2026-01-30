/**
 * Tests for setup-advice.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSetupAdvice, validateConfig } from '../setup-advice'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('setup-advice', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ralph-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('validateConfig', () => {
    it('should throw error when ralph.config.json is missing', () => {
      expect(() => validateConfig(tempDir)).toThrow('Repository is not configured for Ralph CLI')
      expect(() => validateConfig(tempDir)).toThrow('Missing required file: ralph.config.json')
    })

    it('should not throw when ralph.config.json exists', () => {
      const configPath = join(tempDir, 'ralph.config.json')
      writeFileSync(configPath, JSON.stringify({ activePrdFile: 'active.prd.json' }))

      expect(() => validateConfig(tempDir)).not.toThrow()
    })

    it('should include setup instructions in error message', () => {
      try {
        validateConfig(tempDir)
      } catch (error: any) {
        expect(error.message).toContain('$schema')
        expect(error.message).toContain('activePrdFile')
        expect(error.message).toContain('ralph_setupAdvice()')
      }
    })
  })

  describe('getSetupAdvice', () => {
    it('should return setup instructions', async () => {
      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('Ralph CLI Setup Guide')
      expect(advice).toContain('Step 1: Create ralph.config.json')
      expect(advice).toContain('Step 2: Create your PRD file')
      expect(advice).toContain('Available Tools')
    })

    it('should show missing status when config is missing', async () => {
      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('❌ ralph.config.json missing')
      expect(advice).toContain('❌ active.prd.json missing')
      expect(advice).toContain('Setup incomplete')
    })

    it('should show found status when config exists', async () => {
      const configPath = join(tempDir, 'ralph.config.json')
      writeFileSync(configPath, JSON.stringify({ activePrdFile: 'active.prd.json' }))

      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('✅ ralph.config.json found')
    })

    it('should show found status when active.prd.json exists', async () => {
      const configPath = join(tempDir, 'ralph.config.json')
      const prdPath = join(tempDir, 'active.prd.json')
      writeFileSync(configPath, JSON.stringify({ activePrdFile: 'active.prd.json' }))
      writeFileSync(prdPath, JSON.stringify({ stories: [] }))

      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('✅ active.prd.json found')
      expect(advice).toContain('Repository is properly configured')
    })

    it('should show archive.prd.json as optional', async () => {
      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('archive.prd.json not found (optional)')
    })

    it('should show archive status when it exists', async () => {
      const archivePath = join(tempDir, 'archive.prd.json')
      writeFileSync(archivePath, JSON.stringify({ stories: [] }))

      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('✅ archive.prd.json found')
    })

    it('should list all available tools', async () => {
      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('ralph_findNext')
      expect(advice).toContain('ralph_getDetails')
      expect(advice).toContain('ralph_markComplete')
      expect(advice).toContain('ralph_error')
      expect(advice).toContain('ralph_suggest')
      expect(advice).toContain('ralph_addPrd')
    })

    it('should include documentation links', async () => {
      const advice = await getSetupAdvice({ cwd: tempDir })

      expect(advice).toContain('https://github.com/trillium/ralph-cli')
    })
  })
})
