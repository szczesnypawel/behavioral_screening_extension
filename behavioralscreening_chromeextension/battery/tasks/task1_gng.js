import { shuffle, median, iqr, sleep } from "../engine.js";

export const task1 = {
  name: "Go/No-Go",
  async run(ui) {
    ui.setTitle("Go / No-Go");
    ui.setSubtitle("Press SPACE for green. Do nothing for red.");

    ui.showMessage(
      "Practice round:\nPress SPACE when you see the green circle.\nDo nothing when you see the red square.",
      "Try to respond quickly and accurately."
    );
    await ui.waitForContinue("Begin practice");
    await runBlock(ui, 8, 0.25, true);

    ui.showMessage(
      "Main round:\n120 trials total.\nA short break appears halfway.",
      "Press SPACE for green, do nothing for red."
    );
    await ui.waitForContinue("Begin");

    const metrics = await runBlock(ui, 120, 0.25, false, true);

    const validity = {
      fastRts: metrics.gng_fast_rt_rate > 0.10,
      nonEngaged: metrics.gng_omission_rate > 0.35
    };

    if (
      metrics.gng_commission_rate === 0 &&
      metrics.gng_omission_rate === 0 &&
      metrics.gng_rt_iqr < 40
    ) {
      validity.fastRts = true;
    }

    return { metrics, validity };
  }
};

async function runBlock(ui, trialCount, nogoRate, isPractice, allowBreak = false) {
  const nogoCount = Math.round(trialCount * nogoRate);
  const goCount = trialCount - nogoCount;
  const trials = shuffle([
    ...Array(goCount).fill("go"),
    ...Array(nogoCount).fill("nogo")
  ]);

  const goRts = [];
  let goCorrect = 0;
  let goMiss = 0;
  let nogoPresses = 0;
  let goFast = 0;

  for (let i = 0; i < trials.length; i += 1) {
    if (allowBreak && i === 60 && !isPractice) {
      await ui.showCountdown("Break", 10);
      ui.showMessage("Break over.\nResuming now.", "Get ready.");
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    ui.showFixation("+");
    await sleep(300);

    const isGo = trials[i] === "go";
    if (isGo) {
      ui.showStimulus("O", "stimulus");
      ui.setStimulusStyle({ color: "#5dd39e" });
    } else {
      ui.showStimulus("[]", "stimulus");
      ui.setStimulusStyle({ color: "#ff6b6b" });
    }
    const onset = performance.now();
    const hideTimeout = setTimeout(() => ui.clearContent(), 250);
    const response = await ui.waitForKey(["Space"], 700);
    const rt = response.timedOut ? null : response.time - onset;
    clearTimeout(hideTimeout);

    if (isGo) {
      if (rt === null) {
        goMiss += 1;
      } else {
        goCorrect += 1;
        goRts.push(rt);
        if (rt < 150) {
          goFast += 1;
        }
      }
    } else if (rt !== null) {
      nogoPresses += 1;
    }

    ui.clearContent();
    await sleep(300);
  }

  if (isPractice) {
    return {};
  }

  const commissionRate = nogoCount ? nogoPresses / nogoCount : 0;
  const omissionRate = goCount ? goMiss / goCount : 0;
  const rtMedian = median(goRts);
  const rtIqr = iqr(goRts);
  const fastRtRate = goCorrect ? goFast / goCorrect : 0;

  return {
    gng_commission_rate: Number(commissionRate.toFixed(3)),
    gng_omission_rate: Number(omissionRate.toFixed(3)),
    gng_rt_median: Math.round(rtMedian),
    gng_rt_iqr: Math.round(rtIqr),
    gng_fast_rt_rate: Number(fastRtRate.toFixed(3))
  };
}
