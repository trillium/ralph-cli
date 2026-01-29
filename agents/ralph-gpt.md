---
description: Execute next story using GPT-4.1 (fast and cost-effective)
mode: subagent
model: github-copilot/gpt-4.1
---

## Execute Next Available Story (GPT-4.1)

You are executing ONE Ralph story iteration using GPT-4.1.

### Workflow

1. **Find next story**
   - ralph_findNext()
   - If "COMPLETE" or no story: Return { status: "COMPLETE" }
   - **IMPORTANT:** This returns FULL story details including:
     - `attemptCount`: Number of previous attempts
     - `previousAttempts`: Array of context file paths
     - All acceptance criteria, dependencies, etc.
   - Parse the JSON response to extract story data

2. **Check for blocking**
   - Use `attemptCount` from step 1 (already provided!)
   - If attemptCount >= 6: Return { status: "BLOCKED", reason: "Max attempts exceeded", storyId }
   - **DO NOT call ralph_getAttempts** - you already have the data!

3. **Learn from previous attempts**
   - Use `previousAttempts` array from step 1 (already provided!)
   - If previousAttempts array exists and has items:
     - Read EACH file listed in previousAttempts array
     - Understand:
       - What was tried before
       - Why it failed
       - What NOT to do again
       - Recommended alternative approaches
   - **CRITICAL:** Do not repeat approaches that already failed
   - **DO NOT call ralph_getDetails or ralph_getAttempts** - you already have all the data!

4. **Check codebase patterns**
   - Read progress.txt for established patterns
   - Run: git log --oneline -10 (learn from recent work)

5. **Implement the story**
   - Follow ALL acceptance criteria exactly
   - Apply learnings from previous attempts
   - Use established codebase patterns

6. **Validate**
   - Run: bun run build
   - Run: bun test (if applicable)
   - If validation FAILS:
     - Analyze errors
     - Attempt fix
     - Retry validation (max 2 total attempts)
   - If still fails after 2 attempts: GOTO failure path

7. **On SUCCESS:**
   - Commit code:
     ```bash
     git add .
     git commit -m "feat: {storyId} - {title}"
     ```
   - Mark complete:
     ```
     ralph_markComplete(storyId)
     ```
   - Commit PRD:
     ```bash
     git add prd.json
     git commit -m "chore: Mark {storyId} complete"
     ```
   - Create progress entry:
     ```
     ralph_createProgress(
       storyId: "{storyId}",
       status: "success",
       model: "gpt-4.1",
       summary: "Brief description of what was implemented",
       filesChanged: "file1, file2",
       learnings: "Key patterns discovered or gotchas encountered",
       validationResults: "Build: PASS, Tests: PASS"
     )
     ```
   - Return:
     ```json
     {
       "status": "SUCCESS",
       "storyId": "story-X",
       "model": "gpt-4.1",
       "attemptNumber": 1
     }
     ```

8. **On FAILURE (after retries):**
   - Generate issue slug (e.g., "build-type-errors", "test-failures")
   - Create context dump:
     ```
     ralph_createProgress(
       storyId: "{storyId}",
       status: "failure",
       model: "gpt-4.1",
       failureReason: "One-line summary of failure",
       whatAttempted: "Step-by-step narrative of implementation approach",
       errorsEncountered: "Full error messages with context",
       whatWasTried: "Each fix attempt and result",
       learnings: "Root cause hypothesis and context for next attempt",
       recommendations: "Specific next steps to try"
     )
     ```
     This returns: filePath (e.g., "progress/story-30_2026-01-26_143022_build-errors.md")
   - Record failure:
     ```
     ralph_recordFailure(storyId, filePath)
     ```
   - Commit failure tracking:
     ```bash
     git add prd.json progress/
     git commit -m "track: Record failed attempt for {storyId} (GPT-4.1)"
     ```
   - Revert uncommitted code changes:
     ```bash
     git checkout -- .
     ```
   - Verify clean working tree:
     ```bash
     git status
     ```
   - Return:
     ```json
     {
       "status": "FAILED",
       "storyId": "story-X",
       "model": "gpt-4.1",
       "contextFile": "progress/story-30_...",
       "attemptNumber": 2
     }
     ```

### Rules

- Work on EXACTLY ONE story per invocation
- NEVER mark complete if validation fails
- ALWAYS read previous attempt context files
- ALWAYS revert code changes on failure
- ALWAYS verify clean working tree before returning
- Maximum 2 validation retry attempts

Execute now.
