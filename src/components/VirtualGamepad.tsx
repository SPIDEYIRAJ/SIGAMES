import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import {
  controllerProfileFor,
  getOmniPad,
  isControllersEnabled,
  CONTROLLERS_CHANGE_EVENT,
  trustedFrameOrigin,
} from "@/lib/omnipad";

/**
 * The optional on-screen controller overlay: an absolutely-positioned layer
 * above the game frame that OmniPad decomposes into aTargetZone, D-pad,
 * buttons and/or joystick. Only mounts when the override is enabled from the
 * hidden settings panel; the physical gamepad poller starts with the forest.
 */
function VirtualGamepad({ src, gameTitle, gameCategory, ...rest }: HTMLAttributes<HTMLDivElement> & {
  src: string;
  gameTitle: string;
  gameCategory: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(isControllersEnabled);

  // Follow the hidden-settings toggle live, including other tabs' changes.
  useEffect(() => {
    const sync = () => setEnabled(isControllersEnabled());
    window.addEventListener(CONTROLLERS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONTROLLERS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const profile = useMemo(
    () => controllerProfileFor({ id: "", category: gameCategory }),
    [gameCategory]
  );

  // Build the OmniPad forest inside the overlay container, then tear it down
  // whenever the layout, the game or the toggle changes behind us.
  useEffect(() => {
    if (!enabled) return;
    const engine = getOmniPad();
    const container = containerRef.current;
    if (!engine || !container) return;

    let rootLayer: { destroy?: () => void } | undefined;
    try {
      const forest = engine.parseProfileForest(profile);
      const rootNode = forest.roots.$ui;
      if (!rootNode) return;
      rootLayer = new engine.RootLayer(container, { treeNode: rootNode });

      // Physical controllers drive the same on-screen buttons.
      const gamepad = engine.GamepadManager.getInstance();
      gamepad.setConfig(forest.runtimeGamepadMappings ?? []);
      gamepad.start();

      // The player frame is a trusted place; cross-context pages can listen
      // only after their own guest receiver has been injected by them.
      const origin = trustedFrameOrigin(src);
      if (origin && origin !== window.location.origin) {
        engine.IframeManager.getInstance().addTrustedOrigin(origin);
      }
    } catch (error) {
      // A should stay a bonus, never a crash: silently skip a bad profile.
      console.warn("[OmniPad] Controller overlay failed to start:", error);
    }

    return () => {
      try {
        rootLayer?.destroy?.();
        engine.GamepadManager.getInstance().stop?.();
      } catch {
        // Nothing worth surfacing during teardown.
      }
    };
  }, [enabled, profile, src]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="virtual-gamepad"
      data-game-virtual-gamepad
      data-title={gameTitle}
      {...rest}
    />
  );
}

export default VirtualGamepad;
