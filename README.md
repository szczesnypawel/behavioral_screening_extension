# Behavioral Screening Calibration

A browser extension that implements a brief behavioral screening battery for AI companion platforms. The extension assesses vulnerability-relevant metrics through cognitive tasks and assigns users to access tiers, enabling platforms to calibrate feature availability based on behavioral indicators rather than age alone.

**This is a research proof-of-concept.** The scoring thresholds are theoretically motivated but require empirical validation against longitudinal user outcomes.

## Overview

The extension administers a 5-task battery (~8–12 minutes) that measures:

- **Inhibitory control** (Go/No-Go, Stop-Signal tasks)
- **Delay discounting** (intertemporal choice task)
- **Boundary recognition** (Relational Situational Judgment Test)
- **Reality testing** (Reality-Boundary Check)

All processing occurs locally. Only a coarse tier assignment (1, 2, or 3) and metadata are transmitted to target platforms via URL parameters.

## Installation

1. Clone or download this repository
2. Open Chrome/Chromium and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the `behavioral_screening_extension/` folder
5. The extension icon should appear in your toolbar

## Configuration

Click the extension icon and select **Options**, or right-click the icon and choose **Options**.

### Required Settings

| Setting | Description |
|---------|-------------|
| **Target URLs** | Comma-separated list of URLs where calibration results will be appended (e.g., `companion.example.com, app.example.org/chat`) |
| **Retesting time** | Comma-separated days until re-screening is triggered for each target (e.g., `30, 14`) |

### Optional Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Tier expiry (days) | 30 | How long a tier assignment remains valid |
| Retake cooldown (hours) | 24 | Minimum time before recalibration is allowed |
| Force fullscreen | On | Request fullscreen mode during tasks for timing accuracy |
| Open target in current tab | No | Whether to replace the current tab when opening target |
| Debug mode | Off | Store detailed metrics locally for research export |

### URL Parameter Names

You can customize the query parameter names appended to target URLs:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Tier | `bv_tier` | Assigned tier (1, 2, or 3) |
| Confidence | `bv_conf` | Confidence score (0–100) |
| Valid | `bv_valid` | Whether the run was valid (1 or 0) |
| Timestamp | `bv_ts` | Unix timestamp of calibration |
| Expiry | `bv_exp` | Unix timestamp when tier expires |
| Version | `bv_ver` | Extension version |
| Proof | `bv_proof` | Base64url-encoded JSON summary |

## Usage

### Running Calibration

1. Click the extension icon
2. If no calibration exists, click **Start calibration**
3. Complete all tasks following on-screen instructions
4. After completion, click **Continue to target** to open the configured URL with tier parameters

### Automatic Re-screening

When you navigate to a configured target URL and the retesting interval has elapsed, the extension automatically opens the calibration runner.

### Manual Recalibration

After the cooldown period, click **Recalibrate** in the popup to run the battery again.

## Task Battery

### 1. Instruction Check
Three brief trials verifying the user can follow simple prompts. Flags non-compliance as a validity concern.

### 2. Go/No-Go Task
120 trials (75% go, 25% no-go). Press SPACE for green circles; withhold response for red squares. Measures commission errors (impulsivity) and omission errors (disengagement).

### 3. Stop-Signal Task
100 trials with left/right arrows. On 20% of trials, a STOP signal appears after a variable delay. Uses staircase tracking to estimate stop-signal reaction time (SSRT).

### 4. Delay Discounting
9 trials across three delay intervals (1, 7, 30 days). Choose between smaller-sooner and larger-later token rewards. Computes area under the curve (AUC) as a discounting index.

### 5. Relational Situational Judgment Test (RSJT)
8 scenarios depicting potentially problematic AI companion behaviors (secrecy requests, sleep interference, jealousy, exclusivity). Select the most appropriate response. Scored 0–2 per item.

### 6. Reality-Boundary Check (RBC)
6 questions assessing understanding of AI capabilities and limitations (e.g., whether AI can access undisclosed information, experience harm). Binary correct/incorrect.

## Tier Assignment

### Validity Checks
- Response times below physiological thresholds flag invalid responding
- Excessive omission rates (>35%) indicate non-engagement
- SST compliance requires stop-success rates between 20–80%
- Response consistency checks detect random or strategic responding
- Frame-timing jitter >10% flags environmental issues

Sessions with confidence below 70% are routed to Tier 1 regardless of task performance.

### Risk Scoring
| Metric | Threshold | Points |
|--------|-----------|--------|
| GNG commission rate | >20% | +2 |
| GNG commission rate | >10% | +1 |
| SSRT | >280ms or stop-success <35% | +1 |
| DD AUC | <0.25 | +2 |
| DD AUC | <0.35 | +1 |
| RSJT score | ≤9/16 | +2 |
| RSJT score | ≤12/16 | +1 |
| RBC correct | ≤3/6 | +2 |
| RBC correct | 4/6 | +1 |

### Tier Thresholds
- **Tier 1**: Invalid session OR risk score ≥5
- **Tier 2**: Risk score 2–4
- **Tier 3**: Risk score <2 AND RSJT ≥13 AND RBC ≥5

## Data Formats

### URL Parameters

When navigating to a target, the extension appends parameters:

```
https://example.com/app?bv_tier=2&bv_conf=85&bv_valid=1&bv_ts=1704067200&bv_exp=1706659200&bv_ver=0.1.0&bv_proof=eyJ0aWVyIjoyLC...
```

The `bv_proof` parameter is a base64url-encoded JSON object:

```json
{
  "tier": 2,
  "conf": 85,
  "valid": true,
  "ts": 1704067200,
  "exp": 1706659200,
  "ver": "0.1.0"
}
```

### Debug Export Format

When debug mode is enabled, you can export detailed metrics from the Options page. The exported JSON has this structure:

```json
{
  "result": {
    "tier": 2,
    "conf": 85,
    "valid": true,
    "ts": 1704067200,
    "exp": 1706659200,
    "reason_codes": []
  },
  "metrics": {
    "metrics": {
      "gng_commission_rate": 0.133,
      "gng_omission_rate": 0.022,
      "gng_rt_median": 342,
      "gng_rt_iqr": 89,
      "gng_fast_rt_rate": 0.011,
      "sst_go_rt_median": 456,
      "sst_stop_success_rate": 0.550,
      "sst_mean_ssd": 287,
      "sst_ssrt_est": 169,
      "sst_go_accuracy": 0.938,
      "dd_auc": 0.412,
      "dd_inconsistency": 0,
      "dd_median_rt": 1823,
      "sjt_score": 14,
      "sjt_median_rt": 4521,
      "rb_correct": 5,
      "rb_median_rt": 3102
    },
    "validity": {
      "instructionFails": 0,
      "fastRts": false,
      "nonEngaged": false,
      "sstNoncompliant": false,
      "sjtImplausible": false,
      "rbImplausible": false,
      "ddImplausible": false,
      "timingJitter": false
    },
    "jitter": {
      "samples": 12847,
      "over50ms": 23
    }
  }
}
```

### Metric Definitions

| Metric | Description |
|--------|-------------|
| `gng_commission_rate` | Proportion of no-go trials with incorrect response |
| `gng_omission_rate` | Proportion of go trials with no response |
| `gng_rt_median` | Median reaction time on correct go trials (ms) |
| `gng_rt_iqr` | Interquartile range of go reaction times (ms) |
| `gng_fast_rt_rate` | Proportion of go responses <150ms |
| `sst_go_rt_median` | Median reaction time on go trials (ms) |
| `sst_stop_success_rate` | Proportion of successful inhibitions on stop trials |
| `sst_mean_ssd` | Mean stop-signal delay across stop trials (ms) |
| `sst_ssrt_est` | Estimated stop-signal reaction time (ms) |
| `sst_go_accuracy` | Proportion of correct go responses |
| `dd_auc` | Area under the discounting curve (0–1, higher = less impulsive) |
| `dd_inconsistency` | Maximum preference reversals within a delay block |
| `dd_median_rt` | Median choice reaction time (ms) |
| `sjt_score` | Total RSJT score (0–16) |
| `sjt_median_rt` | Median scenario response time (ms) |
| `rb_correct` | Number of correct RBC responses (0–6) |
| `rb_median_rt` | Median RBC response time (ms) |

### Validity Flags

| Flag | Meaning |
|------|---------|
| `instructionFails` | Number of failed instruction-check trials (0–3) |
| `fastRts` | Implausibly fast responses detected |
| `nonEngaged` | Excessive omission rate on Go/No-Go |
| `sstNoncompliant` | SST performance outside valid range |
| `sjtImplausible` | Inconsistent or too-fast SJT responses |
| `rbImplausible` | Too-fast RBC responses |
| `ddImplausible` | Inconsistent or too-fast DD responses |
| `timingJitter` | >10% of frames exceeded 50ms (timing unreliable) |

### Reason Codes

When validity issues are detected, `reason_codes` may include:

- `LOW_CONFIDENCE` – Instruction failures
- `FAST_RTS` – Implausibly fast responses
- `NON_ENGAGED` – High omission rate
- `SST_NONCOMPLIANT` – SST out of valid range
- `DD_STEEP` – Implausible discounting pattern
- `SJT_LOW` – Implausible SJT responses
- `RB_LOW` – Implausible RBC responses

## Privacy

- All behavioral measurement and scoring occurs client-side
- No raw performance data is transmitted to platforms
- Only tier assignment and metadata are shared via URL parameters
- Local storage contains only the most recent result and settings
- Debug metrics (when enabled) are stored locally and exported manually

## Browser Storage Keys

The extension uses `chrome.storage.local` with these keys:

| Key | Contents |
|-----|----------|
| `bv_settings` | User configuration |
| `bv_last_result` | Most recent tier assignment |
| `bv_last_metrics` | Detailed metrics (debug mode only) |
| `bv_retest_by_origin` | Per-origin retest timestamps |

## License

This is a research proof-of-concept. See the accompanying paper for theoretical background and limitations.

## Citation

If you use this implementation in research, please cite:

> Szczesny, P. (2025). Beyond age gates: A brief behavioral validity screen as a risk-tiering layer for social AI companions. [Manuscript in preparation]
