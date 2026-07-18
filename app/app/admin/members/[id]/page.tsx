"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase/client";
import { getSession } from "@/lib/session";
import { deleteMembers } from "@/lib/admin/member-actions";
import { IconProfile, IconConnection, IconAlert } from "@/components/Icons";

interface MemberProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  email: string;
  profile_photo?: string;
  pronouns?: string;
  location?: string;
  interests?: string[];
  member_type: string;
  completed_onboarding: boolean;
  created_at: string;
  invite_code?: string;
  invited_by_profile_id?: string;
  suspended?: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  // Migration 053 fields -- previously fetched (select("*")) but never
  // rendered anywhere on this page, so admins had no way to see them here.
  age_range?: string;
  orientation?: string;
  relationship_status?: string;
  what_brought_you_here?: string;
  connection_hoping?: string;
  quiz_result?: string;
  connection_comfort_level?: string;
  connection_boundaries?: string;
}

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [invitedCount, setInvitedCount] = useState(0);
  const [invitedByName, setInvitedByName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      setMounted(true);
      loadMemberDetails();
    };

    checkAdminAndLoad();
  }, [memberId, router]);

  const loadMemberDetails = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Get member profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", memberId)
        .single();

      if (profileError || !profile) {
        console.error("Error loading member:", profileError);
        router.push("/app/admin");
        setLoading(false);
        return;
      }

      // Get invited friends count
      const { count: invitedCount } = await supabase
        .from("invite_relationships")
        .select("*", { count: "exact", head: true })
        .eq("inviter_profile_id", memberId);

      setInvitedCount(invitedCount || 0);

      // Get who invited them
      if (profile.invited_by_profile_id) {
        const { data: inviter } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", profile.invited_by_profile_id)
          .single();

        if (inviter) {
          setInvitedByName(inviter.display_name);
        }
      }

      // Get email from auth. supabase.auth.admin.* requires the
      // service-role key -- calling it from this client-side (anon-key)
      // instance always fails silently (caught below), so this member's
      // email has never actually loaded here. Routed through the existing
      // /api/admin/members/emails route instead, which already does this
      // server-side with requireAdmin() + the service-role key.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const response = await fetch("/api/admin/members/emails", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const { emails } = await response.json();
            profile.email = emails?.[profile.id] || "";
          }
        }
      } catch (err) {
        console.warn("Could not get email from auth:", err);
      }

      setMember(profile);
    } catch (err) {
      console.error("Error loading member details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      alert("Please provide a reason for suspension");
      return;
    }

    if (!confirm("Are you sure you want to suspend this member?")) return;
    if (!supabase) {
      alert("Supabase not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          suspended: true,
          suspended_at: new Date().toISOString(),
          suspension_reason: suspensionReason,
        })
        .eq("id", memberId);

      if (error) {
        alert("Error suspending member: " + error.message);
        return;
      }

      setMember(m => m ? { ...m, suspended: true, suspended_at: new Date().toISOString(), suspension_reason: suspensionReason } : null);
      setShowSuspendForm(false);
      setSuspensionReason("");
    } catch (err) {
      console.error("Error suspending member:", err);
      alert("Failed to suspend member");
    }
  };

  const handleUnsuspend = async () => {
    if (!confirm("Are you sure you want to unsuspend this member?")) return;
    if (!supabase) {
      alert("Supabase not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          suspended: false,
          suspended_at: null,
          suspension_reason: null,
        })
        .eq("id", memberId);

      if (error) {
        alert("Error unsuspending member: " + error.message);
        return;
      }

      setMember(m => m ? { ...m, suspended: false, suspended_at: undefined, suspension_reason: undefined } : null);
    } catch (err) {
      console.error("Error unsuspending member:", err);
      alert("Failed to unsuspend member");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you ABSOLUTELY SURE you want to permanently delete this member? This action cannot be undone.")) return;
    if (!confirm("This will delete all their data. Please confirm again.")) return;

    // deleteMembers() routes through /api/admin/members/delete
    // (requireAdmin() + service-role key), which actually removes the
    // auth.users account too. The previous version of this handler called
    // supabase.auth.admin.deleteUser() directly from this client-side
    // (anon-key) instance -- that call always fails silently, so a
    // "deleted" member's auth account was never actually removed, only
    // (if RLS allowed it) their profiles row.
    try {
      const { deletedCount, failedCount, errors } = await deleteMembers([memberId]);

      if (failedCount > 0) {
        alert("Error deleting member: " + (errors.join("; ") || "Unknown error"));
        return;
      }

      if (deletedCount > 0) {
        router.push("/app/admin/members");
      }
    } catch (err) {
      console.error("Error deleting member:", err);
      alert("Failed to delete member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#a0704a]">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#a0704a]">Member not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Members", href: "/app/admin/members" },
          { label: member.display_name, isActive: true },
        ]}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* This single-row select("*") fetch already includes
              profile_photo (unlike the bulk Members list, a single row's
              photo -- even a multi-megabyte legacy base64 one -- transfers
              fast; the slow/timeout risk was specific to sorting and
              transferring that column across every row at once) -- it was
              just never rendered anywhere on this page. */}
          <Avatar name={member.display_name} photo={member.profile_photo} size="lg" />
          <h1 className="text-3xl text-[#1a0f0a]">{member.display_name}</h1>
        </div>
        {/* The breadcrumb's "Members" link always goes to the dedicated
            Members list, but this page is also reached from the main
            Admin Dashboard's own member table -- router.back() returns to
            whichever page the admin actually came from, matching the
            back-button pattern already used elsewhere in the app (e.g.
            app/app/connections/page.tsx). */}
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors text-sm whitespace-nowrap"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      {member.suspended && (
        <div className="p-4 bg-[#a84a2a] rounded-lg border-2 border-[#7a2a1a]">
          <p className="font-semibold text-white">🔒 Member Suspended</p>
          <p className="text-white/90 text-sm mt-1">
            {member.suspension_reason}
          </p>
          {member.suspended_at && (
            <p className="text-white/75 text-xs mt-1">
              Suspended: {new Date(member.suspended_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader title="Profile Information" icon={<IconProfile size={20} />} />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Display Name</p>
              <p className="text-[#1a0f0a]">{member.display_name}</p>
            </div>
            {(member.first_name || member.last_name) && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Full Name</p>
                <p className="text-[#1a0f0a]">{member.first_name} {member.last_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Email</p>
              <p className="text-[#1a0f0a]">{member.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Member Type</p>
              <p className="text-[#1a0f0a] capitalize">{member.member_type}</p>
            </div>
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Pronouns</p>
              <p className="text-[#1a0f0a]">{member.pronouns || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Location</p>
              <p className="text-[#1a0f0a]">{member.location || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Joined</p>
              <p className="text-[#1a0f0a]">{new Date(member.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Onboarding</p>
              <p className="text-[#1a0f0a]">{member.completed_onboarding ? "✓ Complete" : "Incomplete"}</p>
            </div>
          </div>
        </Card>

        {/* Activity & Connections */}
        <Card>
          <CardHeader title="Community Activity" icon={<IconConnection size={20} />} />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Friends Invited</p>
              <p className="text-3xl font-bold text-[#d4a348]">{invitedCount}</p>
            </div>
            {invitedByName && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Invited By</p>
                <p className="text-[#1a0f0a]">{invitedByName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#a0704a] font-medium">Invite Code</p>
              <p className="text-[#1a0f0a] font-mono text-sm">{member.invite_code || "—"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connection Profile -- migration 053 fields. Admins see the full,
          unmasked private profiles row regardless of the member's own
          show_* visibility settings (those flags only govern what OTHER
          MEMBERS see via public_profiles_view); this section was
          previously fetched but never rendered anywhere on this page. */}
      {(member.age_range || member.orientation || member.relationship_status || member.what_brought_you_here ||
        member.connection_hoping || member.quiz_result || member.connection_comfort_level || member.connection_boundaries) && (
        <Card>
          <CardHeader title="Connection Profile" icon={<IconProfile size={20} />} />
          <div className="grid md:grid-cols-2 gap-4">
            {member.age_range && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Age Range</p>
                <p className="text-[#1a0f0a]">{member.age_range}</p>
              </div>
            )}
            {member.orientation && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Orientation</p>
                <p className="text-[#1a0f0a]">{member.orientation}</p>
              </div>
            )}
            {member.relationship_status && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Relationship Status</p>
                <p className="text-[#1a0f0a]">{member.relationship_status}</p>
              </div>
            )}
            {member.quiz_result && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Quiz Result</p>
                <p className="text-[#1a0f0a]">{member.quiz_result}</p>
              </div>
            )}
            {member.connection_comfort_level && (
              <div>
                <p className="text-xs text-[#a0704a] font-medium">Connection Comfort Level</p>
                <p className="text-[#1a0f0a]">{member.connection_comfort_level}</p>
              </div>
            )}
            {member.what_brought_you_here && (
              <div className="md:col-span-2">
                <p className="text-xs text-[#a0704a] font-medium">Why They Joined</p>
                <p className="text-[#1a0f0a]">{member.what_brought_you_here}</p>
              </div>
            )}
            {member.connection_hoping && (
              <div className="md:col-span-2">
                <p className="text-xs text-[#a0704a] font-medium">What They're Hoping to Find</p>
                <p className="text-[#1a0f0a]">{member.connection_hoping}</p>
              </div>
            )}
            {member.connection_boundaries && (
              <div className="md:col-span-2">
                <p className="text-xs text-[#a0704a] font-medium">Connection Boundaries (private, admin-only)</p>
                <p className="text-[#1a0f0a]">{member.connection_boundaries}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Interests */}
      {member.interests && member.interests.length > 0 && (
        <Card>
          <CardHeader title="Interests" icon={<IconConnection size={20} />} />
          <div className="flex flex-wrap gap-2">
            {member.interests.map((interest) => (
              <span key={interest} className="px-3 py-1 bg-[#f3ede5] text-[#1a0f0a] text-sm rounded-full">
                {interest}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader title="Admin Actions" icon={<IconAlert size={20} />} />
        <div className="space-y-3">
          {member.suspended ? (
            <Button
              variant="outline"
              onClick={handleUnsuspend}
              className="w-full"
            >
              Unsuspend Member
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowSuspendForm(true)}
                className="w-full border-[#c97a2a] text-[#c97a2a]"
              >
                Suspend Member
              </Button>

              {showSuspendForm && (
                <div className="space-y-2 p-3 bg-[#f3ede5] rounded">
                  <textarea
                    placeholder="Reason for suspension..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8e3db] rounded text-[#1a0f0a] text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuspendForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSuspend}
                      className="flex-1 bg-[#c97a2a]"
                    >
                      Confirm Suspension
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <Button
            variant="outline"
            onClick={handleDelete}
            className="w-full border-[#a84a2a] text-[#a84a2a]"
          >
            Delete Member (Permanent)
          </Button>
        </div>
      </Card>
    </div>
  );
}
