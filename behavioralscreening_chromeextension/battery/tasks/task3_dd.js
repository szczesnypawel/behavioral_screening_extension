import { median } from "../engine.js";

export const task3 = {
  name: "Delay Discounting",
  async run(ui) {
    ui.setTitle("Token Choices");
    ui.setSubtitle("Choose between tokens now vs. later.");
    ui.showMessage(
      "You will make 9 choices.\nPick Option A (tokens now) or Option B (tokens later).",
      "Press 1 for Option A, 2 for Option B."
    );
    await ui.waitForContinue("Begin");

    const delays = [1, 7, 30];
    const indifference = [];
    const rtAll = [];
    let maxInconsistency = 0;

    for (const delay of delays) {
      let nowValue = 50;
      let lastChoice = null;
      let inconsistency = 0;

      for (let i = 0; i < 3; i += 1) {
        const choice = await ui.showChoice(
          `Option A: ${nowValue} tokens now`,
          `Option B: 100 tokens in ${delay} days`
        );
        rtAll.push(choice.rt);

        if (lastChoice && lastChoice !== choice.value) {
          inconsistency += 1;
        }
        lastChoice = choice.value;

        if (choice.value === "now") {
          nowValue = Math.max(10, nowValue - 10);
        } else {
          nowValue = Math.min(90, nowValue + 10);
        }
      }

      indifference.push({ delay, value: nowValue });
      maxInconsistency = Math.max(maxInconsistency, inconsistency);
    }

    const points = indifference
      .map((item) => [item.delay / 30, item.value / 100])
      .sort((a, b) => a[0] - b[0]);

    let aucValue = 0;
    for (let i = 1; i < points.length; i += 1) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      aucValue += (x1 - x0) * (y0 + y1) / 2;
    }

    const medianRt = median(rtAll);

    return {
      metrics: {
        dd_auc: Number(aucValue.toFixed(3)),
        dd_inconsistency: maxInconsistency,
        dd_median_rt: Math.round(medianRt)
      },
      validity: {
        ddImplausible: maxInconsistency >= 2 || medianRt < 250
      }
    };
  }
};
