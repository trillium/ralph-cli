# Migration Guide: Bash ralph.sh → TypeScript ralph-cli/tools/ralph.ts

## ✅ Migration Complete (January 28, 2026)

**The migration from bash to TypeScript is now complete!** All Ralph functionality has been rewritten in pure TypeScript with zero external dependencies.

## What Changed

### Before (Bash-dependent)

- Required `~/bashrc_dir/ralph/ralph.sh` to exist
- Most functions were bash wrappers calling external scripts
- Hardcoded `prd.json` filename
- Manual environment variable handling
- Limited error messages

### After (Pure TypeScript)

- ✅ Zero external dependencies
- ✅ All logic in TypeScript (testable and maintainable)
- ✅ Intelligent PRD file resolution (active.prd.json → prd.json)
- ✅ Automatic environment variable support
- ✅ Clear, descriptive error messages
- ✅ Modular architecture (each function in separate file)
- ✅ Full type safety

## New Features

### Automatic PRD File Detection

Ralph now automatically detects your PRD file with this priority:

1. Explicit parameter: `ralph_findNext({ prdFile: "custom.prd.json" })`
2. Environment variable: `RALPH_PRD_FILE=active.prd.json`
3. Auto-detect: `active.prd.json` (modern workflow)
4. Fallback: `prd.json` (legacy workflow)

### Active/Archive Workflow Support

Works seamlessly with projects using:

- Simple workflow: Single `prd.json` file
- Advanced workflow: `active.prd.json` + `archive.prd.json`

### Modular Architecture

Each function is now in its own file for better testability:

```
tools/lib/
├── types.ts              # Type definitions
├── prd-utils.ts          # Shared utilities
├── find-next.ts          # Story selection
├── get-details.ts        # Story details
├── get-attempts.ts       # Attempt tracking
├── record-failure.ts     # Failure recording
├── block-story.ts        # Story blocking
├── is-complete.ts        # Completion checking
└── create-progress.ts    # Progress files
```

## If You Were Using Bash Scripts

**No action required!** The TypeScript implementation is a drop-in replacement. All tool names and APIs remain the same.

If you were calling `ralph.sh` directly:

- Remove any references to `~/bashrc_dir/ralph/ralph.sh`
- The tools now work without any bash dependencies
- OpenCode will automatically use the TypeScript implementation

## Support

- Issues? See README.md for current documentation
- The bash scripts in `tmp/` are kept for reference only
