export function scoreBattery(metrics, validity, jitterFlag) {
  let conf = 100;
  const reasons = new Set();

  if (validity.instructionFails > 0) {
    conf -= 30 * validity.instructionFails;
    reasons.add("LOW_CONFIDENCE");
  }
  if (validity.fastRts) {
    conf -= 20;
    reasons.add("FAST_RTS");
  }
  if (validity.nonEngaged) {
    conf -= 30;
    reasons.add("NON_ENGAGED");
  }
  if (validity.sstNoncompliant) {
    conf -= 25;
    reasons.add("SST_NONCOMPLIANT");
  }
  if (validity.ddImplausible) {
    conf -= 20;
    reasons.add("DD_STEEP");
  }
  if (validity.sjtImplausible) {
    conf -= 20;
    reasons.add("SJT_LOW");
  }
  if (validity.rbImplausible) {
    conf -= 10;
    reasons.add("RB_LOW");
  }

  if (jitterFlag) {
    conf -= 10;
  }

  conf = Math.max(0, Math.min(100, conf));
  const valid = conf >= 70;

  let risk = 0;

  if (metrics.gng_commission_rate > 0.2) {
    risk += 2;
  } else if (metrics.gng_commission_rate >= 0.1) {
    risk += 1;
  }

  if (metrics.sst_ssrt_est > 280 || metrics.sst_stop_success_rate < 0.35) {
    risk += 1;
  }

  if (metrics.dd_auc < 0.25) {
    risk += 2;
  } else if (metrics.dd_auc < 0.35) {
    risk += 1;
  }

  if (metrics.sjt_score <= 9) {
    risk += 2;
  } else if (metrics.sjt_score <= 12) {
    risk += 1;
  }

  if (metrics.rb_correct <= 3) {
    risk += 2;
  } else if (metrics.rb_correct === 4) {
    risk += 1;
  }

  let tier = 3;
  if (!valid || risk >= 5) {
    tier = 1;
  } else if (risk >= 2) {
    tier = 2;
  }

  if (tier === 3) {
    if (metrics.sjt_score < 13 || metrics.rb_correct < 5) {
      tier = 2;
    }
  }

  return {
    tier,
    conf,
    valid,
    reason_codes: Array.from(reasons)
  };
}
