# How to Give Agents Access to the createFailure Tool

The `createFailure` tool is **automatically available** to all agents - no special setup needed!

## What Agents Should Know

The `ralph_createFailure` tool is now available alongside other ralph tools like:

- `ralph_findNext`
- `ralph_createProgress`
- `ralph_markComplete`
- `ralph_recordFailure`
- etc.

## When to Use It

Tell agents to use `ralph_createFailure` when they encounter errors during story execution. It's a **simpler alternative** to `ralph_createProgress` for quick error documentation.

## Example Agent Instruction

Add this to agent instructions:

```markdown
### On FAILURE (Quick Error Reporting)

If you encounter an error and need to document it quickly:
```

ralph_createFailure({
storyId: "{storyId}",
error: "Brief description of the error",
context: "What was happening when the error occurred (optional)",
attempted: "What was attempted before the error (optional)",
model: "gpt-4.1" or "claude-sonnet-4.5"
})

```

This creates a failure document in `progress/` and returns the file path.
You can then call `ralph_recordFailure(storyId, filePath)` to track it.

**Alternative:** Use the full `ralph_createProgress` with `status: "failure"`
for more detailed failure documentation with specific fields.
```

## Suggested Update to ralph-gpt.md

You can simplify the failure path in `agents/ralph-gpt.md`:

```markdown
8. **On FAILURE (after retries):**

   **Option A - Quick Failure (Recommended for simple errors):**
```

const result = ralph_createFailure({
storyId: "{storyId}",
error: "Build failed with 5 TypeScript errors in auth module",
context: "Attempting to add strict null checks",
attempted: "Modified User.ts, AuthService.ts, Login.tsx",
model: "gpt-4.1"
})

```

**Option B - Detailed Failure (For complex failures):**
```

ralph_createProgress({
storyId: "{storyId}",
status: "failure",
model: "gpt-4.1",
failureReason: "One-line summary",
whatAttempted: "Detailed narrative",
errorsEncountered: "Full error messages",
whatWasTried: "Each fix attempt",
recommendations: "Next steps"
})

```

Then record and commit:
```

ralph_recordFailure(storyId, result.filePath)
git add prd.json progress/
git commit -m "track: Record failed attempt for {storyId} (GPT-4.1)"

```

```

## Summary

✅ **No configuration needed** - The tool is already available  
✅ **Tool name:** `ralph_createFailure`  
✅ **Auto-discovered** by OpenCode from `tools/ralph.ts`  
✅ **Works alongside** existing ralph tools

Just tell agents they can use `ralph_createFailure` for quick error reporting!
