# SI GAMES Controller Bridge

A small Manifest V3 extension that lets the SI GAMES phone pads drive a game
that must be opened in its own tab.

## Load it

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` folder.

## Use it

1. Open SI GAMES and go to **Big Picture**.
2. Press **P** (or the phone icon) and scan the QR with up to six phones.
3. Open the game in its own tab with the expand / new-tab button.
4. In that game tab, click the small **SI PAD · ARM TAB** pill in the bottom
   right. It turns cyan and reads **SI PAD · ARMED**.
5. Keep the Big Picture tab open. Pad inputs are now injected into the armed
   tab as real key events.

The extension popup also has an **SI GAMES address** field for quick links to
Big Picture and the phone pad.

## How it works

- Big Picture posts the latest pad snapshots with `window.postMessage`.
- The content script on the SI GAMES page relays them to the service worker.
- The service worker fans them out only to tabs you explicitly armed.
- The armed tab's content script turns direction/button state into
  `keydown` / `keyup` edges (arrows + WASD for movement).

Inputs are kept in the browser session only; no controller data is stored in
the extension after the browser closes.

Same-page games do not need the extension: the TV player injects key edges
directly into same-origin frames.
