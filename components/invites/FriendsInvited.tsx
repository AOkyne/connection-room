"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getInvitedFriends } from "@/lib/data/invites";
import type { Profile } from "@/lib/data/profiles";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface FriendsInvitedProps {
  onOpenInvite?: () => void;
}

export function FriendsInvited({ onOpenInvite }: FriendsInvitedProps) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const invitedFriends = await getInvitedFriends();
      setFriends(invitedFriends);
    } catch (err) {
      console.error("Error loading invited friends:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p style={{ color: "#7A6F62" }}>Loading...</p>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: "#2C2417" }}>
          Friends I've Invited
        </h3>
        <p style={{ color: "#4A3E33" }}>
          No friends have joined through your invite link yet. When someone
          does, they'll appear here so you can recognize who helped grow the
          room with you.
        </p>
        {onOpenInvite && (
          <Button
            onClick={onOpenInvite}
            style={{
              background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
              color: "#FFFDF8",
            }}
          >
            Invite Your Friends
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: "#2C2417" }}>
        Friends I've Invited
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {friends.map((friend) => (
          <Link key={friend.id} href={`/app/members/${friend.id}`}>
            <div
              className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
              style={{
                borderColor: "#D9CDB8",
                background: "#FDFBF6",
              }}
            >
              {/* Photo */}
              {friend.profilePhoto && (
                <div className="mb-3">
                  <img
                    src={friend.profilePhoto}
                    alt={friend.displayName}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Name and Pronouns */}
              <h4 className="font-semibold" style={{ color: "#2C2417" }}>
                {friend.displayName}
              </h4>
              {friend.pronouns && (
                <p
                  className="text-sm"
                  style={{ color: "#7A6F62" }}
                >
                  {friend.pronouns}
                </p>
              )}

              {/* Tagline */}
              {friend.profile_tagline && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "#4A3E33" }}
                >
                  {friend.profile_tagline}
                </p>
              )}

              {/* View Profile Link */}
              <p
                className="text-sm font-medium mt-3"
                style={{ color: "#D4A040" }}
              >
                View Profile →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
