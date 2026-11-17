const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const armButton = document.getElementById("arm");
const appUrlInput = document.getElementById("app-url");
const openBp = document.getElementById("open-bp");
const openPad = document.getElementById("open-pad");

let currentTab = null;
let armed = false;

function render() {
  statusEl.classList.toggle("on", armed);
  statusText.textContent = armed
    ? "This tab is armed — phone inputs are live."
    : "This tab is not armed.";
  armButton.textContent = armed ? "Disarm this tab" : "Arm this tab";
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  if (!currentTab || !currentTab.id) {
    statusText.textContent = "No active tab.";
    armButton.disabled = true;
    return;
  }
  try {
    const state = await chrome.tabs.sendMessage(currentTab.id, { type: "get-state" });
    armed = Boolean(state && state.armed);
  } catch {
    armed = false;
  }
  render();
}

armButton.addEventListener("click", async () => {
  if (!currentTab || !currentTab.id) return;
  try {
    const result = await chrome.tabs.sendMessage(currentTab.id, {
      type: armed ? "disarm-tab" : "arm-tab",
    });
    armed = Boolean(result && result.armed);
    render();
  } catch {
    statusText.textContent = "This page cannot be armed. Reload it once, then try again.";
  }
});

async function loadAppUrl() {
  const stored = await chrome.storage.local.get("si-app-url");
  appUrlInput.value = stored["si-app-url"] || "";
}
appUrlInput.addEventListener("change", () => {
  const value = appUrlInput.value.trim().replace(/\/+$/, "");
  void chrome.storage.local.set({ "si-app-url": value });
});

openBp.addEventListener("click", () => {
  const base = appUrlInput.value.trim().replace(/\/+$/, "");
  if (!base) {
    appUrlInput.focus();
    return;
  }
  void chrome.tabs.create({ url: `${base}/bigpicture` });
});
openPad.addEventListener("click", () => {
  const base = appUrlInput.value.trim().replace(/\/+$/, "");
  if (!base) {
    appUrlInput.focus();
    return;
  }
  void chrome.tabs.create({ url: `${base}/controller` });
});

void loadAppUrl();
void refresh();
