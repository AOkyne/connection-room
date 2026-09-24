"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { getProfile, getPublicProfile, getProfileVisibilitySettings, updateProfileVisibilitySettings } from "@/lib/data/profiles";
import {
  getConnectionPreferences,
  updateConnectionPreferences,
  getActiveConnections,
  type Connection,
  type MessagingPrivacy,
} from "@/lib/data/connections";
import { getConnectionsDirectory, type DirectoryFilter, type DirectoryMember } from "@/lib/data/connectionsDirect";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SayHelloModal } from "@/components/connections/SayHelloModal";
import { SomeoneYouMightWantToKnow } from "@/components/connections/SomeoneYouMightWantToKnow";
import { trackConnectionEvent } from "@/lib/analytics/connectionEvents";
import { IncomingRequests } from "@/components/connections/IncomingRequests";
import { ConnectionChat } from "@/components/connections/ConnectionChat";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import {
  getIncomingRequests,
  getSentRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  type ConnectionRequest,
} from "@/lib/data/connectionRequests";
import { addToDeclinedUsers } from "@/lib/data/connections";
import { createConfirmedConnection } from "@/lib/data/connections";
import { getMyAsyncConnections } from "@/lib/data/connectionAsync";
import { GuidedExchangeSection } from "@/components/connections/GuidedExchangeSection";
import type { AsyncConnection } from "@/lib/types/connection";
import type { Profile } from "@/lib/data/profiles";
import { photoFocusStyle } from "@/lib/utils/photo-focus";

const FILTERS: { id: DirectoryFilter; label: string }[] = [
  { id: "everyone", label: "Everyone" },
  { id: "near_me", label: "Near Me" },
  { id: "new_members", label: "New Members" },
  { id: "shared_interests", label: "Shared Interests" },
];

export default function ConnectionsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [mounted, setMounted] = useState(false);

  // Directory
  const [filter, setFilter] = useState<DirectoryFilter>("everyone");
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [nearMeUnavailable, setNearMeUnavailable] = useState(false);
  const [helloTarget, setHelloTarget] = useState<{ id: string; displayName: string } | null>(null);

  // Connections settings -- reuses existing profile-visibility (show_in_
  // discovery) and connection_preferences (messaging_privacy) plumbing,
  // just surfaced here since this is where a member decides to be found.
  const [openToMeeting, setOpenToMeeting] = useState(true);
  const [messagingPrivacy, setMessagingPrivacy] = useState<MessagingPrivacy>("any_member");
  const [weeklyPairing, setWeeklyPairing] = useState(false);

  // Existing conversations/activity -- preserved so a member with an
  // in-flight legacy request or guided exchange never loses their entry
  // point to it just because the browse experience changed around it.
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Record<string, Profile>>({});
  const [mutualUserIds, setMutualUserIds] = useState<Set<string>>(new Set());
  const [activeConnections, setActiveConnections] = useState<Connection[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [asyncConnections, setAsyncConnections] = useState<AsyncConnection[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);
      if (!p) {
        setMounted(true);
        return;
      }

      const [prefs, visibility, requests, sent, active, asyncConns] = await Promise.all([
        getConnectionPreferences(p.id),
        getProfileVisibilitySettings(),
        getIncomingRequests(p.id),
        getSentRequests(p.id),
        getActiveConnections(p.id),
        // getMyAsyncConnections reads the connections table with no
        // connection_type filter -- it already returns 'direct' rows
        // (the new say-hello flow) alongside any legacy async/live rows.
        // Not gated by the old feature_async_connections_enabled beta
        // flag: that flag only ever controlled the OLD guided-exchange
        // rollout, and must never hide a member's own new "direct"
        // conversations just because they weren't on that beta list.
        getMyAsyncConnections(p.id),
      ]);

      setMessagingPrivacy(prefs.messagingPrivacy);
      setWeeklyPairing(prefs.weeklyPairingOptIn);
      if (visibility) setOpenToMeeting(visibility.showInDiscovery);

      const resolvedProfiles = await Promise.all(
        requests.map(async (r) => [r.fromUserId, await getPublicProfile(r.fromUserId)] as const)
      );
      setIncomingRequests(requests);
      setActiveConnections(active);
      const sentToIds = new Set(sent.map((r) => r.toUserId));
      setMutualUserIds(new Set(requests.filter((r) => sentToIds.has(r.fromUserId)).map((r) => r.fromUserId)));
      const profilesMap: Record<string, Profile> = {};
      for (const [id, prof] of resolvedProfiles) if (prof) profilesMap[id] = prof;
      setRequesterProfiles(profilesMap);

      setAsyncConnections(asyncConns);

      setMounted(true);
    };

    loadData().catch((err) => {
      console.error("[connections] loadData threw:", err);
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setLoadingDirectory(true);
    getConnectionsDirectory(filter).then((result) => {
      if (result.error) {
        showToast(result.error, "error");
        setMembers([]);
        setNearMeUnavailable(false);
      } else {
        setMembers(result.members);
        setNearMeUnavailable(!!result.nearMeUnavailable);
        trackConnectionEvent({ eventType: "connections_directory_viewed", filter });
      }
      setLoadingDirectory(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, mounted]);

  if (!mounted) {
    return <LoadingScreen message="Getting ready for connections" subtitle="Just a moment..." />;
  }

  if (!profile) {
    return <LoadingScreen message="Getting ready for connections" subtitle="Just a moment..." />;
  }

  const handleToggleOpenToMeeting = async (value: boolean) => {
    setOpenToMeeting(value);
    const ok = await updateProfileVisibilitySettings({ showInDiscovery: value });
    if (!ok) {
      setOpenToMeeting(!value);
      showToast("Could not update this setting. Please try again.", "error");
    }
  };

  const handleMessagingPrivacyChange = async (value: MessagingPrivacy) => {
    setMessagingPrivacy(value);
    const prefs = await getConnectionPreferences(profile.id);
    const ok = await updateConnectionPreferences(profile.id, { ...prefs, messagingPrivacy: value });
    if (!ok) {
      showToast("Could not update this setting. Please try again.", "error");
    }
  };

  const handleWeeklyPairingChange = async (value: boolean) => {
    setWeeklyPairing(value);
    const prefs = await getConnectionPreferences(profile.id);
    const ok = await updateConnectionPreferences(profile.id, { ...prefs, weeklyPairingOptIn: value });
    if (!ok) {
      setWeeklyPairing(!value);
      showToast("Could not update this setting. Please try again.", "error");
      return;
    }
    if (value) {
      showToast("You're in! You'll be paired with someone new each week.", "success");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const request = incomingRequests.find((r) => r.id === requestId);
    if (!request || !profile) return;

    const accepted = await acceptConnectionRequest(requestId, profile.id);
    if (!accepted) {
      showToast("Could not accept this request. Please try again.", "error");
      return;
    }

    setIncomingRequests(incomingRequests.filter((r) => r.id !== requestId));

    const connection = await createConfirmedConnection(profile.id, accepted);
    if (connection) {
      setActiveConnections((prev) => [connection, ...prev]);
      setSelectedChatId(connection.id);
      showToast(`Connected with ${request.fromUserName}!`, "success");
    } else {
      showToast("Request accepted, but the connection couldn't be fully set up. Please refresh.", "error");
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    const request = incomingRequests.find((r) => r.id === requestId);
    if (!profile) return;

    const ok = await declineConnectionRequest(requestId, profile.id);
    if (ok) {
      if (request) addToDeclinedUsers(profile.id, request.fromUserId);
      setIncomingRequests(incomingRequests.filter((r) => r.id !== requestId));
    } else {
      showToast("Could not decline this request. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl text-[#1a0f0a]">People You Might Like to Know</h1>
          <p className="text-lg text-[#1a0f0a] mt-2">Browse members, view a profile, and say hello.</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      {/* Connections settings -- who can find you, who can message you. */}
      <Card>
        <CardHeader title="Your Connections Settings" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={openToMeeting}
              onChange={(e) => handleToggleOpenToMeeting(e.target.checked)}
              className="w-5 h-5 mt-0.5"
            />
            <span>
              <span className="block font-medium text-[#1a0f0a]">Open to meeting other members</span>
              <span className="block text-sm text-[#a0704a]">
                Turn this off and you won't appear in this directory or in suggestions.
              </span>
            </span>
          </label>

          <div>
            <p className="font-medium text-[#1a0f0a] mb-2">Who can message me?</p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={messagingPrivacy === "any_member"}
                  onChange={() => handleMessagingPrivacyChange("any_member")}
                  className="w-4 h-4"
                />
                <span className="text-[#1a0f0a] text-sm">Any member</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={messagingPrivacy === "connect_first"}
                  onChange={() => handleMessagingPrivacyChange("connect_first")}
                  className="w-4 h-4"
                />
                <span className="text-[#1a0f0a] text-sm">Only people I accept a request from first</span>
              </label>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer sm:col-span-2 pt-4 border-t border-[#e8ddd2]">
            <input
              type="checkbox"
              checked={weeklyPairing}
              onChange={(e) => handleWeeklyPairingChange(e.target.checked)}
              disabled={!openToMeeting}
              className="w-5 h-5 mt-0.5"
            />
            <span>
              <span className="block font-medium text-[#1a0f0a]">Pair me with someone new each week</span>
              <span className="block text-sm text-[#a0704a]">
                {openToMeeting
                  ? "Every Monday we'll introduce you to another member who's also opted in, with a question to get you started. No pressure to reply."
                  : "Turn on \"Open to meeting other members\" to use weekly pairing."}
              </span>
            </span>
          </label>
        </div>
      </Card>

      {!openToMeeting ? (
        <Card className="text-center py-10">
          <p className="text-[#1a0f0a] font-medium">Connections are turned off for your profile.</p>
          <p className="text-sm text-[#a0704a] mt-1">You can turn them back on anytime above.</p>
        </Card>
      ) : (
        <>
          <SomeoneYouMightWantToKnow weekly onSayHello={(m) => setHelloTarget({ id: m.id, displayName: m.displayName })} />
          <SomeoneYouMightWantToKnow onSayHello={(m) => setHelloTarget({ id: m.id, displayName: m.displayName })} />

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f.id ? "bg-[#d4a348] text-white" : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filter === "near_me" && nearMeUnavailable && !loadingDirectory && (
            <Card className="bg-[#f3ede5] text-sm text-[#1a0f0a]">
              Add your location in your profile to sort members near you -- showing everyone for now.
            </Card>
          )}

          {/* Directory */}
          {loadingDirectory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48 animate-pulse bg-[#f3ede5]">
                  {null}
                </Card>
              ))}
            </div>
          ) : members.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-[#1a0f0a] font-medium">No one here just yet.</p>
              <p className="text-sm text-[#a0704a] mt-1">Try another filter, or check back as the community grows.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={member.displayName} photo={member.profilePhoto} size="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a0f0a] truncate">
                        {member.displayName}
                        {member.ageRange && <span className="font-normal text-[#a0704a]">, {member.ageRange}</span>}
                      </p>
                      {member.location && <p className="text-xs text-[#a0704a] truncate">📍 {member.location}</p>}
                    </div>
                  </div>
                  {member.tagline && <p className="text-sm text-[#1a0f0a] italic line-clamp-2">"{member.tagline}"</p>}
                  {member.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {member.interests.map((interest) => (
                        <span key={interest} className="text-xs bg-[#f3ede5] text-[#1a0f0a] px-2 py-0.5 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/app/users/${member.id}`}
                      className="flex-1"
                      onClick={() => trackConnectionEvent({ eventType: "member_profile_opened_from_connections", relatedUserId: member.id })}
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        trackConnectionEvent({ eventType: "say_hello_clicked", relatedUserId: member.id });
                        setHelloTarget(member);
                      }}
                    >
                      👋 Say Hello
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* In-flight guided exchanges (existing rows, any connection_type) --
          untouched: same component, same behavior, regardless of how the
          connection started. */}
      {asyncConnections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#1a0f0a]">Your Conversations</h2>
          <GuidedExchangeSection connections={asyncConnections} myUserId={profile.id} />
        </div>
      )}

      {/* Legacy pending requests -- preserved so an existing request never
          silently disappears. */}
      {incomingRequests.length > 0 && (
        <IncomingRequests
          requests={incomingRequests}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
          currentUserId={profile.id}
          requesterProfiles={requesterProfiles}
          mutualUserIds={mutualUserIds}
        />
      )}

      {activeConnections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#1a0f0a]">Active Conversations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeConnections.map((connection) => (
              <div key={connection.id} className="space-y-3">
                {selectedChatId === connection.id ? (
                  <ConnectionChat
                    connectionId={connection.id}
                    partnerId={connection.partnerId}
                    partnerName={connection.partnerName}
                    userId={profile.id}
                    userName={profile.displayName}
                  />
                ) : (
                  <Card className="space-y-3">
                    <div className="flex items-start gap-3">
                      {connection.partnerPhoto && (
                        <img
                          src={connection.partnerPhoto}
                          style={photoFocusStyle(connection.partnerPhoto)}
                          alt={connection.partnerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1a0f0a]">{connection.partnerName}</h3>
                        <p className="text-xs text-[#a0704a]">Connected • Ready to chat</p>
                      </div>
                    </div>
                    <Button variant="primary" onClick={() => setSelectedChatId(connection.id)} className="w-full">
                      Open Chat
                    </Button>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {helloTarget && (
        <SayHelloModal
          toUserId={helloTarget.id}
          toDisplayName={helloTarget.displayName}
          onClose={() => setHelloTarget(null)}
          onSent={(connectionId) => {
            setHelloTarget(null);
            router.push(`/app/connections/${connectionId}`);
          }}
          onError={(message) => showToast(message, "error")}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
