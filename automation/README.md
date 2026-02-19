---
summary: "O.X.I.D.E alignment index for automation operational docs"
owner: "O.X.I.D.E"
scope: "Directory governance for automation SOPs"
architecture_alignment:
  topology_phase: "planning"
  role: "technical subsystem"
read_when:
  - Reviewing automation docs for architecture consistency
  - Handing off O.X.I.D.E operational guidance
title: "Automation Directory Alignment"
---

# Automation Directory Alignment

This directory is aligned as O.X.I.D.E-owned automation operations documentation.

## Alignment Contract

- Ownership: O.X.I.D.E.
- Role: Technical subsystem under the ToM architecture.
- Scope: Operational SOPs and runbooks for automation behavior.
- Memory policy: These docs remain excluded from vector memory ingestion.
- Runtime policy: These docs are guidance artifacts and do not change runtime behavior by themselves.

## Document Map

- `auth-monitoring.md`: OAuth expiry and refresh monitoring playbook.
- `cron-jobs.md`: Cron scheduling, rollout, and health checks.
- `cron-vs-heartbeat.md`: Scheduler selection guidance.
- `hooks.md`: Event-driven hooks automation.
- `poll.md`: Poll sending and diagnostics.
- `webhook.md`: Webhook ingress and endpoint wiring.
- `troubleshooting.md`: Incident/runbook diagnostics for scheduler and delivery issues.
- `gmail-pubsub.md`: Gmail Pub/Sub integration pipeline.
- `github-report.md`: Generated sync artifact (informational snapshot; not an authoritative SOP).

## Review Notes

- Existing OpenClaw procedural content is preserved.
- Metadata now consistently indicates O.X.I.D.E ownership and planning-phase architecture alignment.
- Generated report files should not be manually edited unless converting to a formal runbook.
