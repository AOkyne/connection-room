"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { getProfile, getDemoProfiles } from "@/lib/data/profiles";
import {
  getConnectionPreferences,
  updateConnectionPreferences,
  generateDemoConnection,
  getCurrentConnection,
  setCurrentConnection,
  completeConnection,
  skipConnection,
  reportConnectionConcern,
  createConnectionFromMatch,
} from "@/lib/data/connections";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { IconConnection, IconForYou } from "@/components/Icons";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SuggestedConnections } from "@/components/connections/SuggestedConnections";
import { ConnectionProfileModal } from "@/components/connections/ConnectionProfileModal";
import { IncomingRequests } from "@/components/connections/IncomingRequests";
import { findBestMatches, type MatchScore } from "@/lib/utils/connectionMatching";
import {
  getIncomingRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  createDemoIncomingRequests,
  type ConnectionRequest,
} from "@/lib/data/connectionRequests";

export default function ConnectionsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [currentConnection, setCurrentConnectionState] = useState<any>(null);
  const [suggestedMatches, setSuggestedMatches] = useState<MatchScore[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportConcern, setReportConcern] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);

      if (p) {
        const prefs = getConnectionPreferences(p.id);
        setPreferences(prefs);

        const connection = getCurrentConnection(p.id);
        setCurrentConnectionState(connection);

        // Load incoming requests (create demo requests if none exist)
        let requests = getIncomingRequests(p.id);
        if (requests.length === 0) {
          createDemoIncomingRequests(p.id);
          requests = getIncomingRequests(p.id);
        }
        setIncomingRequests(requests);

        // Load suggested matches if no current connection
        if (!connection) {
          const allProfiles = getDemoProfiles();
          const matches = findBestMatches(p, allProfiles, 5);
          setSuggestedMatches(matches);
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

  const handleGenerateConnection = () => {
    const connection = generateDemoConnection(profile);
    if (connection) {
      setCurrentConnectionState(connection);
      setCurrentConnection(profile.id, connection);
    }
  };

  const handleSelectMatch = (matchId: string) => {
    const match = suggestedMatches.find((m) => m.profile.id === matchId);
    if (match && profile) {
      const connection = createConnectionFromMatch(profile, match.profile, match.sharedInterests);
      setCurrentConnectionState(connection);
      setCurrentConnection(profile.id, connection);
      setSuggestedMatches([]); // Clear suggestions once matched
    }
  };

  const handleViewPartnerProfile = () => {
    if (currentConnection) {
      const allProfiles = getDemoProfiles();
      const partnerProfile = allProfiles.find((p) => p.id === currentConnection.partnerId);
      if (partnerProfile) {
        setSelectedProfile(partnerProfile);
        setIsProfileModalOpen(true);
      }
    }
  };

  const handleMarkComplete = () => {
    if (currentConnection) {
      completeConnection(profile.id, currentConnection.id);
      setCurrentConnectionState(null);
      // Reload suggested matches
      const allProfiles = getDemoProfiles();
      const matches = findBestMatches(profile, allProfiles, 5);
      setSuggestedMatches(matches);
    }
  };

  const handleSkipConnection = () => {
    skipConnection(profile.id);
    setCurrentConnectionState(null);
    // Reload suggested matches
    const allProfiles = getDemoProfiles();
    const matches = findBestMatches(profile, allProfiles, 5);
    setSuggestedMatches(matches);
  };

  const handleReportConcern = () => {
    if (reportConcern.trim() && currentConnection) {
      reportConnectionConcern(profile.id, currentConnection.id, reportConcern);
      setReportConcern("");
      setShowReportForm(false);
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    const accepted = acceptConnectionRequest(requestId, profile.id);
    if (accepted && accepted.fromUserId) {
      // Remove from incoming requests
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Create a new connection from the accepted request
      const allProfiles = getDemoProfiles();
      const requesterProfile = allProfiles.find((p) => p.id === accepted.fromUserId);
      if (requesterProfile) {
        const connection = createConnectionFromMatch(profile, requesterProfile, []);
        setCurrentConnectionState(connection);
        setCurrentConnection(profile.id, connection);
      }
    }
  };

  const handleDeclineRequest = (requestId: string) => {
    const declined = declineConnectionRequest(requestId, profile.id);
    if (declined) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl text-[#1a0f0a]">Connections</h1>
          <p className="text-lg text-[#1a0f0a] mt-2">
            Structured conversations with other members
          </p>
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
                <p className="text-sm text-[#1a0f0a]">Practice connection in real time</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Demo Notice */}
      <Card className="bg-[#fff3e0] border-2 border-[#d4a348]">
        <div className="flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="font-medium text-[#1a0f0a]">This is a demo experience</p>
            <p className="text-sm text-[#1a0f0a] mt-1">
              You can explore the preferences and see how connections work. Actual matching and messaging functionality will begin in Phase 2.
            </p>
          </div>
        </div>
      </Card>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <IncomingRequests
          requests={incomingRequests}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
          currentUserId={profile.id}
          requesterProfiles={Object.fromEntries(
            getDemoProfiles()
              .filter((p) => incomingRequests.some((r) => r.fromUserId === p.id))
              .map((p) => [p.id, p])
          )}
        />
      )}

      {/* Suggested Connections (when no active connection) */}
      {!currentConnection && suggestedMatches.length > 0 && (
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
            onSelectMatch={handleSelectMatch}
            currentUserId={profile.id}
            currentUserName={profile.displayName}
            currentUserPhoto={profile.profilePhoto}
          />
        </div>
      )}

      {/* Preferences Section */}
      <div className="space-y-4">
        <div className="bg-[#f3ede5] rounded-lg p-4 border-l-4 border-[#c97a2a]">
          <h3 className="text-base font-semibold text-[#1a0f0a] mb-2">Set Your Connection Preferences</h3>
          <p className="text-sm text-[#1a0f0a]">
            Help us match you with people who share your connection style. Your preferences guide how often you want to connect and how you prefer to communicate.
          </p>
        </div>

        <Card>
          <CardHeader title="Your Preferences" icon={<IconForYou size={20} />} />
          <div className="space-y-4">
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

          <div className="border-t border-[#e8ddd2] pt-4">
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
      </div>

      {/* Current Connection */}
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
                  ? "Browse the suggested connections above or generate a random match."
                  : "Select a match from suggestions above or generate a random connection."}
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
          <li>✓ Connection history and notes</li>
          <li>✓ In-app messaging (limited to active connections only)</li>
        </ul>
      </Card>

      {/* Profile Modal */}
      <ConnectionProfileModal
        profile={selectedProfile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
