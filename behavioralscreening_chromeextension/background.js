import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  getStorage,
  setStorage,
  mergeSettings,
  parseTargets,
  matchTarget,
  getNowSeconds
} from "./ui/common.js";

async function ensureSettings() {
  const data = await getStorage([STORAGE_KEYS.settings]);
  if (!data[STORAGE_KEYS.settings]) {
    await setStorage({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
}

async function handleTabUpdate(tabId, changeInfo, tab) {
  if (!changeInfo.url) return;
  const data = await getStorage([STORAGE_KEYS.settings, STORAGE_KEYS.retestByOrigin]);
  const settings = mergeSettings(data[STORAGE_KEYS.settings]);
  const targets = parseTargets(settings);
  if (!targets.length) return;

  const matched = matchTarget(changeInfo.url, targets);
  if (!matched) return;

  const retestDays = matched.retestDays;
  if (!Number.isFinite(retestDays)) return;

  const retestByOrigin = data[STORAGE_KEYS.retestByOrigin] || {};
  const entry = retestByOrigin[matched.originKey];
  const now = getNowSeconds();
  if (entry && now < entry.next_ts) {
    return;
  }

  const runnerUrl = chrome.runtime.getURL(
    `runner.html?source=auto&targetIndex=${matched.index}&originKey=${encodeURIComponent(matched.originKey)}`
  );
  chrome.tabs.create({ url: runnerUrl });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSettings();
});

chrome.runtime.onStartup.addListener(() => {
  ensureSettings();
});

chrome.tabs.onUpdated.addListener(handleTabUpdate);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "bv_update_retest") {
    const { originKey, retestDays, lastTier } = message.payload || {};
    if (!originKey || !Number.isFinite(retestDays)) {
      sendResponse({ ok: false });
      return;
    }
    (async () => {
      const data = await getStorage([STORAGE_KEYS.retestByOrigin]);
      const retestByOrigin = data[STORAGE_KEYS.retestByOrigin] || {};
      const now = getNowSeconds();
      retestByOrigin[originKey] = {
        last_ts: now,
        next_ts: now + Math.floor(retestDays * 86400),
        last_tier: lastTier
      };
      await setStorage({ [STORAGE_KEYS.retestByOrigin]: retestByOrigin });
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});
