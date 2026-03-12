---
description: Merge the current branch's PR, switch to the default branch, and clean up all merged/gone local and remote branches. Use when you want to merge a PR and clean up branches.
argument-hint: [pr-number] (optional — auto-detected from current branch if omitted)
---

## User Input

```text
$ARGUMENTS
```

## Task

Merge the current branch's PR and clean up all stale branches.

### Step 1 — Detect context

```bash
git rev-parse --abbrev-ref HEAD   # current branch
gh repo view --json defaultBranchRef -q '.defaultBranchRef.name'  # default branch (master or main)
```

### Step 2 — Merge the PR

If a PR number is provided in arguments, use it. Otherwise detect it from the current branch:

```bash
gh pr view --json number -q '.number'
```

Merge with:

```bash
gh pr merge <number> --merge --delete-branch
```

`--delete-branch` deletes the remote branch automatically.

### Step 3 — Switch to default branch and pull

```bash
git checkout <default-branch>
git pull
```

### Step 4 — Delete local merged branches

Delete all local branches that are fully merged into the default branch, excluding the default branch itself:

```bash
git branch --merged <default-branch> | grep -v "^\*" | grep -v "<default-branch>" | xargs -r git branch -d
```

### Step 5 — Delete local branches tracking deleted remotes (gone)

```bash
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -D
```

### Step 6 — Confirm

Show the current clean state:

```bash
git branch -vv
git log --oneline -3
```

Report to the user: which PR was merged, which branches were deleted (local + remote), and the current branch.
