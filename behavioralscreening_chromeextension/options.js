import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  getStorage,
  setStorage,
  mergeSettings
} from "./ui/common.js";

const fields = {
  targetsCsv: document.getElementById("targetsCsv"),
  retestDaysCsv: document.getElementById("retestDaysCsv"),
  tierExpiryDays: document.getElementById("tierExpiryDays"),
  retakeCooldownHours: document.getElementById("retakeCooldownHours"),
  forceFullscreen: document.getElementById("forceFullscreen"),
  openInCurrentTab: document.getElementById("openInCurrentTab"),
  debugMode: document.getElementById("debugMode"),
  paramTier: document.getElementById("paramTier"),
  paramConf: document.getElementById("paramConf"),
  paramValid: document.getElementById("paramValid"),
  paramTs: document.getElementById("paramTs"),
  paramExp: document.getElementById("paramExp"),
  paramVer: document.getElementById("paramVer"),
  paramProof: document.getElementById("paramProof")
};

const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const status = document.getElementById("status");

function setStatus(text, isError = false) {
  status.textContent = text;
  status.style.color = isError ? "#ff6b6b" : "#9fb2c3";
}

function readForm() {
  return {
    targetsCsv: fields.targetsCsv.value.trim(),
    retestDaysCsv: fields.retestDaysCsv.value.trim(),
    tierExpiryDays: Number(fields.tierExpiryDays.value || DEFAULT_SETTINGS.tierExpiryDays),
    retakeCooldownHours: Number(fields.retakeCooldownHours.value || DEFAULT_SETTINGS.retakeCooldownHours),
    forceFullscreen: fields.forceFullscreen.value === "true",
    openInCurrentTab: fields.openInCurrentTab.value === "true",
    debugMode: fields.debugMode.value === "true",
    paramNames: {
      tier: fields.paramTier.value.trim() || DEFAULT_SETTINGS.paramNames.tier,
      conf: fields.paramConf.value.trim() || DEFAULT_SETTINGS.paramNames.conf,
      valid: fields.paramValid.value.trim() || DEFAULT_SETTINGS.paramNames.valid,
      ts: fields.paramTs.value.trim() || DEFAULT_SETTINGS.paramNames.ts,
      exp: fields.paramExp.value.trim() || DEFAULT_SETTINGS.paramNames.exp,
      ver: fields.paramVer.value.trim() || DEFAULT_SETTINGS.paramNames.ver,
      proof: fields.paramProof.value.trim() || DEFAULT_SETTINGS.paramNames.proof
    }
  };
}

function validate(settings) {
  const targets = settings.targetsCsv.split(",").map((item) => item.trim()).filter(Boolean);
  const retest = settings.retestDaysCsv.split(",").map((item) => item.trim()).filter(Boolean);
  if (targets.length !== retest.length) {
    return "Target URLs and Retesting time must have the same count.";
  }
  if (targets.length === 0) {
    return "Provide at least one target URL.";
  }
  if (retest.some((value) => !Number.isFinite(Number(value)) || Number(value) <= 0)) {
    return "Retesting time values must be positive numbers.";
  }
  return null;
}

function populateForm(settings) {
  fields.targetsCsv.value = settings.targetsCsv;
  fields.retestDaysCsv.value = settings.retestDaysCsv;
  fields.tierExpiryDays.value = settings.tierExpiryDays;
  fields.retakeCooldownHours.value = settings.retakeCooldownHours;
  fields.forceFullscreen.value = String(settings.forceFullscreen);
  fields.openInCurrentTab.value = String(settings.openInCurrentTab);
  fields.debugMode.value = String(settings.debugMode);
  fields.paramTier.value = settings.paramNames.tier;
  fields.paramConf.value = settings.paramNames.conf;
  fields.paramValid.value = settings.paramNames.valid;
  fields.paramTs.value = settings.paramNames.ts;
  fields.paramExp.value = settings.paramNames.exp;
  fields.paramVer.value = settings.paramNames.ver;
  fields.paramProof.value = settings.paramNames.proof;
}

async function init() {
  const data = await getStorage([STORAGE_KEYS.settings, STORAGE_KEYS.lastMetrics, STORAGE_KEYS.lastResult]);
  const settings = mergeSettings(data[STORAGE_KEYS.settings]);
  populateForm(settings);
  refreshExportButton(data);
}

saveBtn.addEventListener("click", async () => {
  const settings = readForm();
  const error = validate(settings);
  if (error) {
    setStatus(error, true);
    return;
  }
  await setStorage({ [STORAGE_KEYS.settings]: settings });
  setStatus("Settings saved.");
  const data = await getStorage([STORAGE_KEYS.lastMetrics, STORAGE_KEYS.lastResult]);
  refreshExportButton(data);
});

init();

function refreshExportButton(data) {
  const hasDebug = Boolean(data[STORAGE_KEYS.lastMetrics] || data[STORAGE_KEYS.lastResult]);
  if (!hasDebug) {
    exportBtn.disabled = true;
    exportBtn.textContent = "Debug data not available - re-run calibration";
    return;
  }
  exportBtn.disabled = false;
  exportBtn.textContent = "Export debug data";
}

exportBtn.addEventListener("click", async () => {
  const data = await getStorage([STORAGE_KEYS.lastMetrics, STORAGE_KEYS.lastResult]);
  const payload = {
    result: data[STORAGE_KEYS.lastResult] || null,
    metrics: data[STORAGE_KEYS.lastMetrics] || null
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "behavioral_screening_debug.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Debug data exported.");
});
