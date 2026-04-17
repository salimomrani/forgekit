# Feature Specification: Git Strategy Configuration for Vibe Workflow

## Overview

When users select "Vibe" workflow mode during ForgeKit project setup, add an additional prompt to determine their git strategy preference. This configuration should be written to the generated project's `settings.json` to guide Claude Code behavior.

## User Stories

### US1: Prompt for Git Strategy (P1)
As a user setting up a ForgeKit project with Vibe workflow, I want to be asked whether I'll use a PR-based workflow or push directly to master, so that my project's Claude Code configuration reflects my development process.

**Acceptance Criteria:**
- When user selects "Vibe" in the workflow selection prompt, a follow-up question appears
- Question offers two clear choices: "PR workflow" or "Direct push to master"
- User can select one of these options
- Selection is stored in the config and passed to the claude-code generator

### US2: Update settings.json with Git Strategy (P1)
As a user with a configured git strategy preference, I want the generated `settings.json` to include the `git.strategy` setting, so that Claude Code enforces the appropriate workflow.

**Acceptance Criteria:**
- If "PR workflow" is selected: `settings.json` contains `"git.strategy": "pr-required"`
- If "Direct push to master" is selected: `settings.json` contains `"git.strategy": "no-pr"`
- The setting is placed in the correct location in settings.json
- The setting is present in every generated project regardless of other options

## Implementation Notes

- The prompt should appear only when `workflowMode === "vibe"`
- The question should be asked during the main project configuration wizard (in `prompts/project.ts`)
- The answer should be stored in `ProjectConfig.gitStrategy` (new field)
- The claude-code generator should pass this value to the settings.json template
- Backward compatibility: Projects without this setting should default to "pr-required"
