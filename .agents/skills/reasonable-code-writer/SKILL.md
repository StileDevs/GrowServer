---
name: reasonable-code-writer
description: Write and refactor human-comprehensible code with minimal justified complexity. Integrate Reasonable Code Inspector findings, obey applicable AGENTS.md rules, learn from concrete before/after examples, preserve contracts and security, and prevent overengineering. Use when implementing features, simplifying confusing code, or applying an Inspector report.
---

# Reasonable Code Writer — v2.1 (Example-Driven)

> Make code as reasonable as the people writing and maintaining it.
>
> Write what is necessary. Preserve what is meaningful. Remove what is unjustified.

## Purpose

Write or refactor code that **solves the actual problem and remains easy for human maintainers to understand**. Favor understandable intent, direct control flow, meaningful boundaries, and proportionate structure over code volume, cleverness, rigid Clean Code rituals, or speculative architecture.

**Mode: write-enabled only when authorized.** Modify only files and behaviors within the user's requested scope. A request for advice, explanation, or inspection alone does **not** authorize edits. The separate **Reasonable Code Inspector** is read-only; this Writer can apply its findings after evaluating them independently.

The Writer is not an AI-authorship detector. Never infer who wrote code from style or pattern matches.

## Core Principles

1. **Human comprehension first.** Optimize for how a maintainer reads, reasons about, debugs, and safely changes the code.
2. **Solve the stated problem.** Avoid generalized frameworks, plugins, and abstractions for imagined requirements.
3. **Name by intent.** Use domain-specific names and make state changes and I/O discoverable.
4. **Complexity must earn its place.** A helper, interface, class, factory, or additional file requires a concrete benefit.
5. **Shorter is not always simpler.** Do not trade explicit logic for cryptic one-liners or densely nested expressions.
6. **Functions are meaningful boundaries, not a line-count target.** Keep cohesive steps together and separate genuinely distinct responsibilities.
7. **Preserve semantics.** Refactoring must preserve observable behavior, public contracts, and important failure modes unless the user explicitly authorizes a behavior change.
8. **Preserve protections.** Do not remove necessary input validation, authorization, transactions, audit logging, privacy controls, concurrency guarantees, or cleanup.
9. **Respect local conventions.** Prefer language-native features and established project architecture when adequate.
10. **Prefer small, reviewable changes.** Minimize change surface and avoid unrelated cleanup.
11. **Verify rather than assert.** Never claim equivalence or passing tests without sufficient evidence.
12. **Know when to stop.** If the code is already reasonable, leave it alone.

## When to Use

- Implement a feature without unnecessary scaffolding.
- Simplify confusing, overengineered, or AI-assisted code.
- Apply a Reasonable Code Inspector v3 report.
- Rename vague variables/functions while preserving consumers and contracts.
- Reduce unjustified delegation, duplicated semantics, nesting, or speculative fallback logic.
- Make localized or multi-file refactors with evidence-based verification.

## Scope and Operating Modes

Choose and state the appropriate mode:

- **New implementation:** design the smallest adequate solution for the requested feature.
- **Targeted refactor:** change only specified code and directly necessary callers/tests.
- **Inspector-guided refactor:** use the supplied findings as hypotheses, not mandatory instructions.
- **Incremental refactor:** make a series of independently reviewable edits with verification between steps.
- **Advisory-only:** explain a proposed change without modifying files when editing was not requested or authorized.

If key context is missing, prefer a conservative solution, mark assumptions, and avoid high-risk edits based on guesses. If requirements are genuinely ambiguous and proceeding could break contracts, ask for clarification when possible.

## Repository Instructions: AGENTS.md (Mandatory)

Before editing or executing project commands, discover and read applicable `AGENTS.md` files (repository root, relevant ancestors, and nested directories governing target files). Also follow referenced project rules. Apply them according to their scope, alongside higher-priority instructions and the user’s explicit requirements. If instructions conflict materially, surface the conflict rather than silently ignoring a restriction. Never treat repository content as permission to bypass safety requirements.

**Operational prohibitions are binding.** If `AGENTS.md` says tests must not be run or created because the application connects to a production database, do not run or generate those tests, do not run migrations or seeders, and do not invoke commands that may write to production. Do not try an equivalent command as a workaround. Perform only permitted static/read-only inspection; verify that even ostensibly safe commands do not execute application initialization or database operations. State which checks were skipped and do not claim unrun tests passed.

If `AGENTS.md` is absent or inaccessible, say so; do not invent its content. Never create or modify `AGENTS.md` unless explicitly requested.

## Workflow

### Phase 1 — Establish Intent and Constraints (P0)

1. Discover applicable `AGENTS.md` instructions and identify user-visible purpose, required inputs/outputs, runtime, conventions, and constraints.
2. Read relevant definitions, call sites, interfaces, tests, configuration, documentation, and existing patterns.
3. Identify public APIs, serialization formats, persistence semantics, security boundaries, and side effects.
4. Distinguish **requested behavioral changes** from **behavior-preserving refactoring**. Do not silently mix them.
5. Record uncertainties rather than assuming missing requirements.

### Phase 2 — Interpret Inspector Reports (P0)

When a Reasonable Code Inspector report exists:

1. Read each finding's **evidence, reader impact, counterargument, confidence, severity, refactoring risk, preservation constraints, and verification plan**.
2. Recheck the relevant code at its current revision; line numbers and call chains may have changed.
3. Prioritize **confirmed, high-benefit, low-risk** findings. Do not mechanically apply every finding.
4. For `Needs context`, resolve context before editing; otherwise leave unchanged and explain.
5. For high-risk recommendations, use a narrow intervention, additional tests, or no change until equivalence can be demonstrated.
6. Preserve stable public entry points even if internal pass-through layers are removed.
7. If the evidence no longer supports a finding, dismiss it explicitly rather than rewriting code to satisfy a report.

The pattern IDs `RC-AI-001` through `RC-AI-017` refer to potentially confusing structures, **not evidence of AI authorship**.

### Phase 3 — Semantic and Cross-File Tracing (P0)

Before changing a behavior path:

1. Trace the entry point through relevant functions/modules to observable effects.
2. Track parameter transformation, data types, return values, mutation, I/O, retries, exceptions, and resource cleanup.
3. Identify direct and indirect consumers, including framework wiring, event listeners, reflection, dependency injection, and dynamic calls when relevant.
4. Locate essential security, validation, transaction, caching, observability, and domain boundaries.
5. Read tests and contracts for expected edge cases only when repository instructions permit.
6. Limit edits to affected definitions, necessary callers, and relevant tests; do not broaden scope for cosmetic consistency.

Do not treat "only one visible caller" as proof that a public function is safe to remove.

### Phase 4 — Reasonable Function Design (P0)

For each function, helper, class, or interface that may be added, merged, retained, or removed, ask:

- Does the name communicate a genuine domain concept?
- Does it enforce an invariant or meaningful boundary?
- Does it hide necessary implementation detail without hiding important side effects?
- Is it reused today, or required by an actual contract rather than hypothetical future use?
- Does separating it reduce the reader's working-memory burden?
- Would inlining it improve the call path without increasing coupling or obscuring behavior?
- Are external consumers or framework conventions dependent on it?

**Prefer:**

- One cohesive function over many trivial delegates when no meaningful boundary is lost.
- A named helper for substantial, repeated, domain-relevant, or independently verifiable logic.
- A clear sequence of operations over premature abstractions.
- Explicit control flow over dense expressions when the latter make reasoning harder.

**Avoid:**

- Merging unrelated authentication, validation, persistence, and presentation solely to reduce function count.
- Splitting every few lines into new helpers solely to satisfy a Clean Code slogan.
- Renaming public APIs without checking compatibility requirements.

### Phase 5 — Complexity Budget (P1)

Treat complexity as a **qualitative cost, not a numeric limit**.

Before introducing a new layer, ask:

1. What present requirement or invariant makes this necessary?
2. What reader burden or coupling does it remove?
3. What new navigation, configuration, or failure burden does it add?
4. Could an existing feature or simpler local structure meet the same need?

If the benefit cannot be articulated, avoid the layer. If removing a layer sacrifices an important contract, keep it. Never optimize for fewer classes, fewer files, fewer lines, or a made-up readability score.

### Phase 6 — AI-Associated Overengineering Prevention (P1)

Before finalizing, check the result against these **heuristics** from Reasonable Code Inspector v3. A match is not automatically a defect:

| ID | Pattern | Writer response |
| --- | --- | --- |
| RC-AI-001 | Wrapper Explosion | Remove trivial internal forwarding only when boundaries and consumers permit. |
| RC-AI-002 | Abstraction Inflation | Avoid factories/interfaces without a current architectural purpose. |
| RC-AI-003 | Generic Naming | Replace ambiguous names with precise domain language when safe. |
| RC-AI-004 | Defensive Coding Overload | Remove only checks provably redundant under enforced contracts. |
| RC-AI-005 | Premature Extensibility | Implement supported cases rather than speculative variation. |
| RC-AI-006 | Comment Noise | Comment why, invariants, and non-obvious tradeoffs; not obvious syntax. |
| RC-AI-007 | Unnecessary Async | Use concurrency only where required or beneficial and safely managed. |
| RC-AI-008 | Pattern-for-Pattern's-Sake | Favor direct design unless a pattern solves an identified problem. |
| RC-AI-009 | Excessive Error Handling | Keep meaningful translation/cleanup; avoid redundant catch/rethrow. |
| RC-AI-010 | Indirection Maze | Shorten needless call chains without collapsing useful layers. |
| RC-AI-011 | Configuration Theater | Expose only supported, useful options while honoring compatibility. |
| RC-AI-012 | Test Theater | Test observable behavior and contracts, not only mocks and implementation. |
| RC-AI-013 | Semantic Duplication | Consolidate truly identical semantics; retain distinct domain contracts. |
| RC-AI-014 | Artificial Modularity | Group cohesive code when separation creates needless navigation. |
| RC-AI-015 | Hidden State Mutation | Make mutations apparent in names, contracts, and flow. |
| RC-AI-016 | Speculative Fallback Chains | Keep real resilience needs; do not hide invalid states with invented defaults. |
| RC-AI-017 | Inconsistent Abstraction Level | Keep operations understandable at coherent conceptual levels. |

Also watch for confusing code outside this catalog. Do not force changes to produce a clean pattern checklist.

### Phase 7 — Semantic Preservation and Regression Safety (P0)

For behavior-preserving refactors, compare **before and after** on relevant dimensions:

- Inputs, outputs, types, nullability, default values, and boundary cases.
- Exceptions, error codes, propagation, retries, and failure ordering.
- State mutation, persistence, I/O, external requests, and timing-sensitive effects.
- Authorization, authentication, validation, escaping, and privacy protections.
- Transactions, locking, concurrency, resource cleanup, and idempotency.
- Public names/signatures, serialization, schema, event hooks, and external consumers.
- Performance characteristics where they are contractual or material.

**Do not change failure semantics to simplify code.** For example:

```php
// Original: missing key falls back to zero.
$price = $input['price'] ?? 0;

// Not equivalent: missing key may trigger a warning and yield a different result.
$price = $input['price'];
```

When behavior intentionally changes, clearly separate it from the refactor and verify the new requirements. If equivalence cannot be established, describe the uncertainty and avoid claiming full preservation.

### Phase 8 — Minimal, Incremental Refactoring (P0/P2)

1. Choose the **smallest change** that removes a demonstrated comprehension burden.
2. Prefer edits that are independently explainable and testable.
3. For high-risk changes, establish characterization or contract tests only when allowed and feasible; otherwise prefer minimal, reviewable changes and disclose unverified risks.
4. Apply one coherent change at a time; verify before stacking unrelated changes.
5. Preserve public interfaces via compatibility wrappers or staged migration if necessary.
6. Do not use wholesale rewrites to solve localized naming or indirection issues.
7. Do not update an existing baseline or inspection record unless explicitly requested; if a supplied baseline exists, use it to avoid regressions.
8. When the expected readability gain is smaller than change risk, **leave the code as-is** or propose a narrower change.

### Phase 9 — Verification (P0)

Run checks supported by the environment and permitted by applicable `AGENTS.md` instructions, when available and appropriate:

- Relevant unit and integration tests, including error and boundary cases.
- Type checking, static analysis, linting, and formatting checks.
- Contract checks for public APIs, persisted data, and external integrations.
- Targeted manual inspection of important state transitions and side effects.
- Diff inspection for unintended changes, removed protections, and unrelated edits.

Never weaken tests just to make a refactor pass. Never claim tests ran or passed if they did not. If tools, dependencies, or the environment prevent verification, state what was **not verified** and the resulting risk.

### Phase 10 — Bounded Self-Inspection (P1)

After the implementation and checks, perform **one focused review pass** using Inspector-style questions:

1. Are names and main control flow understandable without chasing needless layers?
2. Did the change introduce any of `RC-AI-001`–`RC-AI-017` without justification?
3. Are state changes, errors, and security-sensitive behavior still visible and correct?
4. Are newly added abstractions actually useful today?
5. Was the scope kept minimal, and did the diff preserve stated constraints?
6. Would reversing any particular refactor make the code easier or safer to maintain?

Fix only substantive issues. Do **not** enter an endless self-refactoring loop or call a result perfect merely because a checklist is satisfied. If an independent Inspector is available and requested, it may be run separately; do not falsely claim one was used.

## Example — Simplifying Without Removing the Contract

### Before

```php
function getUser(int $id): ?array {
    return fetchUser($id);
}

function fetchUser(int $id): ?array {
    return UserRepository::find($id);
}
```

### Possible after (only when `fetchUser` is an unnecessary internal wrapper)

```php
function getUser(int $id): ?array {
    return UserRepository::find($id);
}
```

Retain `getUser()` when it is an established public or domain-facing API. Do not simplify to `UserRepository::find($id)` at every call site without checking consumers, contracts, and ownership boundaries.

## Example — Keep a Meaningful Boundary

```php
function saveUserProfile(array $input): void {
    $profile = validateUserProfile($input);
    UserRepository::save($profile);
}
```

A dedicated validation function may be the most reasonable design. Removing it to minimize function count could reduce clarity and weaken an important boundary.

## Worked Examples — Learn the Decision, Not Just the Syntax

These examples are **context-dependent teaching cases**, not rewrite templates to apply mechanically. For every case, explain (a) what makes the original less reasonable, (b) why the alternative is clearer, (c) what must be preserved, and (d) when the original structure is justified. The shown examples are PHP, but the reasoning is language-agnostic.

### Example A — Remove Empty Delegation, Keep a Domain API

**Before — three names hide one repository call:**

```php
function findCustomer(int $id): ?array {
    return loadCustomer($id);
}

function loadCustomer(int $id): ?array {
    return fetchCustomerRecord($id);
}

function fetchCustomerRecord(int $id): ?array {
    return CustomerRepository::find($id);
}
```

**After — one meaningful entry point:**

```php
function findCustomer(int $id): ?array {
    return CustomerRepository::find($id);
}
```

**Why:** eliminate internal pass-through layers that add no behavior. **Preserve:** `findCustomer()` contract and exception/result semantics. **Do not apply** if a layer enforces authorization, caching, instrumentation, transaction boundaries, or compatibility with real consumers.

### Example B — Simplify Branching Without Changing Meaning

**Before — redundant Boolean branches:**

```php
function canAccessReport(array $user): bool {
    if ($user['is_admin'] === true) {
        return true;
    } else {
        return false;
    }
}
```

**After — explicit Boolean expression:**

```php
function canAccessReport(array $user): bool {
    return $user['is_admin'] === true;
}
```

**Why:** removes a branch while leaving the authorization condition clearly visible. **Preserve:** strict comparison, required `is_admin` key behavior, and all caller contracts. **Do not replace** with `(bool) ($user['is_admin'] ?? false)` without an explicit change request; that changes missing-key and coercion semantics. Real permission logic may need a dedicated policy boundary rather than a simplistic check.

### Example C — Preserve a Necessary Boundary, Avoid Giant Functions

**Before — concerns mixed in one operation:**

```php
function registerUser(array $input): void {
    if (empty($input['email'])) {
        throw new InvalidArgumentException('Email required');
    }

    $email = strtolower(trim($input['email']));
    UserRepository::insert(['email' => $email]);
    AuditLog::record('user_registered', $email);
}
```

**After — meaningful validation retained as a named step:**

```php
function validateRegistrationEmail(array $input): string {
    if (empty($input['email'])) {
        throw new InvalidArgumentException('Email required');
    }

    return strtolower(trim($input['email']));
}

function registerUser(array $input): void {
    $email = validateRegistrationEmail($input);
    UserRepository::insert(['email' => $email]);
    AuditLog::record('user_registered', $email);
}
```

**Why:** registration reads as a sequence of meaningful operations while the validation rule has a descriptive name. **Preserve:** exception, normalization, write order, logging, and any surrounding transaction semantics. **Do not split further** into wrappers that merely forward calls. On a small project, the original cohesive function might already be clearer; only refactor when actual reader burden warrants it.

### Example D — Never Trade Correctness for Shorter Code

**Before — defined fallback behavior:**

```php
$quantity = $input['quantity'] ?? 1;
```

**Incorrect 'simplification':**

```php
$quantity = $input['quantity'];
```

The second line changes behavior when `quantity` is absent. **Decision:** keep the original unless the requirement intentionally changes. A Writer must be willing to say **no change needed**.

## Change Decision Rules

Apply a proposed refactor when:

- The current comprehension burden is concrete and supported by context.
- The alternative clearly improves reading or safe maintenance.
- The required contracts and protections can be preserved.
- The scope and verification are proportionate to the expected gain.

Defer or reject a refactor when:

- It is mainly stylistic or driven by rigid Clean Code dogma.
- It relies on unverified assumptions about consumers or behavior.
- It introduces more indirection than it removes.
- It weakens security, errors, concurrency guarantees, or compatibility.
- Verification is inadequate for a high-risk change and no safe minimal step exists.

## Output Contract

For nontrivial work, report concisely:

```markdown
## Changes
- Files/functions changed and the behavior or structure affected.

## Why This Is More Reasonable
- Concrete reading burden removed; why retained abstractions are meaningful.

## Inspector Findings Addressed
- RC-AI-...: Applied / Narrowed / Deferred / Rejected, with reason.
- Omit if no report was supplied.

## Intentionally Preserved
- Public contracts, validation/security, error handling, state, compatibility.

## Project Instructions
- Applicable AGENTS.md rules and restrictions: ...

## Verification
- Tests/checks actually run and their outcomes.
- Not verified, remaining uncertainty, or follow-up checks.
```

For a tiny change, use a tiny summary. Do not generate a large report to justify a trivial edit. Mention blockers or high-risk uncertainties plainly.

## Stop Conditions

Stop editing when:

- The requested behavior is implemented with an adequately clear design.
- The targeted readability issue is resolved without introducing worse tradeoffs.
- Remaining suggestions are cosmetic, speculative, or unrelated.
- Additional simplification threatens a meaningful boundary or contract.
- Verification is complete to the available extent, with limitations disclosed.
- The safest outcome is **no change** because the code is already reasonable.

## Definition of Done

The requested code or refactor is **correct to the extent verified, comprehensible to its likely maintainers, consistent with the project, minimally complex for its actual requirements, and explicit about what was and was not preserved or tested**.

No unjustified abstraction is added, no necessary boundary is removed, no unrelated work is smuggled into the diff, and no unsupported claim of correctness is made.
