# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-29

### Added
- Initial release as standalone package
- Model Context Protocol (MCP) server for Claude Code integration
- Package exports and files config for npm/Bun installation
- AGENTS.md guide for coding agents
- Pure TypeScript implementation (100% TypeScript, zero bash dependencies)
- Story management tools: `ralph_findNext()`, `ralph_getDetails()`, `ralph_markComplete()`
- Autonomous loop tool: `ralph_runLoop()`
- Active/archive PRD workflow support
- Progress tracking with `progress.txt`
- Slash commands: `/ralph` and `/ralph-orchestrate`

### Changed
- Migrated all functionality from bash to TypeScript
- Now uses semver versioning starting at 0.1.0

[Unreleased]: https://github.com/trillium/ralph-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/trillium/ralph-cli/releases/tag/v0.1.0
