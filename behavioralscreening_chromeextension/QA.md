# Manual QA checklist

- Load unpacked extension from `behavioral_screening_extension/` in Chrome.
- Open popup with no settings: verify it prompts to open Options.
- Set 1 target URL and retest days, save, re-open popup: see "Start calibration".
- Run full calibration: ensure tasks progress and results screen appears.
- Confirm `bv_last_result` is saved in `chrome.storage.local`.
- Click "Continue to target": verify URL params appended and `bv_proof` base64url.
- Re-open popup: verify tier, confidence, and expiry displayed.
- Visit the configured target URL: runner should auto-open when retest is due.
- Verify cooldown prevents immediate recalibrate in results screen.
- Toggle debug mode: ensure `bv_last_metrics` stored with aggregated metrics.
