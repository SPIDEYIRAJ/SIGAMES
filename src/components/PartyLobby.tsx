import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Crown, Gamepad2, Link2, Smartphone, UserRound, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { joinUrlFor, type PartyRoom } from "@/lib/party";

interface PartyLobbyProps {
  sessionId: Id<"partySessions">;
  code: string;
  displayToken: string;
  room: PartyRoom | null | undefined;
  onEnded: () => void;
  onClose?: () => void;
}

/** QR + connected pads. Rendered over Big Picture while a room is open. */
export default function PartyLobby({
  sessionId,
  code,
  displayToken,
  room,
  onEnded,
  onClose,
}: PartyLobbyProps) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const promote = useMutation(api.party.promote);
  const endRoom = useMutation(api.party.end);
  const joinUrl = useMemo(() => joinUrlFor(code), [code]);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 360,
      color: { dark: "#050816", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (live) setQr(url);
      })
      .catch(() => {
        if (live) setQr("");
      });
    return () => {
      live = false;
    };
  }, [joinUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const devices = room?.devices ?? [];
  const host = devices.find((device) => device.role === "host");

  return (
    <div className="party-lobby" role="dialog" aria-modal="true" aria-label="Phone controllers">
      <div className="party-lobby-card">
        <div className="party-lobby-head">
          <span className="party-lobby-kicker"><Smartphone size={14} /> COUCH LINK</span>
          <h2>Your phone is the controller.</h2>
          <p>Scan the code, pick a name, and play. Six pads can join. The crown pad chooses what the big screen plays.</p>
          {onClose && (
            <button type="button" className="party-close" onClick={onClose} aria-label="Close party panel">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="party-lobby-grid">
          <div className="party-code-panel">
            <div className="party-qr-frame">
              {qr ? <img src={qr} alt={`QR code to join party ${code}`} /> : <div className="party-qr-wait">BUILDING CODE…</div>}
              <span className="party-qr-corner tl" /><span className="party-qr-corner tr" />
              <span className="party-qr-corner bl" /><span className="party-qr-corner br" />
            </div>
            <div className="party-code-row">
              <span>ROOM</span>
              <strong>{code}</strong>
              <button type="button" onClick={copy} aria-label="Copy join link">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <p className="party-join-url"><Link2 size={12} /> {joinUrl.replace(/^https?:\/\//, "")}</p>
          </div>

          <div className="party-pads-panel">
            <div className="party-pads-head">
              <span><Gamepad2 size={14} /> PADS</span>
              <b>{devices.length} / 6</b>
            </div>
            <ul className="party-pad-list">
              {devices.length === 0 && (
                <li className="party-pad-empty">
                  <span className="party-pad-dot" />
                  Waiting for the first phone…
                </li>
              )}
              {devices.map((device, index) => (
                <li key={device.id} className={`party-pad ${device.role === "host" ? "is-host" : ""}`}>
                  <span className="party-pad-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="party-pad-name">
                    {device.role === "host" ? <Crown size={13} /> : <UserRound size={13} />}
                    {device.name}
                  </span>
                  <span className="party-pad-role">{device.role === "host" ? "HOST PAD" : "PLAYER"}</span>
                  {device.role !== "host" && (
                    <button
                      type="button"
                      className="party-promote"
                      onClick={() => void promote({ sessionId, displayToken, deviceId: device.deviceId })}
                      title={`Make ${device.name} the host pad`}
                    >
                      <Crown size={13} />
                    </button>
                  )}
                  <span className="party-pad-live" aria-hidden="true" />
                </li>
              ))}
            </ul>
            <p className="party-pad-hint">
              {host ? `${host.name} controls the screen and can change the game from their phone.` : "The first phone to join becomes the host pad."}
            </p>
            <div className="party-lobby-actions">
              <button type="button" className="soft-button" onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Link copied" : "Copy join link"}
              </button>
              <button
                type="button"
                className="soft-button party-end"
                onClick={async () => {
                  await endRoom({ sessionId, displayToken });
                  onEnded();
                }}
              >
                End party
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
