# BakedBot Treasury Service

**Status:** Internal Alpha (v0.1)
**Scope:** Autonomous treasury management and trading logic.

> [!WARNING]
> **STRICT SEPARATION REQUIRED**
> This module (`src/treasury`) is conceptually a separate service.
> *   Do **NOT** import `src/app` or customer data handling code into here.
> *   Do **NOT** expose treasury keys or logic to the public API.

## Directory Structure
*   `agents/`: Treasury-specific agents (e.g., Initializer, Workers).
*   `memory/`: Domain memory schemas, adapters, and the persistent `domain-memory.json`.
*   `policy/`: The "Deebo for Money" policy engine that validates all actions.
*   `strategies/`: Individual strategy implementations (Basis, DCA, Runway).

## Usage
Currently triggered via manual scripts or internal cron jobs (TBD).
See `docs/treasury-architecture.md` for full specification.
