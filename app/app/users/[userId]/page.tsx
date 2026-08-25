"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { getPublicProfile } from "@/lib/data/profiles";
import { getSession } from "@/lib/session";
import { sayHello } from "@/lib/data/connectionsDirect";
import { trackConnectionEvent } from "@/lib/analytics/connectionEvents";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

interface UserProfile {
  id: string;
  displayName: string;
  pronouns?: string;
  location?: string;
  profilePhoto?: string;
  interests?: string[];
  joinedAt?: Date;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { toasts, showToast, removeToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [showHelloBox, setShowHelloBox] = useState(false);
  const [helloText, setHelloText] = useState("");
  const [sendingHello, setSendingHello] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await getSession();
        setIsSelf(!!session && session.supabaseUserId === userId);

        const data = await getPublicProfile(userId);

        if (!data) {
          setNotFound(true);
        } else {
          setProfile({
            id: data.id,
            displayName: data.displayName,
            pronouns: data.pronouns,
            location: data.location,
            profilePhoto: data.profilePhoto,
            interests: data.interests || [],
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleSendHello = async () => {
    if (!helloText.trim() || sendingHello) return;
    setSendingHello(true);
    const result = await sayHello(userId, helloText.trim());
    setSendingHello(false);

    if (result.error || !result.connectionId) {
      showToast(result.error || "Could not send this message. Please try again.", "error");
      return;
    }

    trackConnectionEvent({ eventType: "first_message_sent", relatedUserId: userId, connectionId: result.connectionId });
    router.push(`/app/connections/${result.connectionId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-[#1a0f0a]">Profile not found</p>
        <Link href="/app/spaces">
          <Button variant="outline" size="sm">
            ← Back to Spaces
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/app/spaces">
          <Button variant="outline" size="sm" className="mb-4">
            ← Back
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card>
        <div className="space-y-4">
          {profile.profilePhoto && (
            <img
              src={profile.profilePhoto}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold text-[#1a0f0a]">{profile.displayName}</h1>
            {profile.pronouns && <p className="text-[#1a0f0a]">({profile.pronouns})</p>}
          </div>
          {profile.location && <p className="text-[#1a0f0a]">📍 {profile.location}</p>}
          {profile.joinedAt && (
            <p className="text-sm text-[#a0704a]">
              Member since {profile.joinedAt.toLocaleDateString()}
            </p>
          )}

          {!isSelf && (
            <div className="pt-2">
              {!showHelloBox ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    trackConnectionEvent({ eventType: "say_hello_clicked", relatedUserId: userId });
                    setShowHelloBox(true);
                  }}
                >
                  👋 Say Hello
                </Button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={helloText}
                    onChange={(e) => setHelloText(e.target.value)}
                    placeholder={`Say hello to ${profile.displayName}...`}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSendHello} disabled={sendingHello || !helloText.trim()}>
                      {sendingHello ? "Sending..." : "Send"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowHelloBox(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <Card>
          <CardHeader title="Interests" />
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 bg-[#f3ede5] text-[#1a0f0a] rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        </Card>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
