![CI/CD](https://github.com/AnaTodorov86/llm-performance-testing/actions/workflows/llm-tests.yml/badge.svg)
![k6](https://img.shields.io/badge/tested%20with-k6-7D64FF)
![Groq](https://img.shields.io/badge/LLM-Groq-orange)
![License](https://img.shields.io/badge/license-MIT-green)

# LLM Performance & Quality Testing Framework

A comprehensive testing framework for evaluating LLM API performance, 
reliability, and response quality under various load conditions.

## 🎯 What This Project Tests

- **Performance** — How fast does the LLM respond under load?
- **Reliability** — At what point does the system start failing?
- **Quality** — Are the responses accurate and consistent?
- **Hallucination Detection** — Does the model give wrong answers?

## Architecture

The framework follows a **SOLID/DRY** modular design — all shared logic lives in `lib/`,
tests only import what they need.

```mermaid
flowchart TD
    ENV[".env / GitHub Secrets\nGROQ_API_KEY"] --> CFG

    subgraph LIB ["📦 lib/ — shared modules"]
        CFG["config.js\nENV · Stages · Thresholds"]
        MET["metrics.js\nTrend · Rate · Counter"]
        HLP["helpers.js\naskLLM() · isCorrectAnswer()\nfollowsLengthInstruction()"]
        PRM["prompts.js\nPERFORMANCE_PROMPTS\nQUALITY_CHECKS\nmakeConsistencyChecks()"]
    end

    subgraph TESTS ["🧪 tests/"]
        PT["performance_test.js\nTEST_SCENARIO=\nbaseline · load · stress"]
        QT["quality_test.js\nhallucination detection"]
        CT["consistency_test.js\ntemperature=0 stability"]
    end

    subgraph GROQ ["☁️ Groq API"]
        MODEL["llama-3.1-8b-instant"]
    end

    subgraph CI ["⚙️ GitHub Actions"]
        GHA[".github/workflows/\nllm-quality.yml"]
    end

    subgraph OUT ["📊 Output"]
        REP["reports/\nbaseline.json · load.json\nstress.json · quality.json"]
        DASH["dashboard.html\nlatency · error rate\nhallucination count"]
    end

    CFG --> PT & QT & CT
    MET --> PT & QT & CT
    HLP --> PT & QT & CT
    PRM --> PT & QT & CT

    PT & QT & CT -->|"HTTP POST"| MODEL
    MODEL -->|"JSON response"| HLP

    GHA -->|"k6 run"| PT & QT & CT
    PT & QT & CT -->|"--out json"| REP
    REP --> DASH
```

| Module | Responsibility |
|--------|---------------|
| `lib/config.js` | ENV variables, test stage profiles, thresholds |
| `lib/metrics.js` | All k6 custom metrics (single source — no duplicates) |
| `lib/helpers.js` | `askLLM()` HTTP wrapper, answer evaluation functions |
| `lib/prompts.js` | All test prompts and expected answers |
| `tests/performance_test.js` | Baseline / Load / Stress via `TEST_SCENARIO` env var |
| `tests/quality_test.js` | Hallucination detection, instruction-following |
| `tests/consistency_test.js` | Response stability at `temperature=0` |

## 🛠️ Tech Stack

- **k6** — Load testing framework
- **Groq API** — LLM provider (llama-3.1-8b-instant)
- **JavaScript** — Test scripting

## 📊 Key Findings

| Test | Max Users | Success Rate | p95 Latency |
|------|-----------|--------------|-------------|
| Baseline | 5 | 100% | 139ms |
| Load | 20 | 100% | 125ms |
| Stress | 60 | 100% | 51ms |

> ⚠️ Rate limiting begins at ~5 simultaneous users on Groq free tier.
> LLM response quality remains 100% when API responds successfully.

## 🧪 Test Suite

### 1. Baseline Test
Tests normal operating conditions with up to 5 virtual users.
- ✅ Establishes performance benchmarks
- ✅ Validates API connectivity and response format

### 2. Load Test
Simulates realistic load with up to 20 virtual users.
- ✅ Identifies performance degradation under load
- ✅ Measures latency distribution (p90, p95)

### 3. Stress Test
Pushes the system to its limits with up to 60 virtual users.
- ✅ Identifies breaking point
- ✅ Measures behavior under extreme load

### 4. Quality Test
Validates accuracy and detects hallucinations.
- ✅ Tests factual accuracy (capitals, math)
- ✅ Detects when model ignores instructions
- ✅ Supports multiple valid answers per question

### 5. Consistency Test
Verifies model gives consistent answers to identical questions.
- ✅ Detects non-deterministic behavior
- ✅ Validates temperature=0 consistency

## 🚀 How To Run

### Prerequisites
- k6 installed (`brew install k6`)
- Groq API key ([get one free](https://console.groq.com))

### Setup
```bash
git clone https://github.com/AnaTodorov86/llm-performance-testing.git
cd llm-performance-testing
cp .env.example .env
# Add your GROQ_API_KEY to .env
```

### Run All Tests
```bash
./scripts/run_all_tests.sh
```

### Run Individual Tests
```bash
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/baseline_test.js
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/load_test.js
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/stress_test.js
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/quality_test.js
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/consistency_test.js
```

## 📁 Project Structure
```
llm-performance-testing/
├── tests/
│   ├── baseline_test.js      # 5 VUs - normal conditions
│   ├── load_test.js          # 20 VUs - realistic load
│   ├── stress_test.js        # 60 VUs - breaking point
│   ├── quality_test.js       # hallucination detection
│   └── consistency_test.js   # response consistency
├── scripts/
│   └── run_all_tests.sh      # runs all tests
├── .env.example              # environment variables template
├── .gitignore
└── README.md
```

## 💡 Key Insights

1. **Groq free tier** supports ~5 simultaneous users before rate limiting
2. **LLM quality** remains perfect (100%) when API responds
3. **Latency** is excellent — avg ~92ms, p95 ~139ms
4. **Consistency** is perfect with temperature=0
5. **Hallucination risk** exists for questions with multiple valid answers

## 🔮 Roadmap

- [ ] CI/CD integration with GitHub Actions
- [ ] HTML report generation
- [ ] Multi-model comparison (Groq vs OpenAI vs Gemini)
- [ ] Expanded hallucination detection

## Results

See [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) for full provider comparison and key findings.
