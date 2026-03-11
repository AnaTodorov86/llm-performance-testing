# Benchmark Results

> Run date: March 2026 · 20 iterations · 2 VUs · identical prompts for both providers

## Provider Comparison

| Metric | Groq (llama-3.1-8b-instant) | Ollama local (llama3.2:1b) |
|--------|----------------------------|---------------------------|
| Latency avg | 86ms | 1053ms |
| Latency p95 | 128ms | 9038ms |
| Correct rate | ✅ 100% | ❌ 60% |
| Format OK | ✅ 100% | ✅ 100% |
| Error rate | ✅ 0% | ✅ 0% |
| Thresholds | ✅ all passed | ❌ 2 failed |

## Key Findings

### Finding 1 — llama3.2:1b fails exclusively on arithmetic

Ollama answered all factual questions correctly (Paris, Berlin, blue, warm) but failed all math prompts:

```
❌ Expected: "20"  Got: "110"   (prompt: "What is 10+10?")
❌ Expected: "4"   Got: "3"     (prompt: "What is 2+2?")
```

**Why this matters:** Standard QA tools (Selenium, Playwright) cannot detect this class of failure.
This framework catches it automatically via `isCorrectAnswer()` across every test run.

### Finding 2 — Latency outlier under concurrent load

Ollama p95 latency spiked to **9038ms** on one request while median stayed at **164ms**.
This indicates resource contention on the local machine under 2 VU concurrent load — a risk
that would not surface in single-user manual testing.

### Finding 3 — Format compliance is model-agnostic

Both models followed length instructions ("one word only") 100% of the time,
suggesting instruction-following is not the weak point for either model at this scale.

## What This Means in Practice

If you are evaluating which LLM to deploy:

- **Groq** is the clear choice for latency-sensitive production workloads
- **llama3.2:1b** is fast enough for local development but requires arithmetic validation
  before any use case involving calculations
- **Model size matters for correctness, not just speed** — the 1b parameter model shows
  systematic math failures that a larger model (8b+) does not exhibit

## Running the Benchmark Yourself

```bash
# Groq only
./scripts/run_benchmark.sh

# Groq + local Ollama (requires ollama serve + ollama pull llama3.2:1b)
./scripts/run_benchmark.sh --all
```