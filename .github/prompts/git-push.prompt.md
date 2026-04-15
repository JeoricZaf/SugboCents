---
description: "Stage all changes, write a commit message, and push to the remote git repository. Use when you want to commit and push your current work."
agent: "agent"
argument-hint: "Describe what you changed (e.g., fix encoding in dashboard, add new prompt files)"
tools: [execute, read]
---
Commit and push all current changes to the repository.

## Steps
1. Run `git status` to show what files have changed
2. Run `git diff --stat` to summarize what was modified
3. Based on the changes visible and the description provided, write a concise conventional commit message:
   - Format: `type(scope): short description`
   - Types: `feat`, `fix`, `style`, `refactor`, `chore`, `docs`
   - Examples: `chore(sw): bump cache to v18`, `fix(dashboard): correct emoji encoding`, `feat(prompts): add git-push prompt`
4. Run `git add .`
5. Run `git commit -m "<message>"`
6. Run `git push`
7. Report the result, including the branch pushed to and the remote URL

## Rules
- Do NOT use `--force` or `--no-verify`
- Do NOT amend previous commits
- If `git push` fails because no upstream is set, run `git push --set-upstream origin <current-branch>` instead
- If there is nothing to commit, report that and stop
- If git is not initialized, report the error and stop — do NOT run `git init` without user confirmation
