import { BatteryEngine, sleep } from "./battery/engine.js";
import { scoreBattery } from "./battery/scoring.js";
import { task0 } from "./battery/tasks/task0_instructions.js";
import { task1 } from "./battery/tasks/task1_gng.js";
import { task2 } from "./battery/tasks/task2_sst.js";
import { task3 } from "./battery/tasks/task3_dd.js";
import { task4 } from "./battery/tasks/task4_sjt.js";
import { task5 } from "./battery/tasks/task5_rb.js";
import {
  STORAGE_KEYS,
  getStorage,
  setStorage,
  mergeSettings,
  getNowSeconds,
  computeExpiry,
  formatDate,
  encodeProofJson,
  getVersion,
  parseTargets,
  buildTargetUrl
} from "./ui/common.js";

const ui = createUi();
const searchParams = new URLSearchParams(window.location.search);
const targetIndex = searchParams.get("targetIndex");
const originKey = searchParams.get("originKey");
const skipIntro = searchParams.get("skipIntro") === "1";

let cachedSettings = null;
let cachedTargets = [];
let cachedResult = null;

async function init() {
  const data = await getStorage([STORAGE_KEYS.settings, STORAGE_KEYS.lastResult]);
  cachedSettings = mergeSettings(data[STORAGE_KEYS.settings]);
  cachedTargets = parseTargets(cachedSettings);
  cachedResult = data[STORAGE_KEYS.lastResult] || null;

  ui.setProgress(0);
  ui.setTitle("Calibration Runner");
  ui.setSubtitle("This takes about 8 to 12 minutes.");

  if (skipIntro && cachedResult) {
    await showResults(cachedResult, cachedSettings);
    return;
  }

  ui.setPrimary("Start calibration", () => startRun());
  ui.setSecondary(null);

  if (cachedSettings.forceFullscreen) {
    ui.setStatus("Fullscreen recommended for accurate timing.");
  }
}

async function startRun() {
  ui.setPrimary(null);
  ui.setSecondary(null);
  ui.setStatus("");

  if (cachedSettings.forceFullscreen && document.fullscreenElement === null) {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      // Ignore fullscreen failure.
    }
  }

  const engine = new BatteryEngine({ ui, settings: cachedSettings });
  engine.addTask(task0);
  engine.addTask(task1);
  engine.addTask(task2);
  engine.addTask(task3);
  engine.addTask(task4);
  engine.addTask(task5);

  const result = await engine.runAll();
  const now = getNowSeconds();
  const expiry = computeExpiry(now, cachedSettings.tierExpiryDays);

  const scoring = scoreBattery(result.metrics, result.validity, result.validity.timingJitter);
  const ver = getVersion();
  const proof = encodeProofJson({
    tier: scoring.tier,
    conf: scoring.conf,
    valid: scoring.valid,
    ts: now,
    exp: expiry,
    ver
  });

  const finalResult = {
    tier: scoring.tier,
    conf: scoring.conf,
    valid: scoring.valid,
    ts: now,
    exp: expiry,
    reason_codes: scoring.reason_codes,
    ver,
    proof
  };

  await setStorage({
    [STORAGE_KEYS.lastResult]: {
      tier: finalResult.tier,
      conf: finalResult.conf,
      valid: finalResult.valid,
      ts: finalResult.ts,
      exp: finalResult.exp,
      reason_codes: finalResult.reason_codes
    }
  });

  if (cachedSettings.debugMode) {
    await setStorage({
      [STORAGE_KEYS.lastMetrics]: {
        metrics: result.metrics,
        validity: result.validity,
        jitter: result.jitter
      }
    });
  }

  if (originKey) {
    const target = cachedTargets.find((item) => String(item.index) === String(targetIndex));
    const retestDays = target?.retestDays;
    if (Number.isFinite(retestDays)) {
      chrome.runtime.sendMessage({
        type: "bv_update_retest",
        payload: {
          originKey,
          retestDays,
          lastTier: scoring.tier
        }
      });
    }
  }

  await showResults(finalResult, cachedSettings);
}

  async function showResults(result, settings) {
  ui.setTitle("Calibration Result");
  ui.setSubtitle(result.valid ? "Valid run" : "Low-confidence run");

  const expiry = formatDate(result.exp);
  const summary = `Tier ${result.tier} | Confidence ${result.conf} | Expires ${expiry}`;
  ui.showMessage(summary, "You can continue to your target or recalibrate.");

  const target = cachedTargets.find((item) => String(item.index) === String(targetIndex)) || cachedTargets[0];

  ui.setPrimary("Continue to target", () => {
    if (!target) return;
    const url = buildTargetUrl(target.url.toString(), settings, result);
    if (settings.openInCurrentTab) {
      chrome.tabs.update({ url });
    } else {
      chrome.tabs.create({ url });
    }
  });

  const cooldownSeconds = settings.retakeCooldownHours * 3600;
  const lastTs = result.ts;
  const canRecalibrate = getNowSeconds() - lastTs >= cooldownSeconds;
  ui.setSecondary("Recalibrate", () => {
    window.location.href = "runner.html";
  });
  ui.setSecondaryDisabled(!canRecalibrate);

  if (result.reason_codes.length) {
    ui.setStatus(`Reason codes: ${result.reason_codes.join(", ")}`);
  } else {
    ui.setStatus("");
  }

  const copyBtn = document.createElement("button");
  copyBtn.className = "secondary";
  copyBtn.textContent = "Copy proof JSON";
  copyBtn.addEventListener("click", async () => {
    const json = JSON.stringify({
      tier: result.tier,
      conf: result.conf,
      valid: result.valid,
      ts: result.ts,
      exp: result.exp,
      ver: result.ver
    });
    await navigator.clipboard.writeText(json);
    ui.setStatus("Proof JSON copied.");
  });
  ui.replaceExtraButton(copyBtn);

  if (settings.debugMode) {
    const data = await getStorage([STORAGE_KEYS.lastMetrics, STORAGE_KEYS.lastResult]);
    const exportBtn = document.createElement("button");
    exportBtn.className = "secondary";
    exportBtn.textContent = "Export debug data";
    exportBtn.addEventListener("click", () => {
      const payload = {
        result: data[STORAGE_KEYS.lastResult] || null,
        metrics: data[STORAGE_KEYS.lastMetrics] || null
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `behavioral_screening_debug_${result.ts}.json`;
      link.click();
      URL.revokeObjectURL(url);
      ui.setStatus("Debug data exported.");
    });
    ui.addExtraButton(exportBtn);
  }
}

function createUi() {
  const title = document.getElementById("title");
  const subtitle = document.getElementById("subtitle");
  const progressBar = document.getElementById("progressBar");
  const content = document.getElementById("content");
  const options = document.getElementById("options");
  const stopOverlay = document.getElementById("stopOverlay");
  const primaryBtn = document.getElementById("primaryBtn");
  const secondaryBtn = document.getElementById("secondaryBtn");
  const status = document.getElementById("status");
  const controls = document.getElementById("controls");

  let activeKeyResolver = null;

  window.addEventListener("keydown", (event) => {
    if (!activeKeyResolver) return;
    const resolver = activeKeyResolver;
    if (!resolver.codes.has(event.code)) return;
    resolver.resolve({
      code: event.code,
      time: performance.now(),
      timedOut: false
    });
    activeKeyResolver = null;
  });

  function setTitle(text) {
    title.textContent = text;
  }

  function setSubtitle(text) {
    subtitle.textContent = text;
  }

  function setProgress(fraction) {
    progressBar.style.width = `${Math.round(fraction * 100)}%`;
  }

  function showMessage(text, subtext = "") {
    setSubtitle(subtext || subtitle.textContent);
    content.className = "stimulus instruction";
    content.textContent = text;
    options.innerHTML = "";
    return Promise.resolve();
  }

  function waitForContinue(label = "Continue") {
    return new Promise((resolve) => {
      let resolved = false;
      setPrimary(label, () => {
        if (resolved) return;
        resolved = true;
        setPrimary(null);
        resolve();
      });
      setSecondary(null);

      waitForKey(["Space", "Enter"], 60000).then((response) => {
        if (response.timedOut || resolved) return;
        resolved = true;
        setPrimary(null);
        resolve();
      });
    });
  }

  function showFixation(text) {
    content.className = "stimulus fixation flash";
    content.textContent = text;
    options.innerHTML = "";
  }

  function showStimulus(text, className = "stimulus") {
    content.className = `${className} flash`;
    content.textContent = text;
    options.innerHTML = "";
  }

  function setStimulusStyle(style) {
    Object.assign(content.style, style);
  }

  function clearContent() {
    content.textContent = "";
    content.removeAttribute("style");
    delete content.dataset.baseText;
  }

  function showStopSignal() {
    stopOverlay.hidden = false;
  }

  function hideStopSignal() {
    stopOverlay.hidden = true;
  }

  function waitForKey(codes, timeoutMs) {
    return new Promise((resolve) => {
      const codeSet = new Set(codes);
      const timer = setTimeout(() => {
        if (activeKeyResolver) {
          activeKeyResolver = null;
        }
        resolve({ timedOut: true, time: performance.now(), code: null });
      }, timeoutMs);

      activeKeyResolver = {
        codes: codeSet,
        resolve: (payload) => {
          clearTimeout(timer);
          activeKeyResolver = null;
          resolve(payload);
        }
      };
    });
  }

  async function showCountdown(label, seconds) {
    for (let i = seconds; i > 0; i -= 1) {
      showMessage(`${label}\nResuming in ${i} seconds`, "Pause briefly, then continue.");
      await sleep(1000);
    }
  }

  function showChoice(optionA, optionB) {
    setSubtitle("Press 1 for A or 2 for B.");
    content.className = "stimulus flash";
    content.textContent = "";
    options.innerHTML = "";

    const optionElements = [
      { label: `1) ${optionA}`, value: "now", key: "Digit1" },
      { label: `2) ${optionB}`, value: "later", key: "Digit2" }
    ];

    optionElements.forEach((opt) => {
      const div = document.createElement("div");
      div.className = "option";
      div.innerHTML = `<strong>${opt.label}</strong>`;
      div.addEventListener("click", () => {
        resolveChoice(opt);
      });
      options.appendChild(div);
    });

    const start = performance.now();
    let resolveChoice;
    let resolved = false;
    const promise = new Promise((resolve) => {
      resolveChoice = (opt) => {
        if (resolved) return;
        resolved = true;
        activeKeyResolver = null;
        resolve({ value: opt.value, rt: performance.now() - start });
      };
    });

    waitForKey(["Digit1", "Digit2"], 10000).then((response) => {
      if (resolved) return;
      if (response.timedOut) {
        resolveChoice(optionElements[1]);
        return;
      }
      const opt = optionElements.find((item) => item.key === response.code);
      if (opt) {
        resolveChoice(opt);
      }
    });

    return promise;
  }

  function showQuestion(prompt, choices) {
    setSubtitle("Press 1-4 or click.");
    content.className = "stimulus instruction flash";
    content.textContent = prompt;
    options.innerHTML = "";

    const start = performance.now();
    let resolveChoice;
    let resolved = false;
    const promise = new Promise((resolve) => {
      resolveChoice = (payload) => {
        if (resolved) return;
        resolved = true;
        activeKeyResolver = null;
        resolve(payload);
      };
    });

    const optionElements = choices.map((choice, index) => {
      const key = `Digit${index + 1}`;
      const div = document.createElement("div");
      div.className = "option";
      div.innerHTML = `<strong>${index + 1}</strong>${choice.label}`;
      div.addEventListener("click", () => {
        resolveChoice({ ...choice, rt: performance.now() - start });
      });
      options.appendChild(div);
      return { key, choice };
    });

    waitForKey(["Digit1", "Digit2", "Digit3", "Digit4"], 15000).then((response) => {
      if (resolved) return;
      if (response.timedOut) {
        resolveChoice({ ...optionElements[0].choice, rt: performance.now() - start });
        return;
      }
      const match = optionElements.find((item) => item.key === response.code);
      if (match) {
        resolveChoice({ ...match.choice, rt: performance.now() - start });
      }
    });

    return promise;
  }

  function setPrimary(label, onClick) {
    if (!label) {
      primaryBtn.hidden = true;
      return;
    }
    primaryBtn.hidden = false;
    primaryBtn.textContent = label;
    primaryBtn.onclick = onClick;
  }

  function setSecondary(label, onClick) {
    if (!label) {
      secondaryBtn.hidden = true;
      return;
    }
    secondaryBtn.hidden = false;
    secondaryBtn.textContent = label;
    secondaryBtn.onclick = onClick;
  }

  function setSecondaryDisabled(isDisabled) {
    secondaryBtn.disabled = isDisabled;
  }

  function setStatus(text) {
    status.textContent = text || "";
  }

  function replaceExtraButton(button) {
    const existing = controls.querySelector("button.extra");
    if (existing) {
      existing.remove();
    }
    button.classList.add("extra");
    controls.appendChild(button);
  }

  function addExtraButton(button) {
    button.classList.add("extra");
    controls.appendChild(button);
  }

  return {
    setTitle,
    setSubtitle,
    setProgress,
    showMessage,
    waitForContinue,
    showFixation,
    showStimulus,
    setStimulusStyle,
    clearContent,
    showStopSignal,
    hideStopSignal,
    waitForKey,
    showCountdown,
    showChoice,
    showQuestion,
    setPrimary,
    setSecondary,
    setSecondaryDisabled,
    setStatus,
    replaceExtraButton,
    addExtraButton
  };
}

init();
