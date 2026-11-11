---
name: smart-analyzer
description: A powerful deep-analysis skill for diagnosing bugs, tracing data flows, and performing light investigative tasks (database queries, log inspection, config validation, API debugging, queue tracing, cross-service tracing) with minimal token and context window usage. Trigger this skill whenever the user asks to analyze, debug, investigate, trace, diagnose, or audit any code, database, system behavior, or performance issue. Also trigger when they ask to "check", "look into", "find root cause", "why is this happening", or run any exploratory/read-only commands. For pure conceptual/architectural reasoning without needing to execute or inspect anything live, defer to deep-thinking instead (see Scope Boundary below). Production-safe design — always confirm destructive operations with the user before executing.
---

# Smart Analyzer

A precise, surgical analysis tool for deep debugging and light investigative tasks. Optimized for token efficiency and production safety.

## Scope Boundary (vs deep-thinking)

Both skills can trigger on words like "analyze" or "why is this happening" — use this rule to pick:

- **smart-analyzer**: the answer requires *executing* something (query, grep, read a file/log, hit an endpoint) to gather live evidence. If you'd need to run a command to know the answer, this is the skill.
- **deep-thinking**: the answer is reasoning over information already in context — architecture decisions, tradeoffs, design review, "should I use X or Y" — no execution needed.
- If a task starts as deep-thinking but reveals a need to verify against live system state (e.g. "should I refactor this — actually check first how many places call it"), switch into smart-analyzer for the verification step, then return to deep-thinking for the judgment call.

## Cross-Skill Handoff

smart-analyzer covers execution/investigation, not everything downstream of it. When the investigation's output naturally belongs to another skill's territory, hand off explicitly instead of trying to stretch smart-analyzer to cover it — use the target skill's own name/terminology so the handoff is unambiguous:

- Root cause confirmed, now need to weigh *which fix approach* (tradeoffs, architecture impact, "should we patch here or refactor upstream") → hand off to **deep-thinking**.
- Investigation reveals the actual gap is a missing/broken skill definition itself, not a code bug → hand off to **skill-creator**.
- Findings need to be written up as a formal report/document for someone else (not just chat output) → hand off to **docx** (or **pdf** if that's the requested format).
- Investigation involves reading/writing spreadsheet or tabular data as the core artifact (not just as a DB query aid) → hand off to **xlsx**.
- If mid-investigation you realize the current skill genuinely isn't the right fit, say so plainly: "This part is [architecture tradeoff / document writeup / etc.] rather than investigation — switching to [skill name]." Don't silently force smart-analyzer's workflow (hypothesis cycles, evidence gathering) onto a task it isn't built for.

## Using MCP / Connected Tools

Before defaulting to manual shell commands, check whether a connected MCP server or integration already covers what's needed — prefer it when it's a genuine fit, same as any other tool-priority decision in this skill:

- Investigating something that lives in a connected service (e.g. a doc, sheet, ticket, repo hosted on a connected integration) → use that integration's tool directly instead of trying to reconstruct the same data via shell/API calls.
- If a database, logging, or monitoring MCP connector is available and matches the system being investigated, prefer it over hand-rolled CLI commands — it's usually more reliable and gives structured results.
- If no connected tool fits, fall back to the native CLI/framework approach as described elsewhere in this skill — MCP is a preference when available, not a hard requirement.
- Don't reach for a connected tool just because it exists if a plain shell command is faster and sufficient (e.g. a local log grep doesn't need an MCP detour) — match the tool to the actual task, not the other way around.

## Keep Fixes Proportional (No Tech-Debt Creep)

Once root cause is found, the fix should match the size of the actual problem — this is case-dependent, not a fixed rule, but the default assumption should be minimal:

- If the root cause is genuinely a 2-3 line fix (e.g. one missing flag reset, one wrong condition, one null check), propose exactly that — don't wrap it in a new abstraction layer, don't refactor the surrounding function "while you're in there," don't introduce a new pattern/class/service for a single-point fix.
- Before proposing a larger fix, ask: is the larger scope actually required to fix *this* root cause, or is it a separate improvement riding along? If it's riding along, mention it separately as an optional suggestion — don't bundle it into the required fix.
- It's fine — sometimes necessary — for a fix to be large when the root cause itself is structural (e.g. a missing transaction boundary causing race conditions across multiple call sites, or a genuinely absent error-handling layer). In that case, say explicitly why the scope is justified: "this needs N files changed because the root cause isn't local, it's structural — here's why a 2-3 line patch wouldn't actually fix it."
- Red flag to catch yourself on: if you're about to introduce new files, new abstractions, new config, or touch more than the files directly implicated by the evidence — pause and check whether that's actually required by the root cause or just adding process/architecture the user didn't ask for.

## Core Principles

### 1. Deep Analysis (Like Deep-Thinking)

Before concluding, you MUST:
- **Trace data flow** — where data originates, how it transforms, where it ends up
- **Form multiple hypotheses** — at least 3 possible causes (don't limit yourself to A, B, X — explore as many as needed)
- **Falsify assumptions** — try to prove your initial guess wrong before accepting it
- **Gather minimal evidence** — use targeted queries, not full file reads

For heavy analysis, prefer whatever **context-efficient / sandboxed execution tools are actually available** in the current environment — exact names vary by setup, so pattern-match instead of hardcoding:
- Tools that run multiple commands in parallel/batch and return indexed output (instead of dumping everything into context)
- Tools that let you analyze/query a file's content without reading the whole file into context
- Tools that search an indexed knowledge base instead of grepping raw
- Any sandboxed execution tool meant for large-output tasks, where only a summary comes back to context

**Availability check (do this once per session, before relying on any such tool):**
1. Look at what's actually listed/callable in the current environment first — don't assume a specific tool name exists just because it existed in a previous project or environment.
2. If nothing matching that pattern is available, fall back to native equivalents: `read` with offset/limit for file analysis, direct shell commands for batch/parallel execution, manual `rg`/`grep` for search.
3. Never call a tool blind on the assumption it exists. If a call fails because the tool isn't there, don't retry it — switch to the native fallback immediately and continue.

### 2. Light Tasks (Token-Wise)

For quick investigative tasks like DB checks, log inspection, config validation:
- **Read-only first** — use SELECT/SHOW/DESCRIBE for DB, read only relevant sections for files
- **Single targeted query** > multiple broad queries
- **Summarize, don't dump** — return only relevant findings, not raw output
- **Use subagent for heavy lifting** — if output would be large, process in sandbox

Example light tasks:
```
Check MySQL (Go/Python/Node): python mysql_client.py "SELECT COUNT(*) FROM users WHERE active=0"
Check MySQL (Laravel/PHP): php artisan tinker --execute="DB::table('users')->where('active',0)->count()"
Check PostgreSQL (Rails/Ruby): rails runner "puts User.where(active: false).count"
Check MongoDB (Node): node -e "require('./db').users.countDocuments({active:false}).then(console.log)"
Check SQLite (Python): python -c "import sqlite3; print(sqlite3.connect('db.sqlite').execute('SELECT COUNT(*) FROM users WHERE active=0').fetchone())"
Check logs (pick by availability): rg "ERROR" app.log | tail -50   [if rg installed]
                                    Select-String "ERROR" app.log | Select-Object -Last 50   [Windows, PowerShell]
                                    findstr "ERROR" app.log   [Windows, no PowerShell — batch/cmd]
                                    grep "ERROR" app.log | tail -50   [Git Bash, last resort]
Check config: read lines 10-20 of config.json around redis_host key
```

**Auto-detect project type from:**
- `go.mod` → Go project, use mysql_client.py or direct SQL
- `artisan` / `composer.json` → Laravel, use php artisan
- `Gemfile` / `config/database.yml` → Rails, use rails runner or rake
- `package.json` + mongoose/sequelize → Node, use node -e or framework CLI
- `requirements.txt` + Django → Python, use python manage.py shell
- `Cargo.toml` → Rust, use direct SQL or diesel CLI
- `.csproj` → .NET, use dotnet ef or direct SQL

**Light task stopping condition:** if 2-3 targeted queries/greps come back empty or inconclusive, do not keep firing more shots in the dark. Escalate to Deep Analysis mode (Section 1: form hypotheses, trace data flow properly) instead of repeating light checks with minor variations.

### 3. Data Connection Safety

Before running ANY query against a database or external service:
- **Verify which connection is being used** — check the actual config/env file being loaded (`.env`, `config/database.yml`, `settings.py`, etc.), don't assume.
- **Never print raw credentials, connection strings, tokens, or secrets** in output, even when showing "which config is active" — mask them (e.g. `DB_PASSWORD=****`, show only host+port+db name).
- **Mask PII in query results** before showing them to the user — emails, phone numbers, password hashes, API tokens, session tokens. Show row counts / structure / non-sensitive columns instead of raw dumps. If the user explicitly needs to see a specific sensitive field for debugging, ask first.

### 4. Production Safety (Critical)

**ALWAYS ask user explicitly before executing:**
- ❌ `DELETE`, `UPDATE`, `DROP`, `TRUNCATE` — NEVER run without explicit permission
- ⚠️ `INSERT`, `CREATE INDEX`, `ALTER` — Ask first, but can proceed if user confirms

**Never implicitly run destructive queries**, even if user says "fix it" or "clean up".

**Safety pattern:**
```
User: "remove all inactive users"
You: "⚠️ This will DELETE rows from the users table. 
     Let me first check how many: SELECT COUNT(*) ...
     Found 15 inactive users. Proceed with DELETE? (yes/no)"
User: "yes"
You: Execute and report summary
```

### 5. Production/Semi-Production Detection

Environment detection is now a **two-step mandatory process** — auto-detect is a first pass only, it never substitutes for asking the human:

1. **Auto-detect signal**: check `APP_ENV`, `NODE_ENV`, `RAILS_ENV`, `.env` values, or hostname patterns as a first-pass signal.
2. **Mandatory human confirmation**: regardless of what the auto-detect signal says, explicitly ask the user to confirm the environment before any write operation. State what was auto-detected so the user can catch a misconfigured `.env`:
   ```
   Detected APP_ENV=production from .env — confirming with you: is this actually 
   production? (yes/no)
   ```
3. If the user doesn't respond → assume production-safe (read-only only).
4. Never skip step 2 just because auto-detect gave a clear signal — the whole point is catching cases where the config lies.

### 6. Destructive Operation Explanation & Audit Log (Mandatory)

Whenever a write/destructive operation is about to run, and again after it runs:

**Before executing**, explain in plain terms:
- What command/query will run (full text, not summarized)
- What table/collection/file it touches
- Expected scope (row count, files affected) from a prior read-only check

**After executing**, always report:
- Exact command that ran
- What data changed — old value → new value where feasible (e.g. `active: 0 → 1` for 12 rows), or the diff/count for bulk operations
- Timestamp of execution

```
✅ Executed: UPDATE fcm_tokens SET active=1 WHERE user_id=43
   Changed: 1 row — active: 0 → 1 (token: ...ab12, user_id: 43)
   Ran at: 2026-07-10 14:32:10
```

This applies even when the user says "just do it" — the explanation and post-execution log are not skippable, only the *confirmation prompt* can be skipped if the user has already said yes in the same turn.

## Investigation Scope Tiers

Five tiers, ordered by **how often you'll reach for them** (not by technical complexity — the most common/simplest case is Tier 1, the rarest/most complex is Tier 5). Anchor on Tier 1 first since it's the default case; escalate down the list only when the evidence demands it.

| Tier | Frequency | Scope | Example tools |
|------|-----------|-------|----------------|
| **1 — Sangat Tinggi** | Very common | Single value check | one query, one config line, one log grep |
| **2 — Tinggi** | Common | DB query / log inspection / config validation | `SELECT`, `rg`, read config section |
| **3 — Sedang** | Occasional | API/HTTP debugging, container/docker logs | `curl`, `docker logs`, endpoint testing |
| **4 — Rendah** | Uncommon | Queue/job failures, multi-file code trace | Laravel queue inspection, background worker logs, tracing across 3-5 files |
| **5 — Paling Rendah** | Rare | Cross-service / microservices / distributed tracing | tracing a request across multiple services, correlating logs by request ID across systems |

Start every investigation assuming Tier 1-2 is enough. Only move to Tier 3+ when the light-task stopping condition (Section 2) is hit or the problem is clearly structural (e.g. user explicitly mentions multiple services).

## Analysis Workflow

### Phase 1: Understand the Problem

1. Parse user's intent — what exactly needs analysis?
2. Ask clarifying questions if ambiguous
3. Identify which tool is appropriate: DB query, log grep, code trace, API check, queue check, cross-service trace, or architecture review
4. Identify which Investigation Scope Tier this likely falls into (see above) — this sets expectations for how much digging is normal

### Phase 2: Gather Intelligence

Use the **least expensive** tool first:

| Task | Best Tool | Why |
|------|-----------|-----|
| DB check (Go/Node/Python) | `python mysql_client.py "SELECT ..."` | Direct, fast, minimal output |
| DB check (Laravel/PHP) | `php artisan tinker` or `php artisan db` | Native to framework |
| DB check (Rails/Ruby) | `rails runner "..."` or `rails console` | Native to framework |
| DB check (Django/Python) | `python manage.py shell -c "..."` | Native to framework |
| DB check (.NET/C#) | `dotnet ef` or direct SQL | Framework-specific |
| Log grep | Pick by availability, in order: `rg` (ripgrep, if installed — fastest, cross-platform) → OS-native shell (Linux/Mac: `grep`; Windows: PowerShell `Select-String`) → Windows `findstr` (batch/cmd, if PowerShell unavailable) → Git Bash `grep` (last resort, only if nothing above works) | Use whichever is actually available rather than assuming one exists — `rg` first because it's fastest when present, native shell next since it needs no extra install, Git Bash only as a fallback since it depends on Git being installed |
| Code trace | `read` with offset/limit | Partial read, surgical |
| API/HTTP check | `curl -i` against the endpoint | Fast, shows headers + status + body |
| Container logs | `docker logs <container> --tail 100` | Scoped, avoids full log dump |
| Queue/job check | framework queue CLI (e.g. `php artisan queue:failed`) | Native, shows failure reason directly |
| Architecture | `grep` + symbol lookup | Structural overview |
| Cross-service trace | correlate by request/trace ID across service logs | Only reach for this at Tier 5 |
| Heavy analysis | `ctx_execute` / `ctx_batch_execute` (if available, else native fallback) | Sandboxed, auto-indexed |

### Phase 3: Form Hypothesis

State your hypothesis clearly in 1-2 sentences. Example:
```
Root cause hypothesis: The FCM token in fcm_tokens table has active=0 
because UpsertToken() doesn't reset the active flag when rebinding to a new user.
```

### Phase 4: Verify

- Run targeted verification command/query
- If hypothesis is wrong → backtrack immediately (don't keep digging in wrong direction)
- When confirmed → state root cause precisely with file path and line number

**Anti-loop safeguard (per investigation, resets each time the user raises a new question):**
- Default cap: 8 hypotheses per investigation.
- May extend up to 12 **only if** each additional hypothesis is showing real narrowing progress — meaning each one is actually ruled in or out by evidence you gathered, not just proposed.
- If you hit 12 (or hit 8 with no progress) → STOP.

**Honesty check before every hypothesis counts as "progress":** a hypothesis only counts as narrowing if you verified it against real evidence (query result, log line, code read) and got a clear ruled-in/ruled-out answer. If two or more hypotheses remain equally plausible after verification — evidence doesn't clearly favor A over B — that is NOT progress, that's a tie. Don't keep spinning up more hypotheses hoping one will "feel" more likely. Stop immediately and report the tie honestly:

```
I checked N hypotheses. Evidence rules out H1, H2, H4.
H3 and H5 are both still consistent with what I found — I can't tell them 
apart with what I have. To confirm: [specific check that would distinguish them, 
e.g. "can you check the value of X in production" or "does this happen on login 
or only on token refresh?"]
```

This applies at the cap too: if you hit 8-12 hypotheses and still have more than one live candidate, don't pick the one that "seems most likely" and present it as the answer. Present the tie, not a guess dressed up as a conclusion. Guessing and presenting it confidently is worse than admitting you don't know — the user needs to know the difference between "confirmed" and "my best guess."

## Output Format

### Deep Analysis Result

```
[Root Cause]
- `file.go:42` — UpsertToken() preserves active=false when rebinding device token

[Evidence]
- Database query: `SELECT * FROM fcm_tokens WHERE device_token='...'` shows user_id=43, active=0
- Code inspection: line 45 uses db.Save(token) which preserves existing fields

[Action Required] (proportional to root cause — see "Keep Fixes Proportional")
- Force `active=true` in UpsertToken() when updating existing token — 1-line fix, no refactor needed
- Add logout handler to deactivate token on user logout
```

### Light Task Result

```
✅ Table `users` has 150 active rows, 3 inactive
❌ Log shows 2 ERROR entries at 2026-06-07 14:32:05
ℹ️ Config key `REDIS_HOST` is set to 103.209.10.230:6379 (masked if sensitive)
```

### Production Safety Confirmation

```
⚠️ DESTRUCTIVE OPERATION
This will DELETE 15 rows from `users` table WHERE active=0.
Detected environment: production (from APP_ENV) — please confirm this is correct.
Proceed? (yes/no)
```

## Context Budget Rules

| Operation | Max Context Usage | Notes |
|-----------|------------------|-------|
| Single DB query | ~200 bytes output | Can exceed if result is critical |
| Code trace (4 files) | ~2000 bytes total | Can exceed for complex analysis |
| Log check (50 lines) | ~1000 bytes | Can exceed if pattern requires more context |
| Full analysis report | ~3000 bytes | Can exceed for deep root cause analysis |

**These are guidelines, not hard limits.** If the case requires more context to find the root cause, use it. Precision > token savings when debugging critical issues.

**If output would be very large (>10KB), use subagent or ctx_execute to process in sandbox and return only summary.**

## Anti-Patterns

❌ Reading entire file when 10 lines would suffice
❌ Running `SELECT *` on large tables without LIMIT
❌ Running destructive commands without explicit user confirmation
❌ Dumping full log files into context
❌ Over-analyzing simple questions (user asks "how many users?", don't trace through 5 files)
❌ **Crash-loop debugging** — trying hypothesis after hypothesis without progress (max 8, hard ceiling 12)
❌ **Repeating the same check** expecting different results (see light-task stopping condition)
❌ Printing raw credentials, tokens, or unmasked PII in output
❌ Assuming a `ctx_*` tool exists without checking, and retrying it after it fails once
❌ Skipping the mandatory human environment confirmation because auto-detect looked confident

**If stuck after hitting the hypothesis cap:**
- Stop and ask user for more context
- Admit uncertainty rather than guessing randomly
- Suggest alternative investigation approaches, including escalating to a higher Investigation Scope Tier if not already there

## Examples

### Example 1: Simple DB Check (Tier 1-2)

```
User: "cek berapa user yang aktif di database"
You: (detects Laravel project from artisan file)
     "php artisan tinker --execute=\"DB::table('users')->where('active',1)->count()\""
     Result: "✅ 150 active users"
```

### Example 2: Deep Bug Trace (Tier 4)

```
User: "kenapa notifikasi gak sampai pas ganti akun?"
You: 
1. Trace data flow: fcm_tokens table → user_id binding → UpsertToken logic
2. Form hypotheses:
   - H1: Token not registered for new user
   - H2: Token registered but inactive  
   - H3: Token rebind doesn't reset active flag ← LIKELY
   - H4: Notification service not detecting new user_id
   - H5: Frontend not calling register endpoint after login
3. Verify most likely hypothesis (H3): Check DB + code at fcm_token_repository.go
4. Report:
   [Root Cause] fcm_token_repository.go:45 — db.Save(token) preserves active=false
   [Evidence] Token exists for user 43 but active=0
   [Action] Force active=true on rebind
```

### Example 3: Production Safety Guard

```
User: "delete semua user yang expired"
You: "Detected APP_ENV=production. Confirming with you — is this actually production? (yes/no)"
User: "yes, production"
You: "⚠️ This is a DELETE operation. Let me check first.
     SELECT COUNT(*) FROM users WHERE expired=1
     → Found 27 expired users.
     
     This will DELETE 27 rows from production database.
     Proceed? (yes/no)"
User: "yes"
You: (executes and reports)
     "✅ Executed: DELETE FROM users WHERE expired=1
      Changed: 27 rows deleted (user_ids: 12, 45, 88, ...)
      Ran at: 2026-07-10 14:40:02"
```

### Example 4: Cross-Service Trace (Tier 5)

```
User: "order gak nyampe ke payment service, request-nya kemana ya?"
You:
1. This is Tier 5 — cross-service. Confirm request ID or correlation ID available.
2. Trace: order-service log (request_id=xyz) → queue/message broker → payment-service log
3. Check order-service: request logged, published to queue at 14:20:01
4. Check broker: message consumed by payment-service at 14:20:03
5. Check payment-service: no matching request_id found in logs → message likely dropped 
   or payment-service's consumer errored silently before logging
6. Report root cause with the gap pinpointed between broker delivery and payment-service intake
```
