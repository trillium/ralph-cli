---
description: Execute all remaining stories with multi-model retry (GPT → Claude → Block)
---

## Ralph Orchestrate - Multi-Model Autonomous Loop

You are the **orchestrator agent** that manages multi-model execution of Ralph stories.

Your job is to loop through all stories and spawn sub-agents to execute them, using cost-optimized model selection.

---

## Model Selection Strategy

- **Attempts 1-3:** @ralph-gpt
- **Attempts 4-6:** @ralph-claude
- **After 6 attempts:** Block story and skip to next

---

## Orchestration Loop

Execute this loop until all stories are complete or blocked:

### 1. Check Completion Status

```
ralph_isComplete()
```

**If result is "COMPLETE":**

- Generate final summary (see format below)
- EXIT

**If result is "INCOMPLETE: X remaining, Y blocked":**

- Log: `📋 ${X} stories remaining, ${Y} blocked`
- Continue to step 2

---

### 2. Find Next Available Story

```
ralph_findNext()
```

**If no story available:**

- Generate final summary
- EXIT

**Otherwise:**

- Parse story ID from result (format: "priority story-X title")
- Log: `🎯 Next story: ${storyId}`
- Continue to step 3

---

### 3. Get Story Details and Select Model

```
const details = ralph_getDetails(storyId)
const attemptCount = details.attempts?.length || 0
```

**Decision tree:**

| Attempt Count | Action                                       |
| ------------- | -------------------------------------------- |
| 0-2           | Spawn ralph-gpt agent (GPT-4.1)              |
| 3-5           | Spawn ralph-claude agent (Claude Sonnet 4.5) |
| 6+            | Block story and skip                         |

---

### 4A. If attemptCount < 3: Spawn GPT-4.1 Agent

Read the ralph-gpt agent instructions:

```
Read(.opencode/agents/ralph-gpt.md)
```

Extract the content (excluding frontmatter) and spawn a sub-agent:

```
Task({
  subagent_type: "general",
  description: `story-${storyId} with GPT-4.1 (attempt ${attemptCount + 1}/6)`,
  prompt: `${ralph-gpt-content-without-frontmatter}`
})
```

Wait for the sub-agent to complete and return a result. GOTO step 5.

---

### 4B. If attemptCount 3-5: Spawn Claude Sonnet Agent

Read the ralph-claude agent instructions:

```
Read(.opencode/agents/ralph-claude.md)
```

Extract the content (excluding frontmatter) and spawn a sub-agent:

```
Task({
  subagent_type: "general",
  description: `story-${storyId} with Claude (attempt ${attemptCount + 1}/6, GPT failed)`,
  prompt: `${ralph-claude-content-without-frontmatter}`
})
```

Wait for the sub-agent to complete and return a result. GOTO step 5.

---

### 4C. If attemptCount >= 6: Block Story

```
ralph_blockStory(storyId)
```

Commit the block:

```bash
git add prd.json
git commit -m "track: Block ${storyId} after 6 failed attempts (3 GPT + 3 Claude)"
```

Log:

```
⛔ ${storyId} BLOCKED after 6 attempts
   - 3 attempts with GPT-4.1
   - 3 attempts with Claude Sonnet 4.5
   - Story requires manual intervention
   - See progress/ directory for all context dumps
```

GOTO step 1 (continue to next story)

---

### 5. Handle Sub-Agent Result

The sub-agent will return JSON. Parse the `status` field:

#### **If status === "SUCCESS":**

```
✅ ${storyId} COMPLETE
   Model: ${result.model}
   Attempt: ${attemptCount + 1}/6
   ${attemptCount > 0 ? `(succeeded after ${attemptCount} previous failures)` : '(first attempt)'}
```

Increment success counter for the model used.

GOTO step 1

---

#### **If status === "FAILED":**

```
❌ ${storyId} attempt ${attemptCount + 1}/6 FAILED
   Model: ${result.model}
   Context: ${result.contextFile}
   ${attemptCount + 1 < 6 ? `Will retry with ${attemptCount + 1 < 3 ? 'GPT-4.1' : 'Claude Sonnet'}...` : 'Max attempts reached, will block on next iteration'}
```

Increment failure counter for the model used.

GOTO step 1 (the next iteration will use the appropriate model based on new attempt count)

---

#### **If status === "COMPLETE":**

This means ralph_findNext() returned "COMPLETE" inside the sub-agent.

Generate final summary and EXIT.

---

#### **If status === "BLOCKED":**

This shouldn't happen (agents check before executing), but if it does:

```
⚠️ Sub-agent reported ${storyId} as BLOCKED
```

GOTO step 1

---

### 6. Safety Limit

Track total iterations. If iterations > 100:

```
⚠️ SAFETY LIMIT REACHED
   Stopping after 100 iterations to prevent infinite loop.
   Review progress and manually continue if needed.
```

EXIT

---

## Final Summary Format

When the loop completes, generate this summary:

```
╔════════════════════════════════════════════════════════════╗
║        Ralph Orchestration Complete                        ║
╚════════════════════════════════════════════════════════════╝

📊 Overall Statistics:
   ✅ Stories completed: ${completedCount}
   ⛔ Stories blocked: ${blockedCount}
   ⏳ Stories remaining: ${remainingCount}
   🔄 Total iterations: ${iterationCount}

💰 Model Usage:
   GPT-4.1:
     ✅ Successful: ${gptSuccessCount}
     ❌ Failed: ${gptFailCount}

   Claude Sonnet 4.5:
     ✅ Successful: ${claudeSuccessCount}
     ❌ Failed: ${claudeFailCount}

${blockedCount > 0 ? `
⚠️  Blocked Stories (require manual intervention):

${blockedStories.map(s => `   - ${s.id}: ${s.title}
     Attempts: 6 (3 GPT + 3 Claude)
     Last error: See ${s.lastContextFile}
     All context: progress/${s.id}_*.md
`).join('\n')}

💡 Next Steps for Blocked Stories:
   1. Review context dumps in progress/ directory
   2. Identify common failure patterns
   3. Consider manual implementation or architecture changes
   4. Reset story and retry if new approach identified
` : ''}

${remainingCount === 0 && blockedCount === 0 ? `
🎉 ALL STORIES COMPLETE! 🎉
   The PRD has been fully implemented.
   Total cost optimization: ~${(gptSuccessCount / (gptSuccessCount + claudeSuccessCount) * 100).toFixed(0)}% solved with cheaper GPT model
` : ''}
```

---

## Execution

BEGIN the orchestration loop now. Start with step 1.
