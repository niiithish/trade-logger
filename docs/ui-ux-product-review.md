# TradeLogger — UI/UX & Product Review

**Audience:** Personal futures prop-firm journal (Lucid evals)  
**Role of this doc:** Analysis only — what exists today, where it helps (and doesn’t), and prioritized improvements a later implementer can pick up without re-discovering the codebase.  
**Context:** Two Lucid accounts (~$50,900 and ~$50,000), still in eval; primary software reference Tradesea Advanced Trading Dashboard; instruments MNQ/MES; partial scale-outs are part of the playbook.

---

## 1. What the app is today

TradeLogger is a **process-first trade journal**, not a broker blotter. Its strongest idea is the **Heart Rate Index (HRI)** — confluence checklist quality + anxiety-at-size — paired with chart screenshots and freeform notes. That is the right product spine for becoming a better trader; P&L dashboards alone rarely change behavior.

### 1.1 Navigation & surfaces

| Route | Purpose | Primary component |
| --- | --- | --- |
| `/` Dashboard | Aggregate stats, compass, equity curve | `components/dashboard-overview.tsx` + `lib/analytics.ts` |
| `/trades` | List all trades | `components/trades-table.tsx` |
| `/trades/[id]` | Single trade review | `components/trade-detail.tsx` |
| Calendar (`/calendar`) | Month grid + weekly rollups + day drill-down | `components/trading-calendar.tsx` |
| Log trade (dialog / flow) | Multi-step create form | `components/trade-form.tsx` |

Sidebar (`components/app-sidebar.tsx`): Dashboard · Trades · Calendar · Log trade.

### 1.2 Data model (what each trade actually stores)

Source of truth: `lib/db/schema.ts` / `lib/types.ts`.

| Field | Role |
| --- | --- |
| `ticker` | Enum `MNQ` \| `MES` only |
| `pnl` | Net dollars for the whole trade (single number) |
| `positionSize` | Contracts (single size; not scale-in/out legs) |
| `chartImage` | Required chart (single, or entry when exit present) |
| `exitImage` | Optional separate exit chart |
| `confluenceScore` | 0–6 from checklist (legacy 1–5 slider still readable) |
| `confluenceChecklist` | JSON: liquidity sweep (+ types), target liquidity, SMT, HTF FVG bounce, Tempo, IFVG momentum (`lib/confluence.ts`) |
| `anxietyLevel` | 1–10 HRI “how size felt” |
| `notesText` / `voiceNote` | At least one required on create |
| `createdAt` | Timestamp used for day keys and all time aggregation |

**Not stored today (important gaps for this user):**

- Account identity (Lucid A vs Lucid B)
- Direction (long / short)
- Entry / exit prices, stop, targets
- Partial fills / multi-leg exits (TP1, runner, BE stop)
- Exit management outcome (hit SL, SL→BE then stopped, TP1 then SL, TP2, final TP)
- Session / time-of-day / trade duration
- Planned R vs realized R
- Tags, mistake codes, rule-break flags
- Prop-firm context (eval balance, daily loss budget, drawdown cushion)

Everything in the UI is **all-time, single pool of trades**. There is no account filter, no date-range filter, and no period comparison beyond “last trade day vs prior trade day.”

### 1.3 Log-trade form (capture quality)

Steps in `components/trade-form.tsx` / `lib/trade-form-state.ts`:

1. **Ticker** — MNQ / MES cards  
2. **Result** — Net P&L ($) + position size  
3. **Chart** — One image, or entry + exit (paste/drop/pick)  
4. **HRI** — Full confluence checklist + anxiety slider  
5. **Notes** — Text and/or voice (one required)

**What this captures well**

- Process discipline (ICT/SMC-style confluence, Tempo confirmation)  
- Emotional state at size (anxiety)  
- Visual evidence of the setup  
- Quick logging without broker import  

**What it forces you to collapse**

- Partials into one net P&L and one size — you cannot reconstruct “took TP1, moved SL to BE, runner to TP2.”  
- Two Lucid evals into one anonymous stream — a red day on account A and a green day on B look the same.  
- Direction and management story into free-text notes only (searchable only if you remember the wording).

### 1.4 Dashboard today

`computeDashboardMetrics` + `DashboardOverview`:

**Top cards**

- Net P&L, Win Rate, Profit Factor, Avg Win/Loss Ratio  
- Each shows **% change vs previous trading day** (not vs last week / calendar week / month)  
- Empty prior day → “No prior trade day”

**Compass Score (0–100 radar)**

Blends win rate, max drawdown control, consistency (anxiety + confluence proxy), profit factor, avg win/loss, recovery. Labeled process-aware; useful as a **mood ring for the journal**, not as prop-firm pass/fail math.

**P&L Performance**

- Equity curve from **daily net P&L** of logged trades  
- Cumulative / Daily tabs  

**Missing on home (relative to “quick glance to get better”)**

- This week vs last week (or rolling 5 sessions)  
- Today / this week strip  
- Per-account split  
- Breakdowns that answer “why” (direction, confluence band, anxiety band, exit quality)  
- Auto insights (strengths / weaknesses)  
- Instrument P&L split (MNQ vs MES) on the dashboard itself  

### 1.5 Calendar today

`buildMonthGrid` / `TradingCalendar`:

- Month navigation, green/red day cells  
- Day: P&L, trade count, win rate  
- **WEEKLY** column: calendar-week total P&L + trading-day count within the visible month grid (Week 1…N of the grid — **not** ISO week-vs-week comparison, and **not** “this week vs last week” on the dashboard)  
- Click day → list of that day’s trades with thumbnails  

Honest gap: week **cells** exist; week **comparison** (this week’s performance vs last week’s) does **not**.

### 1.6 Trades list & detail

**Table columns:** Chart · Ticker · P&L · Size · Confluence · Anxiety · When · Actions  

**Detail:** Charts, size, confluence score + hit list, anxiety, notes/voice, delete. No edit path called out as a first-class flow in the review surface (create + delete). No structured exit story, account badge, or R-multiple.

---

## 2. Product strengths (keep these)

1. **HRI is differentiated.** Most journals are P&L toys. Anxiety + setup checklist is exactly what a prop eval needs when the enemy is oversizing and FOMO.  
2. **Confluence model matches the playbook** (sweeps, London/Asia, SMT MNQ↔MES, HTF FVG, Tempo, IFVG). That is coachable data.  
3. **Screenshot-first logging** fits futures discretionary workflow (Tradesea/chart → paste).  
4. **Visual language** already mirrors the dark “advanced dashboard” pattern the user lives in (metric cards, rings, compass, equity curve, calendar weekly column) — familiarity is high; don’t redesign for redesign’s sake.  
5. **Calendar day drill-down** is the right mental model for discretionary day trading.

---

## 3. Critical gaps for *this* trader

### 3.1 Multi-account Lucid eval awareness — **missing**

You trade two evals (~50.9k and 50k). The journal treats one anonymous P&L stream.

**Why it hurts**

- You cannot see which account is progressing vs stalling.  
- A combined green day can hide a blown cushion on one eval.  
- Pass/fail psychology is **per account**; the journal should be too.

**User-visible outcome wanted**

- On log: pick **Account A / Account B** (or Lucid-50.9k / Lucid-50k).  
- Dashboard + calendar filter: All | A | B.  
- Optional header: balance / phase label (manual; no broker sync required).

### 3.2 This week vs last week — **missing** (only last *trade day*)

Today’s deltas are day-over-day on the last two days that have trades. That is noisy for futures (one big day dominates) and does not answer: *“Am I improving this week?”*

**User-visible outcome wanted**

- Dashboard strip: **This week | Last week | Δ** for Net P&L, trade count, win rate, profit factor, avg anxiety.  
- Secondary: rolling last 5 trading days vs prior 5 (more stable than calendar weeks when you skip days).

### 3.3 Partial profits & exit management — **missing**

You scale out (TP1, move SL, TP2, final TP). Today you enter **one net P&L** and **one size**. After a few months you cannot answer:

- After TP1, how often does the rest hit SL vs BE vs TP2?  
- Does locking TP1 then BE improve expectancy?  
- Are “full runners” actually helping or giving back?

**User-visible outcome wanted**

- Optional **management plan + outcome** on each trade, e.g.:  
  - Scale style: `full` | `partials`  
  - Legs: TP1 (size + R or $), TP2, final (runner)  
  - SL plan: initial SL; after TP1 → hold / BE / trail  
  - **Outcome enum** (single pick that captures the story):  
    - `sl_initial` — stopped before any TP  
    - `tp1_then_sl` — TP1 then remainder stopped  
    - `tp1_be_sl` — TP1, SL to BE, stopped at BE  
    - `tp1_tp2` — hit TP1 and TP2 (or final without full runner story)  
    - `full_tp` / `runner_tp` — cleaned full plan  
    - `manual_flat` / `other`  
  - Net P&L remains the source of truth for dollars; legs are for **pattern learning**, not double-entry bookkeeping.

### 3.4 Direction & session context — **missing**

Tradesea surfaces long/short and duration. Without direction you cannot verify “short-side leakage” or session bias (London vs NY). Notes alone won’t produce aggregates.

### 3.5 Prop-eval “am I safe today?” glance — **missing**

No daily P&L budget, no soft daily loss reminder, no simple “trades left / risk used” concept. Full rule engines are out of scope; a **manual daily loss limit display** per account would still change behavior.

---

## 4. Tradesea reference mapping

Screenshots inspected:

- `Screenshot 2026-07-12 at 17-05-02 Tradesea - Advanced Trading Dashboard.png` (populated)  
- `Screenshot 2026-07-09 at 20-35-50 Tradesea - Advanced Trading Dashboard.png` (empty shell)

TradeLogger already shares the **top-of-funnel** language with Tradesea (Net P&L, Win Rate, PF, Avg W/L, Compass, equity curve, calendar weekly column). Steal patterns that improve **decisions**; skip live platform chrome.

| Tradesea pattern | In TradeLogger today? | Fit for *this* personal journal | Recommendation |
| --- | --- | --- | --- |
| Selected Account / multi-account | No | **High** — two Lucid evals | P0: account on every trade + filter |
| Date range filter on dashboard | No (all-time only) | High for reviews | P1: presets Today / This week / Last week / MTD / All |
| “% from last trade day” on metrics | **Yes** | Medium — noisy | Keep for day-to-day; **add week comparison** as primary glance |
| Compass / radar | **Yes** | Medium-high if process-weighted | Keep; later weight by confluence adherence |
| Equity curve cumulative/daily | **Yes** | High | Keep; add drawdown overlay optional |
| Calendar + WEEKLY column | **Yes** (own page) | High | Keep; add week-vs-week strip on dashboard |
| Trade Insights (auto strengths/weaknesses) | No | High for learning | P1: rule-based bullets from real fields (not LLM required) |
| Most / least profitable weekday | No | High for timing | P1 once enough sample size |
| Trade direction (long bias) | No (no direction field) | High | P0 capture → then insight |
| Drawdown curve | No (only DD score inside compass) | Medium | P2 chart; P1 not required if equity exists |
| Duration analysis | No (no timestamps for open/close) | Medium — optional | P2 if you log entry+exit time; skip if too heavy |
| P&L by instrument (MNQ/MES) | No on dashboard | High — you trade both | P1 horizontal bars |
| P&L by side / tags | No | Side: high; tags: medium | Side with direction; tags later |
| Instruments filter / tags | Partial (ticker only in data) | Medium | P1 filter on trades table |
| Live account balances / platform | N/A | Out of scope | Manual labels only; no broker sync |

**Already covered well relative to Tradesea:** process metrics (HRI/confluence/anxiety) — TradeLogger is *ahead* of a pure execution dashboard here. Do not dilute that to chase more charts.

**Out of scope (do not clone):** live order flow, platform execution, full prop rule engine, multi-tenant SaaS, automated broker import.

---

## 5. Prioritized recommendations

Priority key:

- **P0 — Do first:** Unlocks the questions you already care about; small schema/UI surface; high decision value.  
- **P1 — Next:** Quick-glance intelligence and comparison periods.  
- **P2 — Later:** Nice depth once P0/P1 data exists.

### P0 — Do first

#### P0.1 Multi-account on every trade

- **User-visible outcome:** Account selector on log form; badge on table/detail; dashboard & calendar filter **All / Lucid A / Lucid B** (names editable; seed with balances ~50.9k / 50k and “eval” phase).  
- **Why it makes you better:** Eval survival is per account. You stop averaging two different risk books into one ego number.

#### P0.2 Direction (Long / Short)

- **User-visible outcome:** Two-tap field on Result step; filter + P&L-by-side later.  
- **Why:** Surfaces one-sided leakage (common in index micros) without reading every note.

#### P0.3 Exit management outcome + optional partials

- **User-visible outcome:** On Result (or a short “Management” substep):  
  1. Outcome chips (see §3.3).  
  2. If partials: TP1 size (contracts or %), optional TP2; “after TP1: SL stayed / moved to BE / trailed.”  
  Net P&L stays one field (from Tradesea or platform).  
- **Why:** Answers *“Does taking TP1 then BE help me pass evals?”* — the exact learning loop partial traders need. Without it, the journal cannot distinguish skillful management from lucky full runners.

#### P0.4 Dashboard “Period pulse” — This week vs last week

- **User-visible outcome:** Card or strip under top metrics:

  | | This week | Last week | Δ |
  | --- | --- | --- | --- |
  | Net P&L | … | … | … |
  | Trades | … | … | … |
  | Win rate | … | … | … |
  | Avg anxiety | … | … | … |

  Define week as **Mon–Sun local** (or Sun–Sat to match calendar `weekStartsOn: 0` — pick one and label it).  
- **Why:** Replaces “last trade day” noise with a cadence that matches how you review as a discretionary trader. This is the feature you literally asked for.

### P1 — Next

#### P1.1 Date-range presets on dashboard

- Today / This week / Last week / MTD / All-time.  
- All metrics, equity, and (later) insights recompute for the range.  
- **Outcome:** One-click review after Friday close without exporting data.

#### P1.2 MNQ vs MES P&L breakdown

- Horizontal bar like Tradesea’s instrument breakdown.  
- **Outcome:** Instant “am I leaking on MES?” glance.

#### P1.3 Rule-based Trade Insights (strengths / weaknesses)

Examples grounded in **your** fields:

- High confluence (≥4/6) win rate vs low confluence  
- Anxiety ≥7 loss rate / avg P&L  
- Partial outcome distribution (“After TP1, SL at BE: n trades, avg $…”)  
- Long vs short expectancy  
- **Outcome:** Coach-style bullets without inventing AI theater; only show when n ≥ threshold (e.g. 8 trades).

#### P1.4 Weekday profitability (Most / least profitable day)

- **Outcome:** Avoid stacking size on your statistically worst weekday once sample is honest.

#### P1.5 Trades table filters & columns

- Account, direction, outcome, ticker, date range.  
- Optional column: outcome chip (TP1→BE, full SL, …).  
- **Outcome:** Find “all BE stops this month” in 5 seconds.

#### P1.6 Today strip on dashboard header

- Today’s net P&L, trade count, running win rate; optional soft daily loss budget (manual number per account).  
- **Outcome:** Prop-eval mindfulness without building a full rule engine.

#### P1.7 Analytics by confluence & anxiety bands

- Expectancy / win rate for score 0–2 / 3–4 / 5–6 and anxiety Calm / Elevated / High.  
- **Outcome:** Turns HRI from a logging ritual into a **size and select filter** (“I only take ≥4 confluence when anxiety ≤4”).

### P2 — Later

#### P2.1 Drawdown curve chart  
#### P2.2 Entry/exit timestamps → duration histogram (only if logging stays fast)  
#### P2.3 Planned R / realized R  
#### P2.4 Mistake tags (FOMO, early entry, moved SL wider, revenge)  
#### P2.5 Optional second chart slot for management (partial marks) — only if entry/exit isn’t enough  
#### P2.6 Lightweight “eval progress” card: starting balance, manual current balance, net logged P&L check  
#### P2.7 Edit trade flow (fix mis-logs without delete/recreate)

---

## 6. Suggested information architecture (post-P0/P1)

```
Dashboard
  [Account: All | A | B]  [Range: This week | Last week | MTD | All]
  Today strip · Period pulse (this vs last week)
  Metric cards (range-scoped; secondary Δ vs prior period)
  Compass · Equity
  Insights · Instrument breakdown · (optional weekday / management stats)

Log trade (fast path)
  Account → Ticker → Direction → Result (P&L, size)
  → Management (outcome + optional partials)   // skippable default: "full / other"
  → Chart → HRI → Notes

Calendar
  Same account filter; keep weekly column; week click → week summary panel

Trades
  Filters; outcome & account badges; deep link to detail story
```

**Speed principle:** Default path stays as fast as today. Management partials are **one chip row** for full exits; expanded fields only when “Partials” is on.

---

## 7. UX principles for this journal (design guardrails)

1. **Log in under 60 seconds** for a clean full exit; partials add ≤15 seconds.  
2. **One truth for money:** net `pnl` from the platform; structure around it for learning.  
3. **Compare periods, not only days** — week and range first; day-over-day secondary.  
4. **Account is a first-class dimension** — never bury it in notes.  
5. **Process metrics earn their keep** — always pair HRI with expectancy by band, not vanity averages alone.  
6. **Empty states teach the habit** (“Log with account + outcome so week comparison works”).  
7. **Don’t clone Tradesea’s whole page** — import patterns that answer *your* questions (accounts, weeks, partials, MNQ/MES). Keep HRI as the soul of the product.

---

## 8. Implementation notes for a later implementer (no work done here)

Schema sketch (illustrative only — not implemented):

```text
accounts: id, name, labelBalance, phase ("eval"|"funded"), sortOrder
trades: + accountId, direction ("long"|"short"),
        managementStyle ("full"|"partials"),
        exitOutcome (enum),
        tp1Contracts?, tp1Pnl?, afterTp1Stop ("held"|"breakeven"|"trail"),
        // keep pnl as net realized
```

Analytics additions in `lib/analytics.ts`:

- `computePeriodMetrics(trades, range)`  
- `comparePeriods(thisWeek, lastWeek)`  
- `breakdownByTicker`, `breakdownByDirection`, `breakdownByExitOutcome`  
- `insightsFromTrades(trades, minN)`  

UI touchpoints:

- `trade-form.tsx` steps + `trade-form-state.ts`  
- `schema.ts` / actions validation  
- `dashboard-overview.tsx` period pulse + filters  
- `trades-table.tsx` / `trade-detail.tsx` badges  
- Calendar account filter prop from page loaders  

Tests worth adding when built: period boundary (Mon–Sun), multi-account isolation, outcome enum validation, partials optional path still saves with net pnl only.

---

## 9. Summary judgment

TradeLogger is already a **credible process journal** for MNQ/MES discretionary work: confluence checklist, anxiety, charts, compass, and calendar are solid bones. For a **two-account Lucid futures eval trader who scales out**, the product currently collapses the three dimensions that matter most for improvement:

1. **Which account**  
2. **Which week (vs last week)**  
3. **How the exit was managed (partials / BE / runners)**

Closing those gaps — without turning the app into a Tradesea clone or a prop-rule engine — is the highest-ROI path from “pretty stats” to **data that actually makes you a better trader**.

---

*Generated as a read-only product/UX analysis. No schema, UI, or analytics code was changed for this review.*
