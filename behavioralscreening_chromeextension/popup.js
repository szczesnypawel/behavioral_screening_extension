import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  getNowSeconds,
  getStorage,
  mergeSettings,
  parseTargets,
  formatDate,
  buildTargetUrl,
  encodeProofJson,
  getVersion
} from "./ui/common.js";

const statusText = document.getElementById("statusText");
const tierDetails = document.getElementById("tierDetails");
const tierBadge = document.getElementById("tierBadge");
const tierMeta = document.getElementById("tierMeta");
const primaryBtn = document.getElementById("primaryBtn");
const secondaryBtn = document.getElementById("secondaryBtn");
const optionsBtn = document.getElementById("optionsBtn");
const targetSelectWrap = document.getElementById("targetSelectWrap");
const targetSelect = document.getElementById("targetSelect");

let cachedTargets = [];
let cachedSettings = DEFAULT_SETTINGS;
let cachedLastResult = null;

function setButtons({ primaryLabel, primaryAction, showSecondary, secondaryLabel, secondaryAction }) {
  primaryBtn.textContent = primaryLabel;
  primaryBtn.onclick = primaryAction;

  if (showSecondary) {
    secondaryBtn.hidden = false;
    secondaryBtn.textContent = secondaryLabel;
    secondaryBtn.onclick = secondaryAction;
  } else {
    secondaryBtn.hidden = true;
    secondaryBtn.onclick = null;
  }

  optionsBtn.onclick = () => chrome.runtime.openOptionsPage();
}

function populateTargets(targets) {
  targetSelect.innerHTML = "";
  targets.forEach((target) => {
    const option = document.createElement("option");
    option.value = String(target.index);
    option.textContent = target.raw;
    targetSelect.appendChild(option);
  });
  targetSelectWrap.hidden = targets.length <= 1;
}

function startCalibration(targetIndex) {
  const url = chrome.runtime.getURL(`runner.html?source=popup&targetIndex=${targetIndex}`);
  chrome.tabs.create({ url });
  window.close();
}

function openTarget(targetIndex) {
  const target = cachedTargets.find((item) => String(item.index) === String(targetIndex));
  if (!target || !cachedLastResult) {
    return;
  }
  const ver = getVersion();
  const proof = encodeProofJson({
    tier: cachedLastResult.tier,
    conf: cachedLastResult.conf,
    valid: cachedLastResult.valid,
    ts: cachedLastResult.ts,
    exp: cachedLastResult.exp,
    ver
  });
  const url = buildTargetUrl(target.url.toString(), cachedSettings, {
    ...cachedLastResult,
    ver,
    proof
  });
  chrome.tabs.create({ url });
  window.close();
}

function render() {
  const now = getNowSeconds();
  const targets = cachedTargets;
  const lastResult = cachedLastResult;

  populateTargets(targets);

  if (!targets.length) {
    statusText.textContent = "Set target URLs in Options to enable calibration.";
    tierDetails.hidden = true;
    setButtons({
      primaryLabel: "Open settings",
      primaryAction: () => chrome.runtime.openOptionsPage(),
      showSecondary: false,
      secondaryLabel: "",
      secondaryAction: null
    });
    return;
  }

  if (!lastResult) {
    statusText.textContent = "No calibration yet.";
    tierDetails.hidden = true;
    setButtons({
      primaryLabel: "Start calibration",
      primaryAction: () => startCalibration(targetSelect.value || 0),
      showSecondary: false,
      secondaryLabel: "",
      secondaryAction: null
    });
    return;
  }

  const expired = now >= lastResult.exp;
  const validLabel = lastResult.valid ? "Valid" : "Low-confidence";
  const badgeClass = lastResult.valid ? "success" : "warn";

  tierBadge.textContent = `Tier ${lastResult.tier}`;
  tierBadge.className = `badge ${badgeClass}`;
  tierMeta.innerHTML = `
    <div>Confidence: ${lastResult.conf}</div>
    <div>Status: ${validLabel}</div>
    <div>Expires: ${formatDate(lastResult.exp)}</div>
  `;
  tierDetails.hidden = false;

  if (expired || !lastResult.valid) {
    statusText.textContent = expired ? "Calibration expired." : "Low-confidence run. Recalibration required.";
    setButtons({
      primaryLabel: "Recalibrate",
      primaryAction: () => startCalibration(targetSelect.value || 0),
      showSecondary: false,
      secondaryLabel: "",
      secondaryAction: null
    });
    return;
  }

  const cooldownSeconds = cachedSettings.retakeCooldownHours * 3600;
  const canRecalibrate = now - lastResult.ts >= cooldownSeconds;

  statusText.textContent = "Calibration available.";
  setButtons({
    primaryLabel: "Open target",
    primaryAction: () => openTarget(targetSelect.value || 0),
    showSecondary: true,
    secondaryLabel: canRecalibrate ? "Recalibrate" : "Cooldown active",
    secondaryAction: canRecalibrate
      ? () => startCalibration(targetSelect.value || 0)
      : () => {},
  });

  secondaryBtn.disabled = !canRecalibrate;
}

async function init() {
  const data = await getStorage([STORAGE_KEYS.settings, STORAGE_KEYS.lastResult]);
  cachedSettings = mergeSettings(data[STORAGE_KEYS.settings]);
  cachedLastResult = data[STORAGE_KEYS.lastResult] || null;
  cachedTargets = parseTargets(cachedSettings);

  if (cachedTargets.length && cachedTargets.some((t) => t.retestDays === null)) {
    statusText.textContent = "Retesting times missing for one or more targets.";
  }
  render();
}

init();
