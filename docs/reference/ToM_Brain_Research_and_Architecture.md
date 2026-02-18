# ToM Brain — Research + Architecture Brief

## Objective

Create a production-usable memory brain for ToM that can serve a larger AI system family.

## Why this stack

### 1) Local-first embeddings with Ollama

- Keeps sensitive knowledge local
- Avoids recurring external embedding API cost
- Allows model swaps with minimal code change

### 2) SQLite-backed vector memory

- File-based persistence is simple to move/backup
- Works well for MVP and medium corpora
- Can later migrate to specialized vector engines if corpus grows significantly

### 3) Brave web enrichment

- Adds current external signals to internal memory
- Keeps web findings as first-class indexed documents
- Enables planning workflows to combine internal lessons with fresh external context

### 4) Cron cycle orchestration

- Deterministic operation windows
- Predictable updates for dependent AI services
- Straightforward operations for homelab/self-hosted setups

## Data model

### Domains

- Learn
- Lesson
- Plan

### Memory entities

- **Document**: source metadata + checksum
- **Chunk**: text slice optimized for embedding/retrieval
- **Vector**: embedding + chunk payload for similarity search

## Retrieval approach

- Query string is embedded via Ollama
- Similarity search computes cosine similarity against all vectors
- Top-K chunks are returned with area, source type, and path

## Predetermined cycle contract

1. Validate model availability (`/api/tags`)
2. Index changed local docs (checksum-based incremental upsert)
3. Run configured Brave searches
4. Persist Brave snapshots and index them as web docs
5. Emit cycle report with indexed counts

## Extension roadmap (for the wider AI system)

1. Add a lightweight HTTP API wrapper around `ToMBrain`
2. Add RAG answer synthesis with citations
3. Add role-specific query profiles (Builder, Analyst, Security)
4. Add event bus hooks (publish cycle report to parent orchestrator)
5. Add migration path to Qdrant/LanceDB if memory volume increases

## Risks and controls

- **Risk**: Ollama unavailable during cycle  
  **Control**: health gate fails cycle early
- **Risk**: Brave key missing  
  **Control**: graceful skip of web enrichment
- **Risk**: stale documents  
  **Control**: checksum-driven incremental indexing

## Operational baseline

- Run cycle every 6 hours (`0 */6 * * *`) by default
- Keep models local: `nomic-embed-text` + optional chat model for future synthesis
- Keep `memory/` under local backup rotation
