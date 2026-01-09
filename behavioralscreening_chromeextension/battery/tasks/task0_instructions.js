import { sleep } from "../engine.js";

export const task0 = {
  name: "Instruction checks",
  async run(ui) {
    let instructionFails = 0;

    ui.setTitle("Instructions");
    ui.setSubtitle("Follow the prompts carefully.");

    ui.showMessage(
      "Practice 1:\nWhen the circle appears, press SPACE.",
      "Press SPACE as soon as you see it."
    );
    await ui.waitForContinue("Start");

    await sleep(500);
    ui.showStimulus("O", "stimulus");
    const practice = await ui.waitForKey(["Space"], 3000);
    ui.clearContent();
    if (practice.timedOut) {
      instructionFails += 1;
    }

    ui.showMessage(
      "Practice 2:\nPress the K key now to continue.",
      "This checks that you are reading the instructions."
    );
    await ui.waitForContinue("Ready");
    const keyCheck = await ui.waitForKey(["KeyK"], 3000);
    ui.clearContent();
    if (keyCheck.timedOut) {
      instructionFails += 1;
    }

    ui.showMessage(
      "Practice 3:\nDo not press anything on the next screen.",
      "Keep your hands off the keyboard for 2 seconds."
    );
    await ui.waitForContinue("Ready");
    ui.showStimulus("", "stimulus");
    const inhibition = await ui.waitForKey(["Space", "KeyK", "ArrowLeft", "ArrowRight", "Digit1", "Digit2", "Digit3", "Digit4"], 2000);
    ui.clearContent();
    if (!inhibition.timedOut) {
      instructionFails += 1;
    }

    return {
      metrics: {},
      validity: {
        instructionFails
      }
    };
  }
};
