---
name: deep-thinking
description: Use IMMEDIATELY whenever debugging complex/unintuitive bugs, OR interpreting ambiguous requests or instructions from anyone (client, boss, teammate, or the user themself) where the true intent or root cause isn't explicitly stated. MUST be used when precision is required or when the root cause is unclear. This skill forces a rigorous "deep research" phase to prevent jumping to obvious but wrong conclusions (e.g., assuming the issue is Parameter A or B, when it's actually deep in Parameter C or X). Acting as a stimulant for both weak and strong AI models, it guides the generation of highly precise, surgical code or interpretation. Works exceptionally well in tandem with the `hyper-focus-solver` skill.
---

# Deep-Thinking Framework

You are operating under the **Deep-Thinking Framework**. Your primary directive is to **refuse the obvious conclusion** until you have solid evidence.

This applies to two situations:
- **Debugging:** the reported symptom (Component A or B) is often not the real cause — the true root cause frequently lives in Component C, X, or a mismatch in data flow between components.
- **Interpreting ambiguous requests:** when someone (client, boss, teammate, or the user) gives an instruction that isn't fully explicit, don't default to the surface-level reading — dig for the actual intent behind it.

## 1. The Research Phase (Explore & Trace)

Before proposing a fix, writing code, or committing to an interpretation, you MUST:
- **Trace the flow:** For bugs, follow data from origin → transformation → output, not just the line throwing the error. For ambiguous requests, trace the underlying goal/context behind the ask, not just the literal wording.
- **Form multiple hypotheses:** Brainstorm a **minimum of 3** possible causes/interpretations. Labels are free-form (A, B, C... X, Y, Z, 0-9, or descriptive names) — there's no fixed cap. Keep generating only as long as genuinely new, plausible hypotheses are surfacing; don't pad the list once nothing new is left to add.
- **Gather context:** Use whatever search/read/inspection tools are available (file search, file reading, code search, config/schema inspection, etc.) rigorously — don't limit yourself to the immediate error site or the literal sentence.

## 2. The Verification Phase (Falsify & Confirm)

- Test each hypothesis against real evidence in the codebase/context.
- Actively try to prove your initial assumption *wrong* before accepting it. If you suspect the frontend, check what the backend is actually sending. If you suspect a simple reading of a request, check whether context elsewhere contradicts it.
- Consider **combined/systemic causes** — sometimes there's no single root cause; two components that are each individually "correct" can fail only when combined (e.g., race conditions, timing, conflicting assumptions). Don't force a single-point answer if the evidence points to an interaction.
- **Effort budget:** Research proportionally to complexity — a quick, clearly-scoped issue doesn't need exhaustive exploration; a genuinely tangled one deserves more. As a rough calibration, aim for the depth a focused human would reach in about 5 minutes of concentrated digging — enough steps to converge on solid evidence, not more. The moment evidence clearly converges on one root cause/interpretation, **stop researching** and move to execution. Don't re-check things you've already confirmed.

## 3. The Execution Phase (Precise, Surgical Action)

Once the true root cause (or true intent) is identified:
- Generate precise, exact code changes or a precise, exact interpretation/response.
- Avoid "shotgun debugging" — don't change multiple things hoping one sticks.
- Do not add defensive code, placebo functions, or hedged interpretations that don't directly address the proven root cause.
- No formal test-running is required (this is for live/production use) — but before declaring it solved, do a manual sanity trace: re-walk the logic/data path once more against the identified root cause to confirm it actually closes the gap, purely through reasoning over the code/data path.
- This sanity trace is manual reasoning ONLY. Do NOT execute any test command, test runner, or test suite (e.g. `php artisan test`, `npm test`, `pytest`, etc.) unless the user explicitly asks for it separately.
- **Read-only constraint:** the entire Research, Verification, and sanity-trace process must stay strictly read-only. Never run commands that insert, update, delete, migrate, seed, or otherwise mutate the database (or any other live state) — not even temporarily "to check something." Inspection only: read files, read schemas, read logs, read existing data. If confirming a hypothesis truly requires touching the database, stop and ask the user first instead of doing it yourself.
- **Synergy with Hyper-Focus-Solver:** Output the solution with zero fluff. State the true root cause/intent plainly, give the exact change or answer needed, and explain how it resolves the issue permanently.

## Output Format (always shown to the user, every time — not optional, not internal-only)

**[Deep Research]**
- Initial suspects considered (A, B, ...).
- What was traced / checked to test those suspects.
- What the evidence actually showed.

**[Root Cause]**
- The precise issue or true intent: `[exact parameter, line, logic failure, or interpretation]`.

**[Precise Action]**
- `[Exact surgical fix or exact answer, without fluff]`
