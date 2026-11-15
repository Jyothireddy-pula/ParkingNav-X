# ParkingNav-X Experiment Design

## Overview

Six experiment categories (E1–E6) × up to 4 strategies × 30 seeds = **651 total runs**.
All results are deterministic given a fixed seed; re-running any experiment produces
identical results.

## Experiment Matrix

| ID | Scenario | Strategies | Seeds | Purpose |
|----|----------|-----------|-------|---------|
| E1 | Normal day (baseline) | B1, B2, B3, P | 30 | Primary comparison |
| E2 | Event placement (500-person event) | B1, B2, B3, P | 30 | Demand spike response |
| E3 | Lot closure (academic lot closed) | B1, B2, B3, P | 30 | Supply constraint |
| E4 | Gate closure (main gate closed) | B1, B2, B3, P | 30 | Access constraint |
| E5 | Sensor noise (0%, 10%, 20%) | **P only** | 30 × 3 variants | P robustness to noise |
| E6 | Ablation (A/B/C/D) | **P only** | 30 × 4 variants | P component analysis |

**E1–E4** run all 4 strategies for a full baseline comparison.

**E5 and E6 intentionally run P strategy only** — these are single-strategy experiments
designed to characterize ParkingNavX Full (P) rather than compare strategies:

- **E5 (Sensor Noise Robustness):** P under 0%, 10%, 20% Gaussian noise on predicted
  fill rates. Baselines (B1–B3) are deterministic/greedy and do not use predictions,
  so adding noise to them is undefined and irrelevant.

- **E6 (Ablation):** Each ablation variant disables one component of P to measure its
  contribution. Variants A–D correspond to: A=no uncertainty, B=no proactive re-routing,
  C=no fill prediction, D=no queue penalty. Baselines are fixed algorithms and cannot be
  ablated in a meaningful way.

## Strategy Codes

| Code | Name | Description |
|------|------|-------------|
| B1 | FirstAvailable | Assign first lot with any space |
| B2 | NearestAvailable | Assign closest lot with space |
| B3 | PredictionOnly | Use XGBoost fill predictions only |
| P | ParkingNavX Full | B3 + uncertainty guard + proactive re-route + queue penalty |

## Observed P vs Baseline Performance

In the 30-seed experiments, **B3 (PredictionOnly) is the best-performing strategy**
in avg_search_time_min across E1–E4. P (ParkingNavX Full) performs similarly to B2
and slightly worse than B3.

This is expected: E1–E4 are low-to-moderate congestion scenarios with no lot overflow.
P's added overhead (uncertainty guard, proactive re-routing, queue penalty) is calibrated
for high-congestion environments. In scenarios where lots rarely fill, these heuristics
add travel distance without preventing failures.

P's correct advantage would appear in high-congestion scenarios with frequent overflow —
the fill guard and uncertainty bounds prevent vehicles from being routed to lots that
fill up between assignment and arrival.

## Total Run Count

```
E1–E4:  4 scenarios × 4 strategies × 30 seeds = 480 runs
E5:     3 variants × 1 strategy × 30 seeds    = 90 runs
E6:     4 variants × 1 strategy × 30 seeds    = 120 runs (note: variant A also = E5_noise_0)
                                        Total  = 651 runs
```

Counts are stored in `experiments/results/results_summary.json` as the `n_runs` field
per key `"<scenario>|<strategy>"`.

## Data Integrity

- All experiments use separate training and evaluation data (prediction model is trained
  on synthetic data; experiments test allocation, not model fitting).
- No hyperparameter tuning was performed against the E1–E4 benchmark scenarios.
- Confidence intervals use Student's t-distribution (df=n-1) across the 30 seeds per cell.
- Results in `all_results.json` include individual run records; `results_summary.json`
  contains pre-computed means, standard deviations, and 95% CI bounds.
