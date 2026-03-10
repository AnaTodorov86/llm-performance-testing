# LLM Performance & Quality Testing Framework

A comprehensive testing framework for evaluating LLM API performance, 
reliability, and response quality under various load conditions.

## 🎯 What This Project Tests

- **Performance** — How fast does the LLM respond under load?
- **Reliability** — At what point does the system start failing?
- **Quality** — Are the responses accurate and consistent?
- **Hallucination Detection** — Does the model give wrong answers?

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
