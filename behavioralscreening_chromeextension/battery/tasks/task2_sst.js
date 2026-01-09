import { shuffle, median, sleep } from "../engine.js";

export const task2 = {
  name: "Stop-Signal",
  async run(ui) {
    ui.setTitle("Stop-Signal Arrows");
    ui.setSubtitle("Press LEFT or RIGHT for direction. Stop when STOP flashes.");

    ui.showMessage(
      "Practice round:\nPress LEFT for LEFT and RIGHT for RIGHT.\nIf STOP appears, do not press anything.",
      "Go fast, but try to stop when STOP flashes."
    );
    await ui.waitForContinue("Begin practice");
    await runBlock(ui, 12, 0.2, true);

    ui.showMessage(
      "Main round:\n100 trials total.\nOn STOP trials, do not press any key.",
      "Respond quickly when there is no STOP."
    );
    await ui.waitForContinue("Begin");
    const metrics = await runBlock(ui, 100, 0.2, false);

    const validity = {
      sstNoncompliant: metrics.sst_stop_success_rate < 0.2 || metrics.sst_stop_success_rate > 0.8 || metrics.sst_go_accuracy < 0.8
    };

    return { metrics, validity };
  }
};

async function runBlock(ui, trialCount, stopRate, isPractice) {
  const stopCount = Math.round(trialCount * stopRate);
  const goCount = trialCount - stopCount;
  const trials = shuffle([
    ...Array(goCount).fill("go"),
    ...Array(stopCount).fill("stop")
  ]);

  let ssd = 250;
  const ssdHistory = [];
  const goRts = [];
  let goCorrect = 0;
  let goMiss = 0;
  let stopSuccess = 0;

  for (let i = 0; i < trials.length; i += 1) {
    ui.showFixation("+");
    await sleep(300);

    const dir = Math.random() > 0.5 ? "ArrowLeft" : "ArrowRight";
    ui.showStimulus(dir === "ArrowLeft" ? "LEFT" : "RIGHT", "stimulus");
    ui.setStimulusStyle({ color: "#f2f5f7" });
    const onset = performance.now();
    let stopTimeout;
    if (trials[i] === "stop") {
      stopTimeout = setTimeout(() => {
        ui.showStopSignal();
        setTimeout(() => ui.hideStopSignal(), 150);
      }, ssd);
    }

    const response = await ui.waitForKey(["ArrowLeft", "ArrowRight"], 1000);
    const rt = response.timedOut ? null : response.time - onset;

    if (stopTimeout) {
      clearTimeout(stopTimeout);
    }

    if (trials[i] === "go") {
      if (!response.timedOut && response.code === dir) {
        goCorrect += 1;
        goRts.push(rt);
      } else if (!response.timedOut) {
        goMiss += 1;
      } else {
        goMiss += 1;
      }
    } else {
      const success = response.timedOut;
      if (success) {
        ssd = Math.min(600, ssd + 50);
      } else {
        ssd = Math.max(50, ssd - 50);
      }

      if (success) {
        stopSuccess += 1;
      }
      ssdHistory.push(ssd);
    }

    ui.hideStopSignal();
    ui.clearContent();
    await sleep(300);
  }

  if (isPractice) {
    return {};
  }

  const goAccuracy = goCount ? goCorrect / goCount : 0;
  const stopSuccessRate = stopCount ? stopSuccess / stopCount : 0;
  const meanSsd = ssdHistory.length
    ? ssdHistory.reduce((sum, value) => sum + value, 0) / ssdHistory.length
    : ssd;
  const goRtMedian = median(goRts);
  const ssrt = goRtMedian - meanSsd;

  return {
    sst_go_rt_median: Math.round(goRtMedian),
    sst_stop_success_rate: Number(stopSuccessRate.toFixed(3)),
    sst_mean_ssd: Math.round(meanSsd),
    sst_ssrt_est: Math.round(ssrt),
    sst_go_accuracy: Number(goAccuracy.toFixed(3))
  };
}
