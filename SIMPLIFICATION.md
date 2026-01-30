# Ralph CLI - Radical Simplification

## What Changed

Ralph has been radically simplified to embrace its nature as **personal software**.

### Before (Complex)
- Config files (ralph.config.json)
- Environment variables (RALPH_PRD_FILE_ACTIVE, RALPH_PRD_FILE_ARCHIVE, RALPH_PRD_FILE)
- Legacy fallbacks (prd.json, auto-detection)
- Optional parameters everywhere
- Complex resolution priority logic

### After (Simple)
- **Always uses `active.prd.json`** for current work
- **Always uses `archive.prd.json`** for completed stories
- No config files
- No environment variables
- No optional parameters
- No legacy support

## Why

The original "config file refactor" was overengineered. Ralph is personal software - it doesn't need to support every possible configuration. The complexity was making it harder to use and maintain.

## What Files Changed

### Core Changes
- `tools/lib/config.ts` - Radically simplified to just return constants
- `tools/lib/prd-utils.ts` - Removed all optional parameters and fallback logic
- `tools/lib/types.ts` - Removed obsolete option interfaces
- `tools/lib/mark-complete.ts` - Always archives (no in-place option)
- `tools/lib/find-next.ts` - No optional prdFile parameter
- `tools/lib/get-details.ts` - No optional prdFile parameter
- `tools/lib/get-attempts.ts` - No optional prdFile parameter
- `tools/lib/is-complete.ts` - No optional prdFile parameter
- `tools/lib/block-story.ts` - No optional prdFile parameter
- `tools/lib/record-failure.ts` - No optional prdFile parameter

### Tests
- `tools/lib/__tests__/prd-utils.test.ts` - Simplified to match new behavior
- `tools/lib/__tests__/config.test.ts` - Deleted (no longer needed)

### Cleanup
- Deleted `.env` file
- Deleted `ralph.config.json.example`
- Deleted CONFIG_REFACTOR.md (obsolete)

## Migration

If you were using Ralph with environment variables or custom config:

**Stop.** Just use `active.prd.json` and `archive.prd.json` in your project root.

That's it. No configuration needed.

## Benefits

1. **Simpler** - One way to do things
2. **Faster** - No config resolution logic
3. **Clearer** - Obvious where stories live
4. **Maintainable** - Less code to maintain
5. **Discoverable** - See the files right in your project root

## Philosophy

> "This is personal software!"

Ralph doesn't need to be configurable. It needs to be simple, fast, and reliable. The best configuration is no configuration.
