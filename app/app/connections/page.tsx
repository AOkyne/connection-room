"use client";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { getProfile, getProfilePhoto, getPublicProfile, type Profile } from "@/lib/data/profiles";
import {
  getConnectionPreferences,
  updateConnectionPreferences,
  getCurrentConnection,
  setCurrentConnection,
  completeConnection,
  skipConnection,
  reportConnectionConcern,
  getConnectionHistory,
  addToConnectionHistory,
  addToDeclinedUsers,
  getDeclinedUsers,
  getBlockedUsers,
  createConfirmedConnection,
  getActiveConnections,
  updateConnectionStatus,
  type Connection,
} from "@/lib/data/connections";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { IconConnection, IconForYou } from "@/components/Icons";
import { LoadingScreen } from "@/components/LoadingScreen";
import { findMatches } from "@/lib/matching";
import { SuggestedConnections } from "@/components/connections/SuggestedConnections";
import { IncomingRequests } from "@/components/connections/IncomingRequests";
import { ConnectionProfileModal } from "@/components/connections/ConnectionProfileModal";
import { ConnectionChat } from "@/components/connections/ConnectionChat";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import {
  getIncomingRequests,
  getSentRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  sendConnectionRequest,
  type ConnectionRequest,
} from "@/lib/data/connectionRequests";

export default function ConnectionsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  // getProfile() deliberately omits profile_photo (a past perf/timeout
  // fix), so it's always "" there -- fetched separately here since it's
  // needed for real use: gating whether matching runs, and what gets
  // attached to a sent connection request's from_user_photo.
  const [profilePhoto, setProfilePhoto] = useState("");
  const [preferences, setPreferences] = useState<any>(null);
  const [currentConnection, setCurrentConnectionState] = useState<Connection | null>(null);
  const [suggestedMatches, setSuggestedMatches] = useState<any[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportConcern, setReportConcern] = useState("");
  const [mounted, setMounted] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Record<string, Profile>>({});
  const [mutualUserIds, setMutualUserIds] = useState<Set<string>>(new Set());
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [activeConnections, setActiveConnections] = useState<Connection[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);

      if (p) {
        const realPhoto = await getProfilePhoto();
        setProfilePhoto(realPhoto);

        const prefs = getConnectionPreferences(p.id);
        setPreferences(prefs);

        const connection = getCurrentConnection(p.id);
        setCurrentConnectionState(connection);

        const [requests, sent, active] = await Promise.all([
          getIncomingRequests(p.id),
          getSentRequests(p.id),
          getActiveConnections(p.id),
        ]);
        setIncomingRequests(requests);
        setActiveConnections(active);

        // Mutual: someone I already sent a pending request to also sent me one
        const sentToIds = new Set(sent.map((r) => r.toUserId));
        setMutualUserIds(new Set(requests.filter((r) => sentToIds.has(r.fromUserId)).map((r) => r.fromUserId)));

        // Real profiles for each requester's card/modal
        const resolvedProfiles = await Promise.all(
          requests.map(async (r) => [r.fromUserId, await getPublicProfile(r.fromUserId)] as const)
        );
        const profilesMap: Record<string, Profile> = {};
        for (const [id, prof] of resolvedProfiles) {
          if (prof) profilesMap[id] = prof;
        }
        setRequesterProfiles(profilesMap);

        // Load connection history
        const history = getConnectionHistory(p.id);
        setConnectionHistory(history);

        // Load suggested matches if no current connection and profile is complete.
        // Gate on the real photo (fetched above), not p.profilePhoto -- that field
        // is always "" on the object getProfile() returns, so this condition was
        // never true for anyone; matching silently never ran.
        if (!connection && p.completedOnboarding && realPhoto && p.interests?.length > 0) {
          setLoadingMatches(true);
          try {
            const declined = Array.from(getDeclinedUsers(p.id));
            const blocked = Array.from(getBlockedUsers(p.id));
            const matches = await findMatches(p, prefs, history, declined, blocked, 5);
            setSuggestedMatches(matches);
          } catch (err) {
            console.error("Error loading matches:", err);
            setSuggestedMatches([]);
          } finally {
            setLoadingMatches(false);
          }
        }
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted || !profile || !preferences) {
    return <LoadingScreen message="Getting ready for connections" subtitle="We're personalizing your experience. Just a moment..." />;
  }

  const handleFrequencyChange = (frequency: string) => {
    const updated = { ...preferences, frequency };
    setPreferences(updated);
    updateConnectionPreferences(profile.id, updated);
  };

  const handleContactModeChange = (contactMode: string) => {
    const updated = { ...preferences, contactMode };
    setPreferences(updated);
    updateConnectionPreferences(profile.id, updated);
  };

  const handleGenerateConnection = async () => {
    if (suggestedMatches.length === 0) {
      showToast("No eligible members to connect with right now.", "info");
      return;
    }

    const randomMatch = suggestedMatches[Math.floor(Math.random() * suggestedMatches.length)];
    const sent = await sendConnectionRequest(
      profile.id,
      profile.displayName,
      profilePhoto,
      randomMatch.profile.id,
      randomMatch.profile.interests || [],
      "What brought you here and what kind of connection are you practicing?"
    );

    if (sent) {
      setSuggestedMatches(suggestedMatches.filter((m) => m.profile.id !== randomMatch.profile.id));
      showToast(`Request sent to ${randomMatch.profile.displayName}! You'll be able to chat once they accept.`, "success");
    } else {
      showToast("Could not send a connection request. Please try again.", "error");
    }
  };

  const handleRequestConnection = async (partnerId: string) => {
    const match = suggestedMatches.find((m) => m.profile.id === partnerId);
    if (match && profile) {
      await sendConnectionRequest(profile.id, profile.displayName, profilePhoto, partnerId, match.profile.interests || []);
      setSuggestedMatches(suggestedMatches.filter((m) => m.profile.id !== partnerId));
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
      setCurrentConnectionState(connection);
      setCurrentConnection(profile.id, connection);
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

  const handleViewPartnerProfile = async () => {
    if (!currentConnection) return;
    const partnerProfile = await getPublicProfile(currentConnection.partnerId);
    if (partnerProfile) {
      setSelectedProfile(partnerProfile);
      setIsProfileModalOpen(true);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentConnection || !profile) return;

    completeConnection(profile.id, currentConnection.id);
    updateConnectionStatus(currentConnection.id, "completed");
    addToConnectionHistory(profile.id, currentConnection);
    setActiveConnections((prev) => prev.filter((c) => c.id !== currentConnection.id));
    setCurrentConnectionState(null);

    const updatedHistory = getConnectionHistory(profile.id);
    setConnectionHistory(updatedHistory);

    try {
      const declined = Array.from(getDeclinedUsers(profile.id));
      const blocked = Array.from(getBlockedUsers(profile.id));
      const realMatches = await findMatches(profile, preferences, updatedHistory, declined, blocked, 5);
      setSuggestedMatches(realMatches);
    } catch (err) {
      console.error("Error refreshing matches:", err);
      setSuggestedMatches([]);
    }
  };

  const handleSkipConnection = () => {
    if (!profile || !currentConnection) return;
    updateConnectionStatus(currentConnection.id, "declined");
    skipConnection(profile.id);
    setActiveConnections((prev) => prev.filter((c) => c.id !== currentConnection.id));
    setCurrentConnectionState(null);
  };

  const handleReportConcern = () => {
    if (reportConcern.trim() && currentConnection) {
      reportConnectionConcern(profile.id, currentConnection.id, reportConcern);
      setReportConcern("");
      setShowReportForm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl text-[#1a0f0a]">Connections</h1>
            <p className="text-lg text-[#1a0f0a] mt-2">
              Structured conversations with other members
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-[#d4a348] hover:text-[#c9956d] transition-colors"
            aria-label="Go back"
          >
            ← Back
          </button>
        </div>

        {/* What are Connections Section */}
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a348]">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#1a0f0a]">What are Connections?</h3>
            <p className="text-sm text-[#1a0f0a] leading-relaxed">
              A connection is a one-on-one, 20-minute structured conversation with another member. You'll respond to a shared prompt and practice authentic relating in a safe, contained format. It's designed to deepen your understanding of how you connect.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#c97a2a] uppercase">Who</p>
                <p className="text-sm text-[#1a0f0a]">Matched based on shared interests</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#c97a2a] uppercase">What</p>
                <p className="text-sm text-[#1a0f0a]">20-minute guided conversation</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#c97a2a] uppercase">Why</p>
                <p className="text-sm text-[#1a0f0a]">Practice authentic connection in real time</p>
              </div>
            </div>
            <div className="border-t border-[#e8ddd2] pt-4">
              <p className="text-sm text-[#1a0f0a]">
                <strong>This is not a dating platform.</strong> Connections are structured conversations focused on authentic relating, deeper self-understanding, and practicing vulnerability in a safe space.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Incoming Requests */}
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

      {/* Active Conversations */}
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
                          alt={connection.partnerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1a0f0a]">{connection.partnerName}</h3>
                        <p className="text-xs text-[#a0704a]">Connected • Ready to chat</p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => setSelectedChatId(connection.id)}
                      className="w-full"
                    >
                      Open Chat
                    </Button>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Connections */}
      {suggestedMatches.length > 0 && (
        <div className="space-y-4">
          <div className="bg-[#f3ede5] rounded-lg p-4 border-l-4 border-[#d4a348]">
            <h3 className="text-base font-semibold text-[#1a0f0a] mb-2">Your Suggested Connections</h3>
            <p className="text-sm text-[#1a0f0a] mb-3">
              These matches are suggested based on shared interests and compatible connection styles. Click on any profile to learn more, then select someone to begin your conversation this week.
            </p>
            <p className="text-xs text-[#c97a2a]">
              💡 Tip: The match percentage shows how many interests you share. Higher percentages suggest more natural conversation starters.
            </p>
          </div>
          <SuggestedConnections
            matches={suggestedMatches}
            onSelectMatch={handleRequestConnection}
            loading={loadingMatches}
            currentUserId={profile.id}
            currentUserName={profile.displayName}
            currentUserPhoto={profilePhoto}
          />
        </div>
      )}

      {/* Preferences Section */}
      <div className="bg-[#f3ede5] rounded-lg p-4 border-l-4 border-[#c97a2a] mb-6">
        <h3 className="text-base font-semibold text-[#1a0f0a] mb-2">Set Your Connection Preferences</h3>
        <p className="text-sm text-[#1a0f0a]">
          Help us match you with people who share your connection style. Your preferences guide how often you want to connect and how you prefer to communicate.
        </p>
      </div>

      {/* Preferences and Current Connection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Preferences Card */}
        <Card>
          <CardHeader title="Your Preferences" icon={<IconForYou size={20} />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-3">
                How often would you like to connect?
              </label>
              <div className="space-y-2">
                {[
                  { id: "weekly", label: "connect me this week" },
                  { id: "monthly", label: "connect me monthly" },
                  { id: "pause", label: "Not at this time" },
                ].map((option) => (
                  <label key={option.id} className="flex items-center gap-3 p-3 hover:bg-[#f3ede5] rounded cursor-pointer">
                    <input
                      type="radio"
                      checked={preferences.frequency === option.id}
                      onChange={() => handleFrequencyChange(option.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1a0f0a]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-3">
                Preferred contact method
              </label>
              <div className="space-y-2">
                {[
                  { id: "text", label: "Text-based only" },
                  { id: "voice-video", label: "Voice or video call" },
                  { id: "local", label: "Open to local/in-person if appropriate" },
                ].map((option) => (
                  <label key={option.id} className="flex items-center gap-3 p-3 hover:bg-[#f3ede5] rounded cursor-pointer">
                    <input
                      type="radio"
                      checked={preferences.contactMode === option.id}
                      onChange={() => handleContactModeChange(option.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1a0f0a]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Current Connection or Random Connection Card */}
        {currentConnection ? (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-2 border-[#d4a348]">
          <CardHeader title="Your Connection This Week" icon={<IconConnection size={20} />} />
          <div className="space-y-4">
            {/* Partner Info */}
            <button
              onClick={handleViewPartnerProfile}
              className="bg-white rounded-lg p-4 w-full text-left hover:bg-[#f8f6f2] transition-colors"
            >
              <p className="text-sm text-[#a0704a] uppercase tracking-wide">Your partner</p>
              <div className="flex items-start gap-4 mt-3">
                <Avatar
                  name={`${currentConnection.partnerFirstName || currentConnection.partnerName} ${currentConnection.partnerLastName || ''}`}
                  photo={currentConnection.partnerPhoto}
                  size="2xl"
                />
                <div>
                  <p className="text-2xl font-medium text-[#1a0f0a]">
                    {currentConnection.partnerFirstName} {currentConnection.partnerLastName} {currentConnection.partnerPronouns && `(${currentConnection.partnerPronouns})`}
                  </p>
                </div>
              </div>
            </button>

            {/* Shared Interests */}
            <div>
              <p className="text-sm text-[#1a0f0a] mb-2">Shared interests</p>
              <div className="flex flex-wrap gap-2">
                {currentConnection.partnerInterests.slice(0, 3).map((interest: string) => (
                  <span key={interest} className="bg-[#e8ddd2] text-[#1a0f0a] px-3 py-1 rounded-full text-xs">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Prompt */}
            <div className="bg-white rounded-lg p-4 italic text-[#1a0f0a]">
              "{currentConnection.sharedPrompt}"
            </div>

            {/* 20-Minute Structure */}
            <div className="bg-[#f3ede5] rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-[#1a0f0a] mb-3">Suggested 20-Minute Structure</p>
              <div className="space-y-2">
                <p className="text-[#1a0f0a]">
                  <strong>2 min:</strong> Arrive, breathe, say hello
                </p>
                <p className="text-[#1a0f0a]">
                  <strong>5 min each:</strong> What brought you here & what connection you're practicing
                </p>
                <p className="text-[#1a0f0a]">
                  <strong>5 min:</strong> Respond to the prompt together
                </p>
                <p className="text-[#1a0f0a]">
                  <strong>3 min:</strong> Appreciation, reflection, close
                </p>
              </div>
            </div>

            {/* Consent & Safety */}
            <div className="space-y-2 text-sm text-[#1a0f0a]">
              <p className="flex items-start gap-2">
                <span>✓</span>
                <span>
                  <strong>Consent:</strong> Either party can pause or end the connection anytime
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span>✓</span>
                <span>
                  <strong>Safety:</strong> No contact info shared unless both explicitly agree
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="primary" size="md" onClick={handleMarkComplete}>
                Mark Complete
              </Button>
              <Button variant="outline" size="md" onClick={handleSkipConnection}>
                Skip This Connection
              </Button>
            </div>

            {/* Report Concern */}
            <div className="border-t border-[#e8ddd2] pt-4">
              {!showReportForm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportForm(true)}
                  className="text-[#a84a2a]"
                >
                  Report a Concern
                </Button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={reportConcern}
                    onChange={(e) => setReportConcern(e.target.value)}
                    placeholder="Describe your concern (no judgment, all reports are reviewed)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a84a2a] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleReportConcern}
                      disabled={!reportConcern.trim()}
                      className="flex-1 bg-[#a84a2a] hover:bg-[#a85947]"
                    >
                      Submit Report
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowReportForm(false);
                        setReportConcern("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
        ) : (
        <Card className="text-center py-8">
          <p className="text-[#1a0f0a] mb-4">No active connection right now.</p>
          {preferences.frequency !== "pause" ? (
            <div className="space-y-3">
              <p className="text-sm text-[#a0704a]">
                {suggestedMatches.length > 0
                  ? "Browse the suggested connections above or send a random connection request."
                  : "Select a match from suggestions above, or check back soon for eligible members."}
              </p>
              <Button variant="primary" size="md" onClick={handleGenerateConnection}>
                Random Connection
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[#a0704a]">Connections are paused. Update your preferences to be paired.</p>
          )}
        </Card>
        )}
      </div>

      {/* Info Section */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="How This Works" icon="📖" />
        <ul className="space-y-3 text-[#1a0f0a] text-sm">
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Opt-in only—connections happen because you want them</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Matched on shared interests and comfort level preferences</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>20-minute structured conversation with clear timing</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>
              Contact info only shared with mutual consent—you stay in control
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Report concerns anytime, no retaliation, no judgment</span>
          </li>
        </ul>
      </Card>

      {/* Phase 2 Note */}
      <Card className="bg-[#fffbf7] border-2 border-[#d4a348]">
        <CardHeader title="Coming in Phase 2" icon="🚀" />
        <ul className="space-y-2 text-sm text-[#1a0f0a]">
          <li>✓ Mutual contact exchange (email, phone, Zoom link)</li>
          <li>✓ Couples connections (couples-to-couples, individual-to-couple options)</li>
        </ul>
      </Card>

      {/* Profile Modal */}
      <ConnectionProfileModal
        profile={selectedProfile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
