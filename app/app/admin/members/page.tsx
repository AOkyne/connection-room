"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAllProfiles, type Profile } from "@/lib/data/profiles";
import { resetMemberProgress, sendAdminMessage } from "@/lib/admin/member-actions";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";
import { Avatar } from "@/components/Avatar";

type SortBy = "name" | "joinDate" | "activity";
type FilterOnboarding = "all" | "completed" | "incomplete";
type FilterActivity = "all" | "active" | "inactive";

export default function AdminMembersPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("joinDate");
  const [filterOnboarding, setFilterOnboarding] = useState<FilterOnboarding>("all");
  const [filterActivity, setFilterActivity] = useState<FilterActivity>("all");
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const profiles = await getAllProfiles();
      setMembers(profiles);
      setMounted(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = [...members];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(term) ||
          m.id?.toLowerCase().includes(term)
      );
    }

    // Onboarding filter
    if (filterOnboarding === "completed") {
      filtered = filtered.filter((m) => m.completedOnboarding);
    } else if (filterOnboarding === "incomplete") {
      filtered = filtered.filter((m) => !m.completedOnboarding);
    }

    // Activity filter - commented out until lastActive is reliably tracked
    // if (filterActivity === "active") {
    //   filtered = filtered.filter((m) => {
    //     const lastActive = m.lastActive ? new Date(m.lastActive).getTime() : 0;
    //     const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    //     return lastActive > sevenDaysAgo;
    //   });
    // } else if (filterActivity === "inactive") {
    //   filtered = filtered.filter((m) => {
    //     const lastActive = m.lastActive ? new Date(m.lastActive).getTime() : 0;
    //     const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    //     return lastActive <= sevenDaysAgo;
    //   });
    // }

    // Sort
    if (sortBy === "name") {
      filtered.sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || "")
      );
    } else if (sortBy === "joinDate") {
      filtered.sort(
        (a, b) =>
          new Date(b.joinedAt || Date.now()).getTime() -
          new Date(a.joinedAt || Date.now()).getTime()
      );
    } else if (sortBy === "activity") {
      filtered.sort(
        (a, b) =>
          new Date(b.lastActive || 0).getTime() -
          new Date(a.lastActive || 0).getTime()
      );
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, sortBy, filterOnboarding, filterActivity]);

  const handleResetProgress = async () => {
    if (
      !selectedMember ||
      !confirm(
        `Reset progress for ${selectedMember.displayName}? This will clear their onboarding status and badges.`
      )
    ) {
      return;
    }

    setActionInProgress(true);
    try {
      const success = await resetMemberProgress(selectedMember.id);
      if (success) {
        showToast(`Progress reset for ${selectedMember.displayName}`, "success");
        setShowEditModal(false);
      } else {
        showToast("Failed to reset progress", "error");
      }
    } catch (error) {
      console.error("Error resetting progress:", error);
      showToast("Error resetting progress", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedMember || !messageSubject.trim() || !messageBody.trim()) {
      showToast("Please enter both subject and message", "warning");
      return;
    }

    setActionInProgress(true);
    try {
      const success = await sendAdminMessage(
        selectedMember.id,
        selectedMember.displayName,
        messageSubject,
        messageBody,
        "Admin"
      );
      if (success) {
        showToast(
          `Message sent to ${selectedMember.displayName}`,
          "success"
        );
        setMessageSubject("");
        setMessageBody("");
        setShowMessageForm(false);
      } else {
        showToast("Failed to send message", "error");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Error sending message", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  if (!mounted || loading) {
    return (
      <LoadingScreen
        message="Loading members"
        subtitle="Fetching member data..."
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Members</h1>
        <p className="text-[#a0704a] mt-1">
          Manage community members ({filteredMembers.length} of {members.length})
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
        />
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-sm text-[#a0704a] block mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="joinDate">Join Date (Newest)</option>
            <option value="activity">Last Active</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-[#a0704a] block mb-1">Onboarding</label>
          <select
            value={filterOnboarding}
            onChange={(e) => setFilterOnboarding(e.target.value as FilterOnboarding)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>

        {/* Activity filter - lastActive tracking not yet implemented */}
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[#a0704a]">No members found matching your filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Member Header */}
                <div className="flex items-start gap-3">
                  <Avatar
                    name={member.displayName}
                    photo={member.profilePhoto}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#1a0f0a] truncate">
                      {member.displayName}
                    </h3>
                    {member.pronouns && (
                      <p className="text-xs text-[#a0704a]">{member.pronouns}</p>
                    )}
                    {member.is_demo_profile && (
                      <span className="inline-block text-xs bg-[#e8ddd2] text-[#a0704a] px-2 py-0.5 rounded mt-1">
                        Sample
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1 text-xs text-[#a0704a]">
                  {member.completedOnboarding ? (
                    <p>✓ Onboarding complete</p>
                  ) : (
                    <p>⏳ Onboarding incomplete</p>
                  )}
                  {member.joinedAt && (
                    <p>
                      Joined{" "}
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  )}
                  {member.lastActive && (
                    <p>
                      Last active{" "}
                      {new Date(member.lastActive).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                  <Link href={`/app/admin/members/${member.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowEditModal(true);
                    }}
                    className="text-xs"
                  >
                    ✎ Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1a0f0a]">
                  {showMessageForm ? "Send Message" : "Manage Member"}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowMessageForm(false);
                    setMessageSubject("");
                    setMessageBody("");
                  }}
                  className="text-[#a0704a] hover:text-[#1a0f0a]"
                >
                  ✕
                </button>
              </div>

              {showMessageForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#1a0f0a]">
                      To: {selectedMember.displayName}
                    </label>
                    <p className="text-xs text-[#a0704a] mt-1">
                      {selectedMember.id}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      placeholder="Message subject..."
                      className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                      Message
                    </label>
                    <textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Write your message..."
                      rows={4}
                      className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={actionInProgress}
                    >
                      {actionInProgress ? "Sending..." : "Send Message"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMessageForm(false)}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-[#f3ede5] rounded space-y-2">
                    <div>
                      <p className="text-sm text-[#a0704a]">Display Name</p>
                      <p className="font-medium text-[#1a0f0a]">
                        {selectedMember.displayName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#a0704a]">Member ID</p>
                      <p className="text-xs font-mono text-[#1a0f0a] break-all">
                        {selectedMember.id}
                      </p>
                    </div>
                    {selectedMember.joinedAt && (
                      <div>
                        <p className="text-sm text-[#a0704a]">Joined</p>
                        <p className="text-[#1a0f0a]">
                          {new Date(
                            selectedMember.joinedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1a0f0a] block">
                      Member Actions
                    </label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMessageForm(true)}
                        className="w-full justify-start text-left"
                      >
                        💬 Send Message
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetProgress}
                        disabled={actionInProgress}
                        className="w-full justify-start text-left text-red-600"
                      >
                        {actionInProgress
                          ? "⏳ Resetting..."
                          : "🔄 Reset Progress"}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded text-xs text-blue-900">
                    <p>
                      <strong>Reset Progress</strong> will clear the member's
                      onboarding completion status and badges. They will need to
                      restart onboarding.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Toast Notifications */}
      {/* Add toast container here if not already in layout */}
    </div>
  );
}
