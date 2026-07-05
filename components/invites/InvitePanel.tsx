"use client";

import { useState, useEffect } from "react";
import { getMyInviteCode } from "@/lib/data/invites";
import { buildInviteLink } from "@/lib/utils/invite-code";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const INVITE_MESSAGE = `I've joined a new private community called The Connection Room by Trevor James. It's for men and couples who are tired of the apps, surface conversations, and the pressure to perform, and who are looking for something more honest: real conversation, embodied intimacy, self-understanding, community, and connection without shame.

I thought of you because I could imagine you appreciating a space like this.

Here's my invite link: [INVITE_LINK]

No pressure, of course. I just wanted to share it with you.`;

const INVITE_MESSAGE_SHORT = `I've joined The Connection Room, a private community for men and couples tired of the apps, surface conversations, and the pressure to perform. It's about honest connection, intimacy, self-understanding, and real conversation. I thought of you: [INVITE_LINK]`;

interface InvitePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvitePanel({ isOpen, onClose }: InvitePanelProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadInviteCode();
    }
  }, [isOpen]);

  const loadInviteCode = async () => {
    setLoading(true);
    try {
      const code = await getMyInviteCode();
      if (code) {
        setInviteCode(code);
        setInviteLink(buildInviteLink(code));
      }
    } catch (err) {
      console.error("Error loading invite code:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCopyMessage = async () => {
    if (!inviteLink) return;
    const fullMessage = INVITE_MESSAGE.replace("[INVITE_LINK]", inviteLink);
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied("message");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleShareEmail = () => {
    if (!inviteLink) return;
    const subject = encodeURIComponent("An invitation to The Connection Room");
    const body = encodeURIComponent(INVITE_MESSAGE.replace("[INVITE_LINK]", inviteLink));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareText = () => {
    if (!inviteLink) return;
    const text = INVITE_MESSAGE_SHORT.replace("[INVITE_LINK]", inviteLink);
    const smsBody = encodeURIComponent(text);
    window.open(`sms:?body=${smsBody}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (!inviteLink || !navigator.share) return;
    try {
      await navigator.share({
        title: "The Connection Room",
        text: INVITE_MESSAGE_SHORT.replace("[INVITE_LINK]", inviteLink),
        url: inviteLink,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
        <Card
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{
            background: "#FDFBF6",
            boxShadow: "0 20px 60px rgba(60, 45, 20, 0.2)",
          }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "#D9CDB8" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold" style={{ color: "#2C2417" }}>
                Invite Your Friends
              </h2>
              <button
                onClick={onClose}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#4A3E33" }}
              >
                The Connection Room grows best through thoughtful invitations.
                Share your link with people who are looking for more honest
                conversation, community, intimacy, embodiment, and connection
                beyond the usual apps.
              </p>
            </div>

            {/* Invite Link Section */}
            {loading ? (
              <div className="text-center py-4">
                <p style={{ color: "#7A6F62" }}>Loading invite link...</p>
              </div>
            ) : inviteLink ? (
              <>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#2C2417" }}
                  >
                    Your invite link
                  </label>
                  <div
                    className="p-3 rounded-lg border text-sm font-mono break-all"
                    style={{
                      borderColor: "#D9CDB8",
                      background: "#F5EFE3",
                      color: "#2C2417",
                    }}
                  >
                    {inviteLink}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      background: copied === "link" ? "#10b981" : "#D4A040",
                      color: "#FFFDF8",
                    }}
                  >
                    {copied === "link" ? "✓ Link copied" : "Copy link"}
                  </button>

                  <button
                    onClick={handleCopyMessage}
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      background: copied === "message" ? "#10b981" : "#c9a876",
                      color: "#FFFDF8",
                    }}
                  >
                    {copied === "message" ? "✓ Message copied" : "Copy invite message"}
                  </button>

                  <button
                    onClick={handleShareEmail}
                    className="w-full px-4 py-2 rounded-lg font-medium"
                    style={{
                      border: "1px solid #D9CDB8",
                      color: "#2C2417",
                      background: "#FDFBF6",
                    }}
                  >
                    Share via email
                  </button>

                  {typeof navigator !== "undefined" && navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full px-4 py-2 rounded-lg font-medium"
                      style={{
                        border: "1px solid #D9CDB8",
                        color: "#2C2417",
                        background: "#FDFBF6",
                      }}
                    >
                      Share
                    </button>
                  )}

                  <button
                    onClick={handleShareText}
                    className="w-full px-4 py-2 rounded-lg font-medium"
                    style={{
                      border: "1px solid #D9CDB8",
                      color: "#2C2417",
                      background: "#FDFBF6",
                    }}
                  >
                    Share via text
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p style={{ color: "#7A6F62" }}>Unable to load invite code</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
