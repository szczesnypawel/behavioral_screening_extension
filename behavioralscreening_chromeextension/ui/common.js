export const DEFAULT_SETTINGS = {
  targetsCsv: "",
  retestDaysCsv: "",
  paramNames: {
    tier: "bv_tier",
    conf: "bv_conf",
    valid: "bv_valid",
    ts: "bv_ts",
    exp: "bv_exp",
    ver: "bv_ver",
    proof: "bv_proof"
  },
  tierExpiryDays: 30,
  retakeCooldownHours: 24,
  forceFullscreen: true,
  openInCurrentTab: false,
  debugMode: false
};

export const STORAGE_KEYS = {
  settings: "bv_settings",
  lastResult: "bv_last_result",
  lastMetrics: "bv_last_metrics",
  retestByOrigin: "bv_retest_by_origin"
};

export function getNowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function mergeSettings(partial) {
  const merged = { ...DEFAULT_SETTINGS, ...(partial || {}) };
  merged.paramNames = { ...DEFAULT_SETTINGS.paramNames, ...((partial || {}).paramNames || {}) };
  return merged;
}

export function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (data) => resolve(data));
  });
}

export function setStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}

export function normalizeTargetUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withScheme = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch (err) {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const port = url.port ? `:${url.port}` : "";
  const originKey = `${hostname}${port}`;
  const path = url.pathname || "/";
  return {
    raw: trimmed,
    url,
    originKey,
    path
  };
}

export function parseTargets(settings) {
  const targets = (settings.targetsCsv || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const retestDays = (settings.retestDaysCsv || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item));

  const entries = [];
  for (let i = 0; i < targets.length; i += 1) {
    const normalized = normalizeTargetUrl(targets[i]);
    if (!normalized) continue;
    const days = Number.isFinite(retestDays[i]) ? retestDays[i] : null;
    entries.push({
      index: i,
      raw: targets[i],
      ...normalized,
      retestDays: days
    });
  }
  return entries;
}

export function matchTarget(urlString, targets) {
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const port = url.port ? `:${url.port}` : "";
  const originKey = `${hostname}${port}`;
  const path = url.pathname || "/";

  for (const target of targets) {
    if (target.originKey !== originKey) continue;
    if (!path.startsWith(target.path)) continue;
    return target;
  }
  return null;
}

export function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return base64;
}

export function encodeProofJson(summary) {
  const ordered = {
    tier: summary.tier,
    conf: summary.conf,
    valid: summary.valid,
    ts: summary.ts,
    exp: summary.exp,
    ver: summary.ver
  };
  const json = JSON.stringify(ordered);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  return base64UrlEncode(bytes);
}

export function appendParams(urlString, params) {
  const url = new URL(urlString);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}

export function buildTargetUrl(targetUrl, settings, result) {
  const params = {
    [settings.paramNames.tier]: result.tier,
    [settings.paramNames.conf]: result.conf,
    [settings.paramNames.valid]: result.valid ? 1 : 0,
    [settings.paramNames.ts]: result.ts,
    [settings.paramNames.exp]: result.exp,
    [settings.paramNames.ver]: result.ver,
    [settings.paramNames.proof]: result.proof
  };
  return appendParams(targetUrl, params);
}

export function computeExpiry(tsSeconds, days) {
  return tsSeconds + Math.floor(days * 86400);
}

export function formatDate(tsSeconds) {
  const date = new Date(tsSeconds * 1000);
  return date.toLocaleDateString();
}

// Version number - update manifest.json "version" field to bump (this reads from manifest)
export const VERSION = chrome.runtime.getManifest().version || "0.1.0";

// Build ID - increment this when making code changes to help debug reload issues
export const BUILD_ID = "B1";

export function getVersion() {
  return VERSION;
}
