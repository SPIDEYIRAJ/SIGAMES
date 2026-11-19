import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import {
  controllerProfileFor,
  getOmniPad,
  isControllersEnabled,
  CONTROLLERS_CHANGE_EVENT,
  trustedFrameOrigin,
  type ControllerMode,
} from "@/lib/omnipad";

/**
 * The optional on-screen controller: an absolutely-positioned layer over the
 * game frame that OmniPad decomposes into a target stage, D-pad, buttons
 * and/or cursor joystick. The `deck` mode moves the widgets into the lower half
 * for console mode while the stage stays on the game screen above.
 *
 * Only mounts when the override is enabled from the hidden settings panel, or
 * when console mode forces it on.
 */
function VirtualGamepad({
  src,
  gameId,
  gameTitle,
  gameCategory,
  gameControls,
  mode = "overlay",
  force = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  src: string;
  gameId: string;
  gameTitle: string;
  gameCategory: string;
  gameControls?: string;
  mode?: ControllerMode;
  force?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(() => force || isControllersEnabled());

  // Follow the hidden-settings toggle live, including other tabs' changes.
  useEffect(() => {
    const sync = () => setEnabled(force || isControllersEnabled());
    if (force) setEnabled(true);
    window.addEventListener(CONTROLLERS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONTROLLERS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [force]);

  const profile = useMemo(
    () => controllerProfileFor({ id: gameId, category: gameCategory, controls: gameControls }, mode),
    [gameId, gameCategory, gameControls, mode]
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
      className={`virtual-gamepad ${mode === "deck" ? "is-deck" : ""}`}
      data-game-virtual-gamepad
      data-mode={mode}
      data-title={gameTitle}
      {...rest}
    />
  );
}

export default VirtualGamepad;
