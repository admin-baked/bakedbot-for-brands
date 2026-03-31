---
description: Execute a registered BakedBot workflow by ID — use when running a named workflow, listing available workflows, or triggering a dry-run or org-specific workflow execution. Trigger phrases: "run workflow", "execute workflow", "list workflows", "trigger workflow", "run the playbook runner", "dry run workflow".
---

# Workflow: Run a BakedBot Workflow

Execute a registered workflow by ID. Lists available workflows if no ID provided.

## Steps

### Step 1: List or identify workflow
If $ARGUMENTS is empty, run:
```
npx tsx scripts/workflow-cli.ts list
```
Present the list to the user.

Otherwise, use the first argument as the workflow ID.

### Step 2: Execute workflow
```
npx tsx scripts/workflow-cli.ts run <id>
```

If $ARGUMENTS contains "dry" or "dry-run": add `--dry-run` flag.
If $ARGUMENTS contains an org ID (like "org_thrive_syracuse"): add `--orgId=<orgId>`.

### Step 3: Report results
Show the execution summary: status, steps completed, duration, any failures.

## Flags
- If $ARGUMENTS contains "validate": run `npx tsx scripts/workflow-cli.ts validate <id>` instead of run
- If $ARGUMENTS contains "list": only run the list command
