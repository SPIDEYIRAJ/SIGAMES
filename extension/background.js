/* SI GAMES Controller Bridge — service worker.
 *
 * The SI GAMES Big Picture page posts pad snapshots to its content script.
 * That content script relays them here, and this worker fans them out to the
 * tabs the player has explicitly armed. Inputs are never stored beyond the
 * current browser session.
 */

const ARMED_KEY = "si-armed-tabs";

async function getArmed() {
  const stored = await chrome.storage.session.get(ARMED_KEY);
  return Array.isArray(stored[ARMED_KEY]) ? stored[ARMED_KEY] : [];
}

async function setArmed(tabs) {
  await chrome.storage.session.set({ [ARMED_KEY]: Array.from(new Set(tabs)) });
}

async function broadcast(message) {
  const tabs = await getArmed();
  await Promise.all(
    tabs.map(async (tabId) => {
      try {
        await chrome.tabs.sendMessage(tabId, message);
      } catch {
        // The tab navigated or closed; drop it from the armed set.
        await setArmed((await getArmed()).filter((id) => id !== tabId));
      }
    }),
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;

  if (message.type === "si-inputs") {
    // The SI GAMES tab is the source of truth while a party is live. Arming it
    // lets the fan-out reach every frame of the game currently on screen, not
    // just a separately opened tab.
    const sourceTab = sender.tab && sender.tab.id;
    const send = async () => {
      if (sourceTab) {
        const tabs = await getArmed();
        if (!tabs.includes(sourceTab)) await setArmed([...tabs, sourceTab]);
      }
      await broadcast({ type: "si-dispatch", devices: message.devices ?? [] });
    };
    void send();
    return false;
  }

  if (message.type === "si-game") {
    void chrome.storage.session.set({
      "si-current-game": { gameId: message.gameId ?? null, url: message.url ?? null, at: Date.now() },
    });
    return false;
  }

  if (message.type === "arm-tab") {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false });
      return false;
    }
    getArmed().then(async (tabs) => {
      if (!tabs.includes(tabId)) await setArmed([...tabs, tabId]);
      sendResponse({ ok: true, armed: true, count: (await getArmed()).length });
    });
    return true;
  }

  if (message.type === "disarm-tab") {
    const tabId = sender.tab && sender.tab.id;
    getArmed().then(async (tabs) => {
      await setArmed(tabs.filter((id) => id !== tabId));
      sendResponse({ ok: true, armed: false, count: (await getArmed()).length });
    });
    return true;
  }

  if (message.type === "get-state") {
    const tabId = sender.tab && sender.tab.id;
    getArmed().then((tabs) => {
      sendResponse({
        armed: Boolean(tabId && tabs.includes(tabId)),
        count: tabs.length,
      });
    });
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  getArmed().then((tabs) => {
    if (tabs.includes(tabId)) void setArmed(tabs.filter((id) => id !== tabId));
  });
});
