# Agent Guide — Sutradhaar 8-Agent System

> Last updated: 2026-04-13
> For: Viren (non-technical founder) + developers
> Written in: Plain English

---

## What Is This?

The NPN Filing Tool uses an **8-agent system** called Sutradhaar (the "master thread-holder"). Each agent is an **owner** — not a helper — of a specific part of the project. When you ask Claude Code a question, the right agent handles it based on its domain.

Think of it like a company with 8 department heads. Each one owns their department completely. When something changes in one department, it notifies the others that are affected.

---

## The 8 Agents

| # | Name | What They Own | File |
|---|---|---|---|
| 1 | **SUTRADHAAR** | Orchestration, routing, priorities | `agents/sutradhaar.md` |
| 2 | **SECURITY** | Login, permissions, audit logs, vault | `agents/security.md` |
| 3 | **DATABASE** | Data models, schema, migrations | `agents/database.md` |
| 4 | **COMPLIANCE** | Health Canada rules, Dr. Naresh | `agents/compliance.md` |
| 5 | **API** | All 53 web routes, LNHPD sync | `agents/api.md` |
| 6 | **FEATURE** | User interface, forms, buttons | `agents/feature.md` |
| 7 | **TESTING** | All 110+ tests, quality checks | `agents/testing.md` |
| 8 | **DOCUMENTS** | Templates, PDF generation, EN/FR | `agents/documents.md` |

---

## How to Use Agents

### Option 1: VS Code (Recommended)
1. Open VS Code with the NPN tool project
2. Click the **Claude icon** in the left sidebar
3. Type your question — Sutradhaar routes it to the right agent
4. Use `/sutradhaar-report` for a full system status

### Option 2: Terminal
1. Open a terminal in the `npn-tool/` folder
2. Run `claude`
3. Ask your question or run slash commands

### Slash Commands
| Command | What it does |
|---|---|
| `/sutradhaar-report` | Full system status — pulse, risks, agent status, recommendations |
| `/master-update` | Generate a prompt to notify all agents of a change |
| `/test-all` | Run all 110+ tests |
| `/test-security` | Run security tests only |
| `/test-import` | Run PDF import tests only |

---

## How to Edit Agent Behavior

**This is the key feature:** Every agent is a plain text file. You edit the file → the agent changes behavior. No code needed.

### Each Agent File Has These Sections

```
# AGENT [N]: [NAME]
> One-line description

## MY DOMAIN         ← What this agent owns
## MY RULES          ← How the agent behaves (EDIT THIS to change behavior)
## MY IMPROVEMENT QUEUE  ← What to build next (EDIT THIS to add work)
## MY OPEN RISKS     ← Current problems
## INBOUND IMPACT LOG    ← Notes FROM other agents affecting this one
## OUTBOUND IMPACT MAP   ← What THIS agent's changes affect in others
```

### How to Change Agent Behavior

**Example:** You want the Security agent to require 2FA for admin users.

1. Open `agents/security.md` in Notepad
2. Find the `## MY RULES` section
3. Add a new rule:
   ```
   - Admin users must complete 2FA before accessing settings or audit logs.
   ```
4. Save the file
5. Next time Security agent is activated, it follows this rule

### How to Add Work to an Agent

**Example:** You want the Feature agent to build a dark mode toggle.

1. Open `agents/feature.md` in Notepad
2. Find `## MY IMPROVEMENT QUEUE`
3. Add:
   ```
   7. Dark mode toggle — add light/dark theme switcher to header
   ```
4. Save the file
5. When you ask "what should Feature work on next?" — this item is in the queue

### How to Add Cross-Agent Notes

**Example:** Database agent changed the schema, and API agent needs to know.

1. Open `agents/api.md` in Notepad
2. Find `## INBOUND IMPACT LOG`
3. Add:
   ```
   - [DATABASE → me]: "Added reviewStatus field to Application model. API routes returning Application data need to include this field."
   ```
4. Save the file
5. API agent now knows about this change

---

## How the Master Update Works

When you make a significant change (new feature, bug fix, schema change):

1. Run `/master-update` in Claude Code
2. It generates a single prompt that describes what changed
3. You paste this prompt into each agent's context when you work with them
4. Each agent re-reads its domain, checks for impact, and reports back

**Format of a master update:**
```
## MASTER UPDATE — 2026-04-13

### CHANGE SUMMARY
[What was built or changed]

### INSTRUCTIONS FOR ALL AGENTS
1. Re-read your domain files for impact
2. REMINDER: Next.js 16 ≠ training data
3. Check your INBOUND IMPACT LOG
4. Check your OUTBOUND IMPACT MAP

### YOUR TASKS
- Update your improvement queue
- Update your CLAUDE.md section
- Flag any new risks
- Report back
```

---

## How the Impact Scoring Works

Before building any feature, Sutradhaar scores it across 5 dimensions:

| Dimension | Question |
|---|---|
| Security risk | HIGH / MEDIUM / LOW — does this touch auth, data access, or user roles? |
| Database impact | Does this need a schema migration? |
| API surface change | New routes? Breaking changes to existing routes? |
| NPN compliance impact | Does this touch ingredients, claims, dosage, or risk info? |
| Test coverage gap | Which test tags are affected? |

Anything **MEDIUM or above** is flagged in bold at the top of the response.

---

## The Sutradhaar System Report

When you run `/sutradhaar-report`, you get an 8-section report:

1. **Project pulse** — one sentence: healthy, fragile, or broken?
2. **Confirmed built and working** — what's live right now
3. **Vision backlog** — all 13 planned features with status
4. **Agent roster status** — each agent's health
5. **Cross-agent risks** — things that will break if not fixed
6. **NPN compliance exposure** — regulatory gaps
7. **Improvement queues** — top item per agent
8. **First recommendation** — the ONE most important thing to do next

---

## NPN Compliance Watchdog

This is a special rule that applies across ALL agents:

> When ANY feature touches medicinal ingredients, claims, dosage, risk information, or document generation — the Compliance agent is consulted BEFORE implementation. Sutradhaar flags this in the FIRST LINE of its response.

This ensures no regulatory data is changed without compliance review.

---

## Quick Reference

### "I want to change how an agent works"
→ Edit `## MY RULES` in its `agents/*.md` file

### "I want to add something to an agent's to-do list"
→ Edit `## MY IMPROVEMENT QUEUE` in its `agents/*.md` file

### "I want to see what's happening across all agents"
→ Run `/sutradhaar-report`

### "I made a big change and need to notify all agents"
→ Run `/master-update`

### "Which agent handles [topic]?"
→ Ask Sutradhaar: "Which agent owns [topic]?"

### "I want to add a 9th agent"
→ Ask Sutradhaar: "I need a new agent for [domain]" — it will generate the full prompt and file
