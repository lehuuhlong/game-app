# Task Assignment: Survey Explorer 1 (Logic & Clue Audit)

## Role & Mission
You are Explorer 1 in the Survey phase.
Your mission is to perform a thorough, read-only audit of the Nonogram game logic in `src/games/nonogram/` (types, engine/hook, clue calculation, line completion auto-checking, victory conditions, cell transitions, undo/redo state management, grid generators).

## Authoritative User Request
c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
Please view and read this file first!

## Investigation Scope
- `src/games/nonogram/` (all files: `types.ts`, `useNonogram*.ts`, `index.ts`, etc.)
- Specific focus on Requirement R1:
  - Clue generation: row clues and column clues calculation from grid/solution. Are they accurate? Any indexing or off-by-one errors? Empty row/col handling?
  - Line completion auto-checking: how completed rows/columns are detected, auto-crossed out, or marked. Are there logic bugs or false positives/negatives?
  - Victory condition evaluation: how win is triggered, does it compare correctly against the solution or clue requirements? Does it handle extra marks or false crosses?
  - Cell state transitions: empty -> filled -> crossed / flagged / marked.
- Document every bug found, root cause, exact line numbers, and recommended fix strategy.

## Working Directory
`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1/`
Write your findings to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1\handoff.md`.
Communicate back to orchestrator via `send_message` when complete.


## 2026-11-05T14:04:37Z
Sender: 30aefb17-8457-4163-9ce4-7310aa6b0402
Content:
You are Explorer 1 in the Survey phase.
Your working directory is: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1/
Please read your task DISPATCH file at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1\DISPATCH.md
and the authoritative request at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md

Mission:
Perform a deep, read-only investigation into the core Nonogram game logic in `src/games/nonogram/`:
- Clue generation: row and column clues calculation from grid/solution.
- Line completion auto-checking logic and detection.
- Victory condition evaluation.
- Cell state transitions and undo/redo handling.
- Any bugs or edge cases in the puzzle engine/generator.

Investigate thoroughly using view_file and search tools. Document every bug found with exact file path, line numbers, root cause, and concrete fix recommendation.
Write your structured findings to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1\handoff.md`.
When done, message the orchestrator (conversation ID 30aefb17-8457-4163-9ce4-7310aa6b0402) via send_message.
