"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getProfile, Profile, getProfilesBySpace } from "@/lib/data/profiles";
import { getSpace, Space } from "@/lib/data/spaces";
import { Button } from "@/components/Button";

export default function SpaceMembersPage() {
  const params = useParams();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const spaceData = await getSpace(spaceId);
      const profileData = await getProfile();
      const spaceMembers = await getProfilesBySpace(spaceId);

      setSpace(spaceData);
      setUserProfile(profileData);
      setMembers(spaceMembers);

      setLoading(false);
    };

    loadData();
  }, [spaceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#a0704a]">Loading members...</p>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#1a0f0a]">Space not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8ddd2] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/app/spaces/${spaceId}`}
              className="text-[#d4a348] hover:text-[#c9956d]"
            >
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-[#1a0f0a]">
                {space.name} - Members
              </h1>
              <p className="text-sm text-[#a0704a]">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#1a0f0a]">No members have joined this space yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <Link key={member.id} href={`/members/${member.id}`}>
                <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  {/* Photo */}
                  <div className="relative aspect-square overflow-hidden bg-[#f0e8e0]">
                    <img
                      src={member.profilePhoto}
                      alt={member.displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {member.is_demo_profile && (
                      <div className="absolute top-2 right-2 bg-[#e8ddd2] text-[#a0704a] text-xs font-normal px-2 py-0.5 rounded">
                        Sample
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-[#1a0f0a] group-hover:text-[#d4a348] transition-colors">
                        {member.displayName}
                      </h3>
                      {member.pronouns && (
                        <p className="text-sm text-[#a0704a]">
                          {member.pronouns}
                        </p>
                      )}
                    </div>

                    {member.profile_tagline && (
                      <p className="text-sm text-[#1a0f0a] italic">
                        "{member.profile_tagline}"
                      </p>
                    )}

                    {member.location && (
                      <p className="text-xs text-[#a0704a]">
                        {member.location}
                      </p>
                    )}

                    {member.interests && member.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {member.interests.slice(0, 2).map((interest) => (
                          <span
                            key={interest}
                            className="inline-block text-xs bg-[#f3ede5] text-[#1a0f0a] px-2 py-1 rounded"
                          >
                            {interest}
                          </span>
                        ))}
                        {member.interests.length > 2 && (
                          <span className="inline-block text-xs text-[#a0704a]">
                            +{member.interests.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
