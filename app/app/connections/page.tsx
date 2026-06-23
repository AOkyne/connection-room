"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { getProfile } from "@/lib/data/profiles";
import {
  getPairingPreferences,
  updatePairingPreferences,
  generateDemoPairing,
  getCurrentPairing,
  setCurrentPairing,
  completePairing,
  skipPairing,
  reportPairingConcern,
} from "@/lib/data/pairings";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconConnection, IconForYou } from "@/components/Icons";

export default function ConnectionsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [currentPairing, setCurrentPairingState] = useState<any>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportConcern, setReportConcern] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);

      if (p) {
        const prefs = getPairingPreferences(p.id);
        setPreferences(prefs);

        const pairing = getCurrentPairing(p.id);
        setCurrentPairingState(pairing);
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted || !profile || !preferences) {
    return <div>Loading...</div>;
  }

  const handleFrequencyChange = (frequency: string) => {
    const updated = { ...preferences, frequency };
    setPreferences(updated);
    updatePairingPreferences(profile.id, updated);
  };

  const handleContactModeChange = (contactMode: string) => {
    const updated = { ...preferences, contactMode };
    setPreferences(updated);
    updatePairingPreferences(profile.id, updated);
  };

  const handleGeneratePairing = () => {
    const pairing = generateDemoPairing(profile);
    if (pairing) {
      setCurrentPairingState(pairing);
      setCurrentPairing(profile.id, pairing);
    }
  };

  const handleMarkComplete = () => {
    if (currentPairing) {
      completePairing(profile.id, currentPairing.id);
      setCurrentPairingState(null);
    }
  };

  const handleSkipPairing = () => {
    skipPairing(profile.id);
    setCurrentPairingState(null);
  };

  const handleReportConcern = () => {
    if (reportConcern.trim() && currentPairing) {
      reportPairingConcern(profile.id, currentPairing.id, reportConcern);
      setReportConcern("");
      setShowReportForm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl text-[#2a2318]">Connections</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
          Opt-in structured conversations with other members
        </p>
      </div>

      {/* Preferences */}
      <Card>
        <CardHeader title="Your Preferences" icon={<IconForYou size={20} />} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2a2318] mb-3">
              How often would you like to connect?
            </label>
            <div className="space-y-2">
              {[
                { id: "weekly", label: "connect me this week" },
                { id: "monthly", label: "connect me monthly" },
                { id: "pause", label: "Pause connections" },
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-3 p-3 hover:bg-[#f3ede5] rounded cursor-pointer">
                  <input
                    type="radio"
                    checked={preferences.frequency === option.id}
                    onChange={() => handleFrequencyChange(option.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-[#6b5f52]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e8ddd2] pt-4">
            <label className="block text-sm font-medium text-[#2a2318] mb-3">
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
                  <span className="text-[#6b5f52]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Current Pairing */}
      {currentPairing ? (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-2 border-[#d4a574]">
          <CardHeader title="Your Connection This Week" icon={<IconConnection size={20} />} />
          <div className="space-y-4">
            {/* Partner Info */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-start gap-4">
                {currentPairing.partnerPhoto && (
                  <img
                    src={currentPairing.partnerPhoto}
                    alt={currentPairing.partnerName}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="text-sm text-[#a0968a] uppercase tracking-wide">Your partner</p>
                  <p className="text-2xl font-medium text-[#2a2318] mt-1">
                    {currentPairing.partnerName} {currentPairing.partnerPronouns && `(${currentPairing.partnerPronouns})`}
                  </p>
                </div>
              </div>
            </div>

            {/* Shared Interests */}
            <div>
              <p className="text-sm text-[#6b5f52] mb-2">Shared interests</p>
              <div className="flex flex-wrap gap-2">
                {currentPairing.partnerInterests.slice(0, 3).map((interest: string) => (
                  <span key={interest} className="bg-[#e8ddd2] text-[#2a2318] px-3 py-1 rounded-full text-xs">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Prompt */}
            <div className="bg-white rounded-lg p-4 italic text-[#6b5f52]">
              "{currentPairing.sharedPrompt}"
            </div>

            {/* 20-Minute Structure */}
            <div className="bg-[#f3ede5] rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-[#2a2318] mb-3">Suggested 20-Minute Structure</p>
              <div className="space-y-2">
                <p className="text-[#6b5f52]">
                  <strong>2 min:</strong> Arrive, breathe, say hello
                </p>
                <p className="text-[#6b5f52]">
                  <strong>5 min each:</strong> What brought you here & what connection you're practicing
                </p>
                <p className="text-[#6b5f52]">
                  <strong>5 min:</strong> Respond to the prompt together
                </p>
                <p className="text-[#6b5f52]">
                  <strong>3 min:</strong> Appreciation, reflection, close
                </p>
              </div>
            </div>

            {/* Consent & Safety */}
            <div className="space-y-2 text-sm text-[#6b5f52]">
              <p className="flex items-start gap-2">
                <span>✓</span>
                <span>
                  <strong>Consent:</strong> Either party can pause or end the pairing anytime
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
              <Button variant="primary" size="md" onClick={handleMarkComplete} className="flex-1">
                Mark Complete
              </Button>
              <Button variant="outline" size="md" onClick={handleSkipPairing} className="flex-1">
                Skip This Pairing
              </Button>
            </div>

            {/* Report Concern */}
            <div className="border-t border-[#e8ddd2] pt-4">
              {!showReportForm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportForm(true)}
                  className="text-[#b86a52]"
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
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b86a52] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleReportConcern}
                      disabled={!reportConcern.trim()}
                      className="flex-1 bg-[#b86a52] hover:bg-[#a85947]"
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
          <p className="text-[#6b5f52] mb-4">No active pairing right now.</p>
          {preferences.frequency !== "pause" ? (
            <Button variant="primary" size="md" onClick={handleGeneratePairing}>
              Generate Demo Pairing
            </Button>
          ) : (
            <p className="text-sm text-[#a0968a]">Connections are paused. Update your preferences to be paired.</p>
          )}
        </Card>
      )}

      {/* Info Section */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="How This Works" icon="📖" />
        <ul className="space-y-3 text-[#6b5f52] text-sm">
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Opt-in only—pairings happen because you want them</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Matched on shared interests and comfort level preferences</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>20-minute structured conversation with clear timing</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>
              Contact info only shared with mutual consent—you stay in control
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Report concerns anytime, no retaliation, no judgment</span>
          </li>
        </ul>
      </Card>

      {/* Phase 2 Note */}
      <Card className="bg-[#fffbf7] border-2 border-[#d4a574]">
        <CardHeader title="Coming in Phase 2" icon="🚀" />
        <ul className="space-y-2 text-sm text-[#6b5f52]">
          <li>✓ Mutual contact exchange (email, phone, Zoom link)</li>
          <li>✓ Couples pairings (couples-to-couples, individual-to-couple options)</li>
          <li>✓ Pairing history and notes</li>
          <li>✓ In-app messaging (limited to active pairings only)</li>
        </ul>
      </Card>
    </div>
  );
}
