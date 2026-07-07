"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { IconConnection } from "@/components/Icons";

interface InviteRelationship {
  id: string;
  inviter_profile_id: string;
  invited_profile_id: string;
  invite_code: string;
  created_at: string;
  inviter_name?: string;
  invitee_name?: string;
  invitee_email?: string;
  invitee_joined_at?: string;
}

export default function InvitesAdmin() {
  const [invites, setInvites] = useState<InviteRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        console.warn("Supabase not available");
        setLoading(false);
        return;
      }

      // Get all invite relationships with inviter and invitee details
      const { data: relationships, error: relError } = await supabase
        .from("invite_relationships")
        .select(`
          id,
          inviter_profile_id,
          invited_profile_id,
          invite_code,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (relError) {
        console.error("Error loading invite relationships:", relError);
        setLoading(false);
        return;
      }

      if (!relationships || relationships.length === 0) {
        setInvites([]);
        setLoading(false);
        return;
      }

      // Get inviter and invitee profile details
      const inviterIds = [...new Set(relationships.map(r => r.inviter_profile_id))];
      const inviteeIds = [...new Set(relationships.map(r => r.invited_profile_id))];

      const [{ data: inviters }, { data: invitees }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", inviterIds),
        supabase.from("profiles").select("id, display_name, user_id, email, created_at").in("id", inviteeIds),
      ]);

      // Get invitee emails from auth users
      const inviteeUserIds = invitees?.map(p => p.user_id) || [];
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const userEmailMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || []);

      // Combine data
      const enrichedInvites: InviteRelationship[] = relationships.map(rel => {
        const inviter = inviters?.find(p => p.id === rel.inviter_profile_id);
        const invitee = invitees?.find(p => p.id === rel.invited_profile_id);
        return {
          ...rel,
          inviter_name: inviter?.display_name || "Unknown",
          invitee_name: invitee?.display_name || "Unknown",
          invitee_email: invitee?.user_id ? userEmailMap.get(invitee.user_id) : undefined,
          invitee_joined_at: invitee?.created_at,
        };
      });

      setInvites(enrichedInvites);
    } catch (err) {
      console.error("Error loading invites:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRelationship = async (id: string) => {
    if (!confirm("Are you sure you want to remove this invite relationship?")) return;
    if (!supabase) {
      alert("Supabase not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("invite_relationships")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error deleting relationship: " + error.message);
        return;
      }

      setInvites(invites.filter(i => i.id !== id));
    } catch (err) {
      console.error("Error deleting relationship:", err);
      alert("Failed to delete relationship");
    }
  };

  const filteredInvites = invites.filter(invite =>
    searchTerm === "" ||
    invite.inviter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invite.invitee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invite.invitee_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedInvites = [...filteredInvites].sort((a, b) => {
    if (sortBy === "name") {
      return (a.inviter_name || "").localeCompare(b.inviter_name || "");
    }
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl text-[#1a0f0a]">Invite Relationships</h1>
        <Link href="/app/admin">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader title={`Total Invites: ${invites.length}`} icon={<IconConnection size={20} />} />
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by inviter, invitee, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a0f0a] placeholder-[#a0704a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Inviter Name</option>
            </select>
          </div>

          {loading ? (
            <p className="text-[#a0704a]">Loading...</p>
          ) : sortedInvites.length === 0 ? (
            <p className="text-[#a0704a]">
              {invites.length === 0 ? "No invites yet" : "No invites match your search"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e3db]">
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Inviter</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Invitee</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Email</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Code</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Invited</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Joined</th>
                    <th className="text-left py-3 px-2 text-[#a0704a] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvites.map((invite) => (
                    <tr key={invite.id} className="border-b border-[#f3ede5] hover:bg-[#f8f6f2] transition-colors">
                      <td className="py-3 px-2 text-[#1a0f0a] font-medium">{invite.inviter_name}</td>
                      <td className="py-3 px-2 text-[#1a0f0a]">{invite.invitee_name}</td>
                      <td className="py-3 px-2 text-[#1a0f0a] text-xs">{invite.invitee_email || "—"}</td>
                      <td className="py-3 px-2 text-[#1a0f0a] font-mono text-xs">{invite.invite_code}</td>
                      <td className="py-3 px-2 text-[#a0704a] text-xs">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-[#a0704a] text-xs">
                        {invite.invitee_joined_at
                          ? new Date(invite.invitee_joined_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDeleteRelationship(invite.id)}
                          className="text-xs px-2 py-1 text-[#a84a2a] hover:bg-[#fce5e0] rounded transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-[#a0704a] pt-4">
            Showing {sortedInvites.length} of {invites.length} invite relationships
          </p>
        </div>
      </Card>
    </div>
  );
}
