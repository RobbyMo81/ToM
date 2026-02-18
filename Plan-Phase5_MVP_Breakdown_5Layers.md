# Phase 5.X: AlwaysOnAssistant MVP Deployment Plan
## 5 Phases, 1 Layer Each → Local Dev → GitHub → VPS

**Strategy:** Develop locally, commit per phase, deploy to VPS incrementally.

---

# Phase 5.X.1: Foundation Layer

## Objective
Establish baseline OpenClaw + UI + Telegram + SQLite infrastructure.

## Scope

**What gets implemented:**
```
✅ OpenClaw gateway running (Node.js)
✅ UI accessible locally
✅ Telegram integration (token, channel setup)
✅ SQLite event log (schema only, no data yet)
✅ Sector ETF watchlist (hardcoded list of 11 ETFs)
✅ Docker-compose.yml (foundation services)
```

**What's deferred:**
```
❌ Ollama (Phase 5.X.2)
❌ Safety gates (Phase 5.X.3)
❌ Nightly jobs (Phase 5.X.4)
❌ Alpaca (Phase 5.X.5)
```

## Technical Details

### SQLite Schema (event_log table)

```sql
-- Core event log (immutable append-only)
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL, -- 'proposal', 'approval', 'execution', 'outcome'
  entity_type TEXT, -- 'trade', 'position', 'memory', 'alert'
  entity_id TEXT,
  content JSON, -- flexible: {proposal, decision, result, etc}
  user_id TEXT, -- who triggered (UI, Telegram, system)
  channel TEXT, -- 'ui', 'telegram', 'cron'
  status TEXT, -- 'pending', 'approved', 'executed', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sector ETF reference (hardcoded for MVP)
CREATE TABLE sector_etfs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT UNIQUE NOT NULL, -- 'XLK', 'XLF', etc
  name TEXT,
  sector TEXT, -- 'Technology', 'Financials', etc
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert 11 sector ETFs
INSERT INTO sector_etfs (ticker, name, sector) VALUES
  ('XLK', 'Technology Select Sector SPDR', 'Information Technology'),
  ('XLF', 'Financials Select Sector SPDR', 'Financials'),
  ('XLV', 'Health Care Select Sector SPDR', 'Health Care'),
  ('XLC', 'Communication Services Select Sector SPDR', 'Communication Services'),
  ('XLY', 'Consumer Discretionary Select Sector SPDR', 'Consumer Discretionary'),
  ('XLI', 'Industrials Select Sector SPDR', 'Industrials'),
  ('XLP', 'Consumer Staples Select Sector SPDR', 'Consumer Staples'),
  ('XLE', 'Energy Select Sector SPDR', 'Energy'),
  ('XLB', 'Materials Select Sector SPDR', 'Materials'),
  ('XLRE', 'Real Estate Select Sector SPDR', 'Real Estate'),
  ('XLU', 'Utilities Select Sector SPDR', 'Utilities');
```

### Sector ETF Configuration (hardcoded in .env.trading)

```env
# Sector ETF Watchlist (MVP - hardcoded)
SECTOR_ETFS=XLK,XLF,XLV,XLC,XLY,XLI,XLP,XLE,XLB,XLRE,XLU
SECTOR_ETF_MODE=swing_trading
MAX_TRADES_PER_DAY=20
```

### Telegram Integration (.env.trading)

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE
TELEGRAM_ALERTS_ENABLED=true
```

### Docker-Compose (Phase 5.X.1)

```yaml
version: '3.8'

services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE:-openclaw:local}
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
      CLAUDE_WEB_SESSION_KEY: ${CLAUDE_WEB_SESSION_KEY}
      CLAUDE_WEB_COOKIE: ${CLAUDE_WEB_COOKIE}
      # Phase 5.X.1 additions
      DATABASE_URL: sqlite:///home/node/.openclaw/alwaysonassistant.db
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID}
      SECTOR_ETFS: ${SECTOR_ETFS}
    volumes:
      - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
    ports:
      - "${OPENCLAW_GATEWAY_PORT:-18789}:18789"
    init: true
    restart: unless-stopped
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND:-lan}",
        "--port",
        "18789",
      ]

  chromadb:
    image: chromadb/chroma:1.5.0
    volumes:
      - chromadb_data:/chroma
    ports:
      - "8000:8000"

volumes:
  chromadb_data: {}
```

## Files to Create/Modify

**Create:**
- `src/database/sqlite.ts` — SQLite connection + schema initialization
- `src/config/sector-etfs.ts` — ETF list + configuration
- `src/integrations/telegram.ts` — Telegram bot setup
- `src/models/event-log.ts` — Event logging class
- `.env.example.trading` — Trading-specific environment variables

**Modify:**
- `docker-compose.yml` — Add DATABASE_URL, Telegram env vars
- `package.json` — Add sqlite3 + telegraf dependencies
- `.gitignore` — Exclude .env.trading, *.db files

## Local Development Workflow

**Step 1: Set up local environment**
```bash
cd D:\Documents\alwaysonassistant

# Copy example to working .env.trading
cp .env.example.trading .env.trading

# Fill in your values:
# TELEGRAM_BOT_TOKEN=xxxx
# TELEGRAM_CHAT_ID=xxxx
# OPENCLAW_GATEWAY_TOKEN=xxxx (generate: openssl rand -hex 32)
```

**Step 2: Initialize SQLite database**
```bash
npm install sqlite3 telegraf
npm run build
npm run db:init  # Creates tables + inserts sector ETFs
```

**Step 3: Test locally (docker-compose)**
```bash
docker compose up -d
curl http://localhost:18789/  # Should respond

# Test Telegram integration
# Send test message via Telegram (manually configured)
```

**Step 4: Verify event log**
```bash
sqlite3 ~/.openclaw/alwaysonassistant.db
> SELECT * FROM sector_etfs;
(should show 11 ETFs)
```

## Testing Checklist

- [ ] Docker compose starts without errors
- [ ] OpenClaw gateway responds on :18789
- [ ] SQLite database created + schema correct
- [ ] Sector ETF list populated (11 rows)
- [ ] Telegram bot responds to test message
- [ ] Event log entries created for startup events

## GitHub Commit

```bash
git add src/database/ src/config/ src/integrations/ src/models/
git add docker-compose.yml .env.example.trading
git add package.json package-lock.json

git commit -m "Phase 5.X.1: Foundation layer
- SQLite event log schema
- Sector ETF configuration (11 ETFs)
- Telegram integration (token-based)
- Updated docker-compose.yml

Test: docker compose up + Telegram message"
```

## Success Criteria

✅ OpenClaw gateway starts  
✅ SQLite event log created with proper schema  
✅ 11 sector ETFs loaded in database  
✅ Telegram bot responds to messages  
✅ Event log records startup events  
✅ Code committed to GitHub  

## What's Next

Phase 5.X.2 will add Ollama integration on top of this foundation.

---

# Phase 5.X.2: Ollama Integration Layer

## Objective
Add Mistral:7b LLM for Tier 0 tasks (heartbeats, summaries, intent detection, memory cleanup).

## Scope

**What gets implemented:**
```
✅ Ollama container (Mistral:7b model)
✅ Ollama API integration (Python or Node.js SDK)
✅ Tier 0 task routing (classify requests, summarize, extract)
✅ Memory cleanup job (Job N4 - basic, hardcoded)
✅ Heartbeat system (Ollama health checks)
```

**What's deferred:**
```
❌ Safety gates (Phase 5.X.3)
❌ Job N1 (Daily Grade - requires trading logic)
❌ Job N2 (News/Catalyst - requires research sources)
❌ Job N3 (Improve Plan - requires Tier 1 analysis)
❌ Alpaca (Phase 5.X.5)
```

## Technical Details

### Ollama Container Setup

**Docker-compose addition:**
```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  environment:
    OLLAMA_HOST: 0.0.0.0:11434
  volumes:
    - ollama_data:/root/.ollama
  init: true
  restart: unless-stopped
  # Note: First startup downloads Mistral:7b (~4.1 GB)

volumes:
  ollama_data: {}
```

### Ollama Model Initialization

**Dockerfile addition (or shell script):**
```bash
# After Ollama container starts, pull Mistral:7b
# This runs on first deploy

ollama pull mistral:7b
# Downloads ~4.1 GB, ~5-10 minutes on first run
```

### Tier 0 Task Routing (Intent Detection)

```typescript
// src/services/ollama-tier0.ts

import Ollama from 'ollama';

class OllamaTier0 {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      host: 'http://localhost:11434'
    });
  }

  // Task: Classify user intent
  async classifyIntent(message: string): Promise<string> {
    const prompt = `Classify this trading message as one of: 
    [propose_trade, market_question, memory_query, other]
    
    Message: "${message}"
    
    Classification:`;

    const response = await this.ollama.generate({
      model: 'mistral:7b',
      prompt,
      stream: false,
    });
    
    return response.response.trim();
  }

  // Task: Summarize trading rationale
  async summarizeTrade(tradeNotes: string): Promise<string> {
    const prompt = `Summarize this trade rationale in 1-2 sentences:
    ${tradeNotes}
    
    Summary:`;

    const response = await this.ollama.generate({
      model: 'mistral:7b',
      prompt,
      stream: false,
    });
    
    return response.response.trim();
  }

  // Task: Extract structured fields from Telegram message
  async extractFields(message: string): Promise<object> {
    const prompt = `Extract JSON from this trading request:
    ${message}
    
    Expected JSON: {ticker: string, action: 'buy'|'sell', reason: string}
    
    JSON:`;

    const response = await this.ollama.generate({
      model: 'mistral:7b',
      prompt,
      stream: false,
    });
    
    return JSON.parse(response.response.trim());
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.ollama.generate({
        model: 'mistral:7b',
        prompt: 'OK',
        stream: false,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default OllamaTier0;
```

### Job N4: Memory Cleanup (Ollama-based)

```typescript
// src/jobs/nightly-memory-sweep.ts

import OllamaTier0 from '../services/ollama-tier0';
import Database from '../database/sqlite';

class NightlyMemorySweep {
  private ollama: OllamaTier0;
  private db: Database;

  async run(): Promise<void> {
    console.log('[N4] Memory Sweep: Starting...');

    // 1. Fetch recent events
    const events = await this.db.getEventsSince('24h');

    // 2. Use Ollama to classify high-signal items
    const highSignal = [];
    for (const event of events) {
      const classified = await this.ollama.classifyIntent(event.content);
      if (classified !== 'other') {
        highSignal.push(event);
      }
    }

    // 3. Promote high-signal to long-term memory
    for (const item of highSignal) {
      await this.db.promoteToMemory(item);
    }

    // 4. Expire stale items (older than 30 days)
    await this.db.expireOldEvents('30d');

    console.log(`[N4] Memory Sweep: Complete (${highSignal.length} promoted)`);
  }
}

export default NightlyMemorySweep;
```

### Heartbeat System

```typescript
// src/jobs/heartbeat.ts

import OllamaTier0 from '../services/ollama-tier0';

class Heartbeat {
  private ollama: OllamaTier0;

  async run(): Promise<void> {
    const healthy = await this.ollama.healthCheck();
    
    if (healthy) {
      console.log('[Heartbeat] ✅ Ollama healthy');
    } else {
      console.error('[Heartbeat] ❌ Ollama unavailable');
      // Alert via Telegram
    }
  }
}

export default Heartbeat;
```

## Files to Create/Modify

**Create:**
- `src/services/ollama-tier0.ts` — Ollama integration + Tier 0 tasks
- `src/jobs/nightly-memory-sweep.ts` — Job N4 (Memory cleanup)
- `src/jobs/heartbeat.ts` — Health check system
- `Dockerfile.ollama` — Ollama initialization (optional, can use docker-compose)

**Modify:**
- `docker-compose.yml` — Add Ollama service
- `package.json` — Add ollama SDK dependency
- `.env.example.trading` — Add OLLAMA_HOST=http://ollama:11434

## Local Development Workflow

**Step 1: Update docker-compose**
```bash
# Add Ollama service to docker-compose.yml
# (See above)
```

**Step 2: Start Ollama + download model**
```bash
docker compose up ollama -d

# Wait for container startup (~2 minutes)
# First run will download Mistral:7b (~4.1 GB, ~10 minutes)

docker exec openclaw-ollama ollama pull mistral:7b
# Or let it auto-pull on first inference request
```

**Step 3: Test Ollama API locally**
```bash
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"mistral:7b","prompt":"hello","stream":false}'

# Should return JSON with generated text
```

**Step 4: Implement + test Tier 0 services**
```bash
npm install ollama

npm run build
npm test -- src/services/ollama-tier0.test.ts
```

**Step 5: Run nightly jobs locally**
```bash
npm run job:memory-sweep
npm run job:heartbeat
```

## Resource Verification

```
VPS Allocation:
  OpenClaw: 300-500 MB
  Ollama + Mistral:7b: 6-7 GB (when loaded)
  System: 2 GB
  Available: ~6 GB remaining ✅
  
Total: 16 GB RAM used efficiently
```

## Testing Checklist

- [ ] Ollama container starts
- [ ] Mistral:7b model downloaded
- [ ] Ollama API responds on :11434
- [ ] OllamaTier0 class initializes
- [ ] Intent classification works
- [ ] Trade summarization works
- [ ] Field extraction works
- [ ] Memory sweep job completes
- [ ] Heartbeat detects Ollama health

## GitHub Commit

```bash
git add src/services/ollama-tier0.ts
git add src/jobs/nightly-memory-sweep.ts src/jobs/heartbeat.ts
git add docker-compose.yml Dockerfile.ollama
git add package.json

git commit -m "Phase 5.X.2: Ollama integration layer
- Mistral:7b model in Docker
- Tier 0 task routing (intent, summary, extraction)
- Job N4: Memory Sweep (Ollama-based)
- Heartbeat health checks

Resource: 6-7 GB RAM when Ollama loaded
Test: docker compose up + npm run job:memory-sweep"
```

## Success Criteria

✅ Ollama container starts + Mistral:7b downloaded  
✅ Ollama API responds on :11434  
✅ Intent classification works  
✅ Trade summarization works  
✅ Memory sweep job executes  
✅ Heartbeat monitors Ollama health  
✅ Code committed to GitHub  

## What's Next

Phase 5.X.3 will add safety gates (position limits, confirmations) on top of Ollama.

---

# Phase 5.X.3: Safety Gates Layer

## Objective
Implement hard-coded trading safety constraints (position limits, symbol allowlist, confirmation workflow).

## Scope

**What gets implemented:**
```
✅ Position size limits (% per sector, total max)
✅ Symbol allowlist (11 sector ETFs only)
✅ Paper trading mode (hard-coded default)
✅ Confirmation workflow (UI → Telegram → approval)
✅ Audit log (immutable record of approvals)
✅ Risk limit enforcement (no auto-override)
```

**What's deferred:**
```
❌ Job N1 (Daily Grade - deferred to Phase 5.X.4)
❌ Job N2 (News/Catalyst - deferred to Phase 5.X.4)
❌ Job N3 (Improve Plan - deferred to Phase 5.X.4)
❌ Alpaca (Phase 5.X.5)
```

## Technical Details

### Safety Configuration (.env.trading)

```env
# Trading Mode
TRADING_MODE=paper  # paper | live (default: paper)
TRADING_MODE_LOCKED=true  # Prevent runtime changes

# Risk Limits
MAX_POSITION_SIZE_PERCENT=10  # Max 10% of account per position
MAX_DAILY_LOSS_PERCENT=3     # Max 3% loss per day
MAX_SECTOR_CONCENTRATION=25  # Max 25% in one sector
MAX_POSITIONS_OPEN=5         # Max 5 concurrent positions

# Symbol Allowlist (hardcoded, fail-fast)
ALLOWED_SYMBOLS=XLK,XLF,XLV,XLC,XLY,XLI,XLP,XLE,XLB,XLRE,XLU
ALLOW_ONLY_SECTORS=true

# Confirmation
REQUIRE_UI_CONFIRMATION=true
REQUIRE_TELEGRAM_CONFIRMATION=false  # Telegram alerts only
CONFIRMATION_TIMEOUT_SECONDS=300
```

### Safety Gates Class

```typescript
// src/services/trading-safety.ts

interface SafetyConfig {
  tradingMode: 'paper' | 'live';
  tradingModeLocked: boolean;
  maxPositionSizePercent: number;
  maxDailyLossPercent: number;
  maxSectorConcentration: number;
  maxPositionsOpen: number;
  allowedSymbols: string[];
}

interface TradeProposal {
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  reason: string;
  timestamp: Date;
}

interface SafetyCheckResult {
  allowed: boolean;
  violations: string[];
  risks: string[];
  requiresApproval: boolean;
}

class TradingSafety {
  private config: SafetyConfig;
  private db: Database;

  async validateProposal(proposal: TradeProposal): Promise<SafetyCheckResult> {
    const violations: string[] = [];
    const risks: string[] = [];

    // Check 1: Symbol allowlist (fail-fast)
    if (!this.config.allowedSymbols.includes(proposal.ticker)) {
      violations.push(`Symbol ${proposal.ticker} not in allowlist`);
    }

    // Check 2: Position size limit
    const accountValue = await this.getAccountValue();
    const positionValue = proposal.quantity * (await this.getPrice(proposal.ticker));
    const positionPercent = (positionValue / accountValue) * 100;

    if (positionPercent > this.config.maxPositionSizePercent) {
      violations.push(
        `Position ${positionPercent.toFixed(2)}% exceeds limit ${this.config.maxPositionSizePercent}%`
      );
    }

    // Check 3: Sector concentration
    const sector = await this.getSector(proposal.ticker);
    const sectorExposure = await this.calculateSectorExposure(sector);
    
    if (sectorExposure + positionPercent > this.config.maxSectorConcentration) {
      violations.push(
        `Sector ${sector} would exceed ${this.config.maxSectorConcentration}% limit`
      );
    }

    // Check 4: Daily loss limit
    const todayLoss = await this.getTodayLoss();
    const estimatedRisk = positionValue * 0.05; // Assume 5% risk per trade
    
    if (todayLoss + estimatedRisk > (accountValue * this.config.maxDailyLossPercent / 100)) {
      risks.push(`Today's loss approaching daily limit`);
    }

    // Check 5: Max open positions
    const openPositions = await this.getOpenPositions();
    if (openPositions.length >= this.config.maxPositionsOpen && proposal.action === 'buy') {
      violations.push(`Already at max ${this.config.maxPositionsOpen} open positions`);
    }

    // Check 6: Trading mode
    if (this.config.tradingMode === 'paper') {
      risks.push(`PAPER TRADING MODE - Orders will not execute`);
    }

    return {
      allowed: violations.length === 0,
      violations,
      risks,
      requiresApproval: violations.length > 0 || risks.length > 0,
    };
  }

  async confirmTrade(proposal: TradeProposal, approver: string): Promise<void> {
    // Record approval in immutable audit log
    await this.db.logEvent({
      event_type: 'approval',
      entity_type: 'trade',
      entity_id: proposal.ticker,
      content: {
        proposal,
        approver,
        timestamp: new Date(),
      },
      user_id: approver,
      status: 'approved',
    });
  }
}

export default TradingSafety;
```

### Confirmation Workflow (UI → Telegram)

```typescript
// src/services/confirmation-workflow.ts

class ConfirmationWorkflow {
  async requestApproval(proposal: TradeProposal): Promise<boolean> {
    // 1. Check safety
    const safety = new TradingSafety();
    const check = await safety.validateProposal(proposal);

    if (!check.requiresApproval) {
      // Auto-approve low-risk trades
      await safety.confirmTrade(proposal, 'auto');
      return true;
    }

    // 2. Send UI notification (WebSocket)
    await this.notifyUI({
      type: 'TRADE_APPROVAL_REQUIRED',
      proposal,
      violations: check.violations,
      risks: check.risks,
    });

    // 3. Send Telegram alert (info only, no confirmation loop)
    await this.notifyTelegram(
      `🚨 Trade Proposal Pending Approval\n` +
      `Ticker: ${proposal.ticker}\n` +
      `Action: ${proposal.action}\n` +
      `Violations: ${check.violations.join('; ')}\n` +
      `Check UI for approval`
    );

    // 4. Wait for UI confirmation (timeout: CONFIRMATION_TIMEOUT_SECONDS)
    const approved = await this.waitForUIConfirmation(proposal.ticker);

    if (approved) {
      await safety.confirmTrade(proposal, 'ui_user');
      return true;
    } else {
      await this.logRejection(proposal, 'timeout');
      return false;
    }
  }

  private async waitForUIConfirmation(traderId: string): Promise<boolean> {
    // Poll UI confirmation state or use WebSocket
    const timeout = parseInt(process.env.CONFIRMATION_TIMEOUT_SECONDS || '300') * 1000;
    const result = await Promise.race([
      this.pollConfirmation(traderId),
      this.delay(timeout).then(() => false),
    ]);

    return result;
  }
}

export default ConfirmationWorkflow;
```

### Audit Log Storage

```typescript
// src/database/audit-log.ts

class AuditLog {
  async logApproval(proposal: TradeProposal, approver: string): Promise<void> {
    await this.db.insertEvent({
      event_type: 'approval',
      entity_type: 'trade',
      entity_id: `${proposal.ticker}-${Date.now()}`,
      content: {
        proposal,
        approver,
        mode: process.env.TRADING_MODE,
      },
      user_id: approver,
      channel: 'ui',
      status: 'approved',
    });
  }

  async logRejection(proposal: TradeProposal, reason: string): Promise<void> {
    await this.db.insertEvent({
      event_type: 'rejection',
      entity_type: 'trade',
      entity_id: `${proposal.ticker}-${Date.now()}`,
      content: {
        proposal,
        reason,
      },
      user_id: 'system',
      channel: 'system',
      status: 'rejected',
    });
  }

  async getAuditTrail(days: number = 30): Promise<any[]> {
    return await this.db.queryEvents({
      event_type: ['approval', 'rejection'],
      sinceDays: days,
    });
  }
}

export default AuditLog;
```

## Files to Create/Modify

**Create:**
- `src/services/trading-safety.ts` — Safety validation + constraints
- `src/services/confirmation-workflow.ts` — Approval workflow
- `src/database/audit-log.ts` — Immutable audit logging
- `src/config/trading-limits.ts` — Safety configuration

**Modify:**
- `.env.example.trading` — Add all risk limit variables
- `package.json` — No new dependencies

## Local Development Workflow

**Step 1: Configure safety parameters**
```bash
# Edit .env.trading
MAX_POSITION_SIZE_PERCENT=10
MAX_DAILY_LOSS_PERCENT=3
TRADING_MODE=paper
TRADING_MODE_LOCKED=true
```

**Step 2: Implement safety services**
```bash
npm run build
npm test -- src/services/trading-safety.test.ts
```

**Step 3: Test approval workflow**
```bash
npm run test:approval-workflow

# Simulate:
# 1. Create trade proposal
# 2. Check safety (should pass for valid trade)
# 3. Request approval (should notify UI)
# 4. Confirm via UI
# 5. Verify audit log
```

**Step 4: Verify safety gates**
```bash
# Test violation scenarios:
# - Symbol not in allowlist
# - Position too large
# - Sector concentration exceeded
# - Daily loss limit hit
# - Too many open positions
```

## Testing Checklist

- [ ] Position size validation works
- [ ] Sector concentration check works
- [ ] Symbol allowlist enforced
- [ ] Paper mode prevents real orders
- [ ] Confirmation workflow triggers
- [ ] Audit log records approvals
- [ ] Daily loss limit tracked
- [ ] Max open positions enforced

## GitHub Commit

```bash
git add src/services/trading-safety.ts
git add src/services/confirmation-workflow.ts
git add src/database/audit-log.ts
git add src/config/trading-limits.ts
git add .env.example.trading

git commit -m "Phase 5.X.3: Safety gates layer
- Position size limits (per sector, total)
- Symbol allowlist (S&P 500 sectors only)
- Paper trading mode (hard-coded default)
- Confirmation workflow (UI approval)
- Immutable audit log

Safety: All trades require validation + approval before execution
Test: npm test -- src/services/trading-safety.test.ts"
```

## Success Criteria

✅ Position size limits enforced  
✅ Symbol allowlist prevents unauthorized tickers  
✅ Paper trading mode active (no real orders)  
✅ Confirmation workflow triggers for risky trades  
✅ Audit log records all approvals  
✅ Safety gates fail-fast on violations  
✅ Code committed to GitHub  

## What's Next

Phase 5.X.4 will add nightly jobs (N1: Daily Grade, N4: Memory Sweep enhanced).

---

# Phase 5.X.4: Nightly Jobs Layer

## Objective
Implement automated nightly analysis jobs (Job N1: Daily Grade, Job N4: Enhanced Memory Sweep).

## Scope

**What gets implemented:**
```
✅ Job N1: Daily Grade (hardcoded report format)
  - Trades executed today
  - P&L by sector
  - Mistakes taxonomy (signal error, timing error, etc.)
  
✅ Job N4: Memory Sweep (enhanced with Ollama)
  - Classify high-signal events
  - Promote to long-term memory
  - Expire stale items
  - Detect contradictions
```

**What's deferred:**
```
❌ Job N2 (News/Catalyst - requires research sources)
❌ Job N3 (Improve Plan - requires Tier 1 analysis)
❌ Alpaca (Phase 5.X.5)
```

## Technical Details

### Job N1: Daily Grade

```typescript
// src/jobs/nightly-daily-grade.ts

interface DailyGrade {
  date: string;
  trades_executed: number;
  trades_proposed: number;
  pnl_by_sector: Map<string, number>;
  mistakes: {
    signal_errors: number;
    timing_errors: number;
    sizing_errors: number;
    execution_errors: number;
  };
  top_winners: Array<{ticker: string; gain: number}>;
  top_losers: Array<{ticker: string; loss: number}>;
  summary: string;
}

class NightlyDailyGrade {
  private db: Database;
  private ollama: OllamaTier0;

  async run(): Promise<DailyGrade> {
    console.log('[N1] Daily Grade: Starting...');

    // 1. Fetch today's trades (from event log)
    const trades = await this.db.getTradesToday();
    const executions = trades.filter(t => t.status === 'executed');

    // 2. Calculate P&L by sector
    const pnlBySector = await this.calculateSectorPnL(executions);

    // 3. Classify mistakes (hardcoded logic for MVP)
    const mistakes = await this.classifyMistakes(trades);

    // 4. Get top winners/losers
    const winners = await this.getTopWinners(executions, 3);
    const losers = await this.getTopLosers(executions, 3);

    // 5. Use Ollama to generate summary
    const summary = await this.generateSummary({
      count: executions.length,
      pnl: Array.from(pnlBySector.entries()),
      winners,
      losers,
    });

    const report: DailyGrade = {
      date: new Date().toISOString().split('T')[0],
      trades_executed: executions.length,
      trades_proposed: trades.length,
      pnl_by_sector: pnlBySector,
      mistakes,
      top_winners: winners,
      top_losers: losers,
      summary,
    };

    // 6. Store report in event log
    await this.db.logEvent({
      event_type: 'daily_grade',
      entity_type: 'report',
      content: report,
      user_id: 'system',
      status: 'completed',
    });

    // 7. Send to UI + Telegram
    await this.notifyUI(report);
    await this.notifyTelegram(this.formatReportForTelegram(report));

    console.log('[N1] Daily Grade: Complete');
    return report;
  }

  private async calculateSectorPnL(trades: any[]): Promise<Map<string, number>> {
    const pnl = new Map<string, number>();

    for (const trade of trades) {
      const sector = await this.getSector(trade.ticker);
      const sectorPnL = pnl.get(sector) || 0;
      pnl.set(sector, sectorPnL + trade.realized_pnl);
    }

    return pnl;
  }

  private async classifyMistakes(trades: any[]): Promise<object> {
    const mistakes = {
      signal_errors: 0,
      timing_errors: 0,
      sizing_errors: 0,
      execution_errors: 0,
    };

    // MVP: Simple heuristics
    for (const trade of trades) {
      if (trade.result === 'loss' && trade.was_thesis_correct) {
        mistakes.timing_errors++;
      } else if (trade.result === 'loss' && !trade.was_thesis_correct) {
        mistakes.signal_errors++;
      } else if (trade.realized_pnl < 0 && trade.position_size > 10) {
        mistakes.sizing_errors++;
      }
    }

    return mistakes;
  }

  private formatReportForTelegram(report: DailyGrade): string {
    const lines = [
      `📊 Daily Grade - ${report.date}`,
      `Executed: ${report.trades_executed} | Proposed: ${report.trades_proposed}`,
      ``,
      `P&L by Sector:`,
      ...Array.from(report.pnl_by_sector.entries()).map(
        ([sector, pnl]) => `  ${sector}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`
      ),
      ``,
      `Top Winners: ${report.top_winners.map(w => `${w.ticker} +${w.gain.toFixed(2)}%`).join(', ')}`,
      `Top Losers: ${report.top_losers.map(l => `${l.ticker} ${l.loss.toFixed(2)}%`).join(', ')}`,
      ``,
      `Summary: ${report.summary}`,
    ];

    return lines.join('\n');
  }
}

export default NightlyDailyGrade;
```

### Job N4: Enhanced Memory Sweep

```typescript
// src/jobs/nightly-memory-sweep-enhanced.ts

interface MemorySweepResult {
  promoted: number;
  expired: number;
  contradictions: string[];
  summary: string;
}

class NightlyMemorySweepEnhanced {
  private db: Database;
  private ollama: OllamaTier0;

  async run(): Promise<MemorySweepResult> {
    console.log('[N4] Memory Sweep: Starting...');

    // 1. Fetch recent events (last 24 hours)
    const events = await this.db.getEventsSince('24h');

    // 2. Use Ollama to classify high-signal items
    const highSignal = [];
    for (const event of events) {
      const classified = await this.ollama.classifyIntent(event.content);
      if (classified !== 'other') {
        highSignal.push(event);
      }
    }

    // 3. Promote high-signal to long-term memory
    for (const item of highSignal) {
      await this.db.promoteToMemory(item);
    }

    // 4. Expire stale items (older than 30 days, low-signal)
    const expired = await this.db.expireOldEvents('30d');

    // 5. Detect contradictions
    const contradictions = await this.detectContradictions(highSignal);

    // 6. Generate summary
    const summary = await this.ollama.generateSummary(
      `Summarize this memory sweep: ${highSignal.length} promoted, ${expired.length} expired, ${contradictions.length} contradictions detected`
    );

    const result: MemorySweepResult = {
      promoted: highSignal.length,
      expired: expired.length,
      contradictions,
      summary,
    };

    // 7. Log result
    await this.db.logEvent({
      event_type: 'memory_sweep',
      entity_type: 'system',
      content: result,
      user_id: 'system',
      status: 'completed',
    });

    // 8. Alert if contradictions found
    if (contradictions.length > 0) {
      await this.notifyTelegram(
        `⚠️ Memory Sweep: ${contradictions.length} contradictions detected:\n` +
        contradictions.slice(0, 3).join('\n')
      );
    }

    console.log('[N4] Memory Sweep: Complete');
    return result;
  }

  private async detectContradictions(items: any[]): Promise<string[]> {
    const contradictions: string[] = [];

    // MVP: Simple pattern matching
    const beliefs = new Map<string, string>();

    for (const item of items) {
      const key = item.entity_id || 'unknown';
      const previousBelief = beliefs.get(key);

      if (previousBelief && previousBelief !== item.content) {
        contradictions.push(`${key}: belief changed from "${previousBelief}" to "${item.content}"`);
      }

      beliefs.set(key, item.content);
    }

    return contradictions;
  }
}

export default NightlyMemorySweepEnhanced;
```

### Cron Scheduler Configuration

```typescript
// src/jobs/cron-scheduler.ts

import cron from 'node-cron';
import NightlyDailyGrade from './nightly-daily-grade';
import NightlyMemorySweepEnhanced from './nightly-memory-sweep-enhanced';

class CronScheduler {
  initialize(): void {
    // 9:00 PM Pacific = 21:00 = 04:00 UTC (next day)
    // Using cron expression: 0 4 * * * (every day at 04:00 UTC)

    // Job N1: Daily Grade
    cron.schedule('0 4 * * *', async () => {
      const dailyGrade = new NightlyDailyGrade();
      await dailyGrade.run();
    });

    // Job N4: Memory Sweep
    cron.schedule('30 4 * * *', async () => {
      const memorySweep = new NightlyMemorySweepEnhanced();
      await memorySweep.run();
    });

    console.log('[Cron] Nightly jobs scheduled (04:00 UTC daily)');
  }
}

export default CronScheduler;
```

### Environment Variables

```env
# Nightly Jobs
NIGHTLY_JOB_TIMEZONE=America/Los_Angeles
NIGHTLY_JOB_TIME=21:00  # 9 PM Pacific
NIGHTLY_DAYS_RETENTION=30
NIGHTLY_JOB_TIMEOUT_MINUTES=120  # 2 hour max runtime

# Cron Schedule (for developers)
# Daily Grade: 0 4 * * * (04:00 UTC)
# Memory Sweep: 30 4 * * * (04:30 UTC)
```

## Files to Create/Modify

**Create:**
- `src/jobs/nightly-daily-grade.ts` — Job N1 implementation
- `src/jobs/nightly-memory-sweep-enhanced.ts` — Enhanced Job N4
- `src/jobs/cron-scheduler.ts` — Cron orchestration
- `src/jobs/nightly-jobs.test.ts` — Unit tests

**Modify:**
- `package.json` — Add `node-cron` dependency
- `.env.example.trading` — Add nightly job variables
- `docker-compose.yml` — Set timezone for cron accuracy

## Local Development Workflow

**Step 1: Install cron dependency**
```bash
npm install node-cron
```

**Step 2: Implement nightly jobs**
```bash
npm run build
```

**Step 3: Test jobs locally (manual trigger)**
```bash
npm run job:daily-grade  # Trigger N1
npm run job:memory-sweep  # Trigger N4
```

**Step 4: Verify Telegram notifications**
- Daily Grade report should appear in Telegram
- Memory Sweep alerts should appear for contradictions

**Step 5: Test cron scheduling**
```bash
# Let system run for 1 hour to verify cron execution
# Check logs: tail -f logs/nightly-jobs.log
```

## Testing Checklist

- [ ] Daily Grade generates report
- [ ] P&L calculated by sector
- [ ] Mistakes classified
- [ ] Telegram notifications sent
- [ ] Memory Sweep classifies items
- [ ] High-signal items promoted
- [ ] Old items expired
- [ ] Contradictions detected
- [ ] Cron schedule works (after 1 hour)

## GitHub Commit

```bash
git add src/jobs/nightly-daily-grade.ts
git add src/jobs/nightly-memory-sweep-enhanced.ts
git add src/jobs/cron-scheduler.ts
git add package.json .env.example.trading

git commit -m "Phase 5.X.4: Nightly jobs layer
- Job N1: Daily Grade (hardcoded report format)
- Job N4: Enhanced Memory Sweep (Ollama classification)
- Cron scheduler (04:00 UTC daily)

Reports: Telegram notifications + UI display
Test: npm run job:daily-grade && npm run job:memory-sweep"
```

## Success Criteria

✅ Daily Grade job executes  
✅ P&L calculated and reported  
✅ Memory Sweep classifies items  
✅ Contradictions detected  
✅ Telegram notifications sent  
✅ Cron schedule verified  
✅ Code committed to GitHub  

## What's Next

Phase 5.X.5 will add Alpaca integration (order execution, paper trading, position tracking).

---

# Phase 5.X.5: Alpaca Integration Layer

## Objective
Integrate Alpaca for paper trading (3-month testing) + future live trading.

## Scope

**What gets implemented:**
```
✅ Alpaca OAuth setup (token authentication)
✅ Paper trading account
✅ Order execution (market, limit, stop-limit)
✅ Position tracking (real-time)
✅ Account management (buying power, portfolio value)
✅ Order history + fills
✅ WebSocket real-time data (quotes)
```

**What's deferred:**
```
❌ Live trading (Phase 5.X.6, after 3-month validation)
❌ Advanced order types (Phase 5.X.6)
❌ Margin trading (Phase 5.X.6)
```

## Technical Details

### Alpaca Account Setup

**Account creation flow (manual, one-time):**
1. Go to alpaca.markets
2. Create account (individual brokerage)
3. Enable paper trading
4. Generate API key + secret
5. Store in .env.trading (see below)

### Alpaca API Integration

```typescript
// src/integrations/alpaca.ts

import Alpaca from '@alpacahq/alpaca-trade-api';

class AlpacaIntegration {
  private alpaca: Alpaca;

  constructor() {
    this.alpaca = new Alpaca({
      apiKey: process.env.ALPACA_API_KEY!,
      secretKey: process.env.ALPACA_SECRET_KEY!,
      baseURL: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',  // Paper trading
    });
  }

  // Get account info
  async getAccount(): Promise<any> {
    return await this.alpaca.getAccount();
  }

  // Get current positions
  async getPositions(): Promise<any[]> {
    return await this.alpaca.getPositions();
  }

  // Get position for specific symbol
  async getPosition(symbol: string): Promise<any> {
    return await this.alpaca.getPosition(symbol);
  }

  // Get current quote (last price)
  async getQuote(symbol: string): Promise<any> {
    return await this.alpaca.getLatestTrade(symbol);
  }

  // Get multiple quotes
  async getQuotes(symbols: string[]): Promise<Map<string, any>> {
    const quotes = new Map<string, any>();
    for (const symbol of symbols) {
      quotes.set(symbol, await this.getQuote(symbol));
    }
    return quotes;
  }

  // Get historical bars (OHLCV)
  async getBars(
    symbol: string,
    timeframe: '1m' | '5m' | '15m' | '1h' | '1d',
    limit: number = 100
  ): Promise<any[]> {
    const bars = await this.alpaca.getBarsV2(symbol, {
      timeframe: timeframe,
      limit: limit,
    });
    return Array.from(bars);
  }

  // Place order (market, limit, stop-limit)
  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    limit_price?: number;
    stop_price?: number;
    time_in_force?: 'day' | 'gtc';  // day = day order, gtc = good-til-canceled
  }): Promise<any> {
    return await this.alpaca.createOrder(params);
  }

  // Get order status
  async getOrder(orderId: string): Promise<any> {
    return await this.alpaca.getOrder(orderId);
  }

  // Cancel order
  async cancelOrder(orderId: string): Promise<void> {
    await this.alpaca.cancelOrder(orderId);
  }

  // Get order history
  async getOrderHistory(status: 'all' | 'open' | 'closed' = 'all', limit: number = 100): Promise<any[]> {
    return await this.alpaca.getOrders({
      status: status,
      limit: limit,
    });
  }

  // Close position (sell/cover)
  async closePosition(symbol: string): Promise<any> {
    return await this.alpaca.closePosition(symbol);
  }
}

export default AlpacaIntegration;
```

### Order Execution Adapter (Integrate with Safety Gates)

```typescript
// src/services/order-executor.ts

import AlpacaIntegration from '../integrations/alpaca';
import TradingSafety from './trading-safety';
import ConfirmationWorkflow from './confirmation-workflow';
import AuditLog from '../database/audit-log';

class OrderExecutor {
  private alpaca: AlpacaIntegration;
  private safety: TradingSafety;
  private workflow: ConfirmationWorkflow;
  private auditLog: AuditLog;

  async executeProposal(proposal: TradeProposal): Promise<any> {
    // 1. Validate safety (should be done before this, but double-check)
    const check = await this.safety.validateProposal(proposal);
    if (!check.allowed) {
      throw new Error(`Trade violates safety gates: ${check.violations.join('; ')}`);
    }

    // 2. Request approval (UI)
    const approved = await this.workflow.requestApproval(proposal);
    if (!approved) {
      throw new Error('Trade not approved');
    }

    // 3. Place order on Alpaca
    const order = await this.alpaca.placeOrder({
      symbol: proposal.ticker,
      qty: proposal.quantity,
      side: proposal.action,
      type: 'market',  // MVP: market orders only
      time_in_force: 'day',
    });

    // 4. Log execution
    await this.auditLog.logExecution(proposal, order);

    // 5. Notify Telegram
    await this.notifyTelegram(
      `✅ Order Executed\n` +
      `Ticker: ${proposal.ticker}\n` +
      `Side: ${proposal.action.toUpperCase()}\n` +
      `Qty: ${proposal.quantity}\n` +
      `Order ID: ${order.id}`
    );

    return order;
  }
}

export default OrderExecutor;
```

### Position Tracking Service

```typescript
// src/services/position-tracker.ts

interface Position {
  symbol: string;
  qty: number;
  avg_fill_price: number;
  current_price: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  sector: string;
}

class PositionTracker {
  private alpaca: AlpacaIntegration;
  private db: Database;

  async syncPositions(): Promise<Position[]> {
    // 1. Get current positions from Alpaca
    const alpacaPositions = await this.alpaca.getPositions();

    // 2. Get current quotes for all symbols
    const symbols = alpacaPositions.map(p => p.symbol);
    const quotes = await this.alpaca.getQuotes(symbols);

    // 3. Enrich with sector info
    const positions: Position[] = [];
    for (const pos of alpacaPositions) {
      const quote = quotes.get(pos.symbol);
      const sector = await this.getSector(pos.symbol);

      positions.push({
        symbol: pos.symbol,
        qty: pos.qty,
        avg_fill_price: pos.avg_fill_price,
        current_price: quote.price,
        unrealized_pl: pos.unrealized_pl,
        unrealized_pl_pct: pos.unrealized_plpc,
        sector,
      });
    }

    // 4. Log to database (for daily grade)
    await this.db.logEvent({
      event_type: 'position_sync',
      entity_type: 'portfolio',
      content: { positions, timestamp: new Date() },
      user_id: 'system',
      status: 'completed',
    });

    return positions;
  }

  // Get sector exposure (% of portfolio)
  async getSectorExposure(): Promise<Map<string, number>> {
    const positions = await this.syncPositions();
    const account = await this.alpaca.getAccount();
    const portfolioValue = parseFloat(account.portfolio_value);

    const exposure = new Map<string, number>();
    for (const pos of positions) {
      const posValue = pos.qty * pos.current_price;
      const pct = (posValue / portfolioValue) * 100;
      exposure.set(
        pos.sector,
        (exposure.get(pos.sector) || 0) + pct
      );
    }

    return exposure;
  }
}

export default PositionTracker;
```

### Environment Variables

```env
# Alpaca API
ALPACA_API_KEY=PK_YOUR_KEY_HERE
ALPACA_SECRET_KEY=YOUR_SECRET_HERE
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # Paper trading
# After 3 months: https://api.alpaca.markets (live trading)

# Trading
ALPACA_PAPER_MODE=true
ALPACA_MARKET_DATA_BASE=https://data.alpaca.markets
```

## Files to Create/Modify

**Create:**
- `src/integrations/alpaca.ts` — Alpaca API wrapper
- `src/services/order-executor.ts` — Order execution + safety integration
- `src/services/position-tracker.ts` — Real-time position sync
- `.env.example.trading` — Alpaca credentials

**Modify:**
- `package.json` — Add `@alpacahq/alpaca-trade-api`
- `docker-compose.yml` — Add ALPACA env vars

## Local Development Workflow

**Step 1: Create Alpaca account + get credentials**
```bash
# Go to alpaca.markets, sign up, generate API key
# Copy to .env.trading:
ALPACA_API_KEY=PK_...
ALPACA_SECRET_KEY=...
```

**Step 2: Install Alpaca SDK**
```bash
npm install @alpacahq/alpaca-trade-api
```

**Step 3: Test Alpaca connection**
```bash
npm run test:alpaca-connection
# Should return account info (paper trading mode)
```

**Step 4: Test order placement (paper trading)**
```bash
npm run test:order-execution

# Simulated order:
# 1. Create trade proposal (XLK, 10 shares, buy)
# 2. Validate safety gates
# 3. Request approval (mock UI approval)
# 4. Execute order on Alpaca
# 5. Verify order in Alpaca dashboard
```

**Step 5: Verify position tracking**
```bash
npm run test:position-sync
# Should return current positions + sector exposure
```

## 3-Month Testing Protocol

**Weeks 1-2:**
- Small position sizes (10-20 shares per trade)
- Paper trading only
- Monitor for API issues

**Weeks 3-8:**
- Increase to realistic position sizes
- Daily validation of order fills + P&L
- Analyze daily grade reports

**Weeks 9-12:**
- Finalize trading parameters
- Prepare for live trading switch
- Document all lessons learned

**Switch to Live (Month 4):**
- Update ALPACA_BASE_URL to live endpoint
- Restart container
- Start with very small live trades (1% of paper size)
- Gradually increase

## Testing Checklist

- [ ] Alpaca account created + API credentials
- [ ] Paper trading mode verified
- [ ] Account info retrieves correctly
- [ ] Quotes fetch in real-time
- [ ] Order placement works
- [ ] Position tracking syncs
- [ ] Sector exposure calculated
- [ ] Order history retrieves
- [ ] Safety gates integrated
- [ ] Telegram notifications send

## GitHub Commit

```bash
git add src/integrations/alpaca.ts
git add src/services/order-executor.ts
git add src/services/position-tracker.ts
git add package.json .env.example.trading

git commit -m "Phase 5.X.5: Alpaca integration layer
- Paper trading account setup
- Order execution (market orders)
- Position tracking + sector exposure
- Order history + fills

Mode: Paper trading (3-month testing)
Test: npm run test:order-execution"
```

## Success Criteria

✅ Alpaca account created + API working  
✅ Paper trading mode verified  
✅ Orders execute on Alpaca  
✅ Positions track in real-time  
✅ Safety gates integrated  
✅ Telegram notifications working  
✅ Code committed to GitHub  

## Next Phase

After 3-month validation period (not shown here), Phase 5.X.6 will switch to live trading + advanced features.

---

## Summary: 5 Phases → MVP AlwaysOnAssistant

| Phase | Layer | Key Deliverable | Status |
|-------|-------|-----------------|--------|
| 5.X.1 | Foundation | OpenClaw + Telegram + SQLite | 🔵 Plan |
| 5.X.2 | Ollama | Mistral:7b + Tier 0 tasks | 🔵 Plan |
| 5.X.3 | Safety Gates | Position limits + approval workflow | 🔵 Plan |
| 5.X.4 | Nightly Jobs | Daily Grade + Memory Sweep + Cron | 🔵 Plan |
| 5.X.5 | Alpaca | Paper trading (3-month testing) | 🔵 Plan |

**Timeline:** 4-6 weeks per phase (local dev + testing before VPS deploy)

**Workflow:**
1. Develop locally (D:\Documents\alwaysonassistant)
2. Commit + push to GitHub per phase
3. Deploy to VPS (git pull + docker compose up)
4. Test on VPS (UI + Telegram)
5. Move to next phase

---

**Ready to start Phase 5.X.1: Foundation Layer?**
