# O.X.I.D.E Rust Subsystem

This crate is the Rust scaffold for O.X.I.D.E in the ToM repository.

## What is included

- Rust library crate (`oxide_brain`)
- Minimal CLI entry (`oxide-brain-cli`)
- Module stubs:
  - `ollama`
  - `reasoning`
  - `policy`
  - `risk`
  - `patch_synthesis`
  - `validation`
  - `telemetry`

## Quick start

```bash
cd oxide-brain
cargo check
cargo run --bin oxide-brain-cli
```

## Purpose

This is a non-invasive foundation only. It does not change current TypeScript runtime behavior and is intended for iterative O.X.I.D.E implementation.

## Deterministic Ollama Adapter

The `ollama` module now includes a deterministic adapter configuration layer for O.X.I.D.E runtime hardening:

- local-only base URL validation (no remote inference endpoints)
- temperature cap (`<= 0.3`)
- token cap (`<= 2048`)
- retry cap (`<= 5`)
- timeout cap (`<= 30000ms`)

This provides config-level enforcement for `OXIDE-P3-001` while keeping runtime integration incremental.

## Safe-Mode No-Op Fallback

The adapter includes a safe-mode fallback for inference failure paths:

- inference errors resolve to `InferenceOutcome::SafeMode`
- fallback marks `autonomous_change_allowed = false`
- deterministic non-autonomous behavior is preserved under failure

This implements `OXIDE-P3-002` safety posture: inference failure cannot trigger autonomous change.

## Telemetry Fields

The adapter now emits structured inference telemetry with required fields:

- `determinism`
- `retryCount`
- `latencyMs`
- `correlationId`

Telemetry is emitted for both deterministic success and safe-mode failure outcomes.
