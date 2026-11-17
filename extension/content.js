/* SI GAMES Controller Bridge — content script.
 *
 * On an SI GAMES page it forwards the couch pads to the service worker.
 * On any other page it offers a small "arm" pill and, once armed, turns the
 * latest pad snapshots into real keyboard events for that page.
 */

(() => {
  const IS_APP = Boolean(
    document.querySelector('meta[name="description"][content^="SI GAMES"]'),
  );
  const IS_FRAME = (() => {
    try {
      return window.top !== window;
    } catch {
      return true;
    }
  })();
  // Same-origin frames are already driven directly by the TV player; injecting
  // here too would double every key press.
  const SAME_ORIGIN_FRAME = (() => {
    if (!IS_FRAME) return false;
    try {
      return location.ancestorOrigins && location.ancestorOrigins[0] === location.origin;
    } catch {
      return false;
    }
  })();

  const KEY_VALUES = {
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    Space: " ",
    Enter: "Enter",
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    KeyX: "x",
    KeyE: "e",
    KeyF: "f",
    KeyC: "c",
  };

  function keysFor(input) {
    const keys = new Set();
    if (!input) return keys;
    const stick = {
      up: input.stickY < -0.32,
      down: input.stickY > 0.32,
      left: input.stickX < -0.32,
      right: input.stickX > 0.32,
    };
    if (input.up || stick.up) {
      keys.add("ArrowUp");
      keys.add("KeyW");
    }
    if (input.down || stick.down) {
      keys.add("ArrowDown");
      keys.add("KeyS");
    }
    if (input.left || stick.left) {
      keys.add("ArrowLeft");
      keys.add("KeyA");
    }
    if (input.right || stick.right) {
      keys.add("ArrowRight");
      keys.add("KeyD");
    }
    if (input.a) keys.add("Space");
    if (input.b) keys.add("KeyX");
    if (input.x) keys.add("KeyE");
    if (input.y) keys.add("KeyF");
    if (input.start) keys.add("Enter");
    if (input.select) keys.add("KeyC");
    return keys;
  }

  function keyEvent(type, code) {
    return new KeyboardEvent(type, {
      key: KEY_VALUES[code] || code,
      code,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  }

  function dispatchKeys(devices) {
    const next = new Set();
    for (const device of devices) {
      for (const code of keysFor(device && device.input)) next.add(code);
    }
    for (const code of next) {
      if (!activeKeys.has(code)) {
        const target = document.activeElement || document.body || document.documentElement;
        target.dispatchEvent(keyEvent("keydown", code));
        window.dispatchEvent(keyEvent("keydown", code));
        document.dispatchEvent(keyEvent("keydown", code));
      }
    }
    for (const code of activeKeys) {
      if (!next.has(code)) {
        const target = document.activeElement || document.body || document.documentElement;
        target.dispatchEvent(keyEvent("keyup", code));
        window.dispatchEvent(keyEvent("keyup", code));
        document.dispatchEvent(keyEvent("keyup", code));
      }
    }
    activeKeys = next;
    pulse();
  }

  let activeKeys = new Set();

  if (IS_APP) {
    // The Big Picture page posts these on every reactive room update.
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data || typeof event.data.type !== "string") return;
      if (event.data.type === "si-games-party-inputs") {
        chrome.runtime.sendMessage({ type: "si-inputs", devices: event.data.devices || [] }).catch(() => {});
      }
      if (event.data.type === "si-games-party-game") {
        chrome.runtime.sendMessage({
          type: "si-game",
          gameId: event.data.gameId || null,
          url: event.data.url || null,
        }).catch(() => {});
      }
    });
    return;
  }

  // Keep the armed key set outside the closure above so the dispatch handler
  // and the pill can share it.
  let armed = false;
  let pill = null;
  let label = null;
  let pulseTimer = 0;

  function pulse() {
    if (!pill) return;
    pill.classList.add("is-firing");
    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(() => pill.classList.remove("is-firing"), 160);
  }

  function render() {
    if (!pill) return;
    pill.classList.toggle("is-armed", armed);
    label.textContent = armed ? "SI PAD · ARMED" : "SI PAD · ARM TAB";
    pill.title = armed
      ? "Phone controllers are driving this tab. Click to disarm."
      : "Arm this tab so the SI GAMES phone controllers can drive it.";
  }

  function buildPill() {
    if (document.getElementById("si-games-bridge-host")) return;
    const host = document.createElement("div");
    host.id = "si-games-bridge-host";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .pill {
          position: fixed; right: 14px; bottom: 14px; z-index: 2147483647;
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 11px 9px 9px;
          color: #9fb2d4; background: #050816e6; border: 1px solid #ffffff26;
          border-radius: 8px; box-shadow: 0 8px 24px #00000080;
          font: 900 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: .1em; cursor: pointer; user-select: none;
          transition: color .18s ease, border-color .18s ease, background .18s ease, transform .1s ease;
          backdrop-filter: blur(8px);
        }
        .pill:hover { color: #fff; border-color: #3efeff80; }
        .pill:active { transform: scale(.97); }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #5e6f93; box-shadow: 0 0 0 2px #ffffff10; }
        .pill.is-armed { color: #9ffcff; border-color: #3efeff8c; background: #06151ce6; }
        .pill.is-armed .dot { background: #3efeff; box-shadow: 0 0 10px #3efeff; }
        .pill.is-firing { border-color: #fff; background: #0b2430f2; }
      </style>
      <button class="pill" type="button"><span class="dot"></span><span class="txt">SI PAD · ARM TAB</span></button>
    `;
    document.documentElement.appendChild(host);
    pill = shadow.querySelector(".pill");
    label = shadow.querySelector(".txt");
    pill.addEventListener("click", () => {
      chrome.runtime
        .sendMessage({ type: armed ? "disarm-tab" : "arm-tab" })
        .then((result) => {
          armed = Boolean(result && result.armed);
          render();
          if (armed) pulse();
        })
        .catch(() => {});
    });
    render();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "si-dispatch") return;
    if (!armed || SAME_ORIGIN_FRAME) return;
    dispatchKeys(Array.isArray(message.devices) ? message.devices : []);
  });

  chrome.runtime
    .sendMessage({ type: "get-state" })
    .then((state) => {
      armed = Boolean(state && state.armed);
      if (!IS_FRAME) {
        buildPill();
        render();
      }
    })
    .catch(() => {
      if (!IS_FRAME) buildPill();
    });
})();
