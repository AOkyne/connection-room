"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getProfile, Profile } from "@/lib/data/profiles";
import { demoMembers } from "@/lib/seed/demo-members";
import { getSpaces, Space } from "@/lib/data/spaces";
import { Button } from "@/components/Button";

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const memberData = demoMembers.find((m) => m.id === memberId);
      const profileData = await getProfile();
      const spacesData = await getSpaces();

      setMember(memberData || null);
      setUserProfile(profileData);
      setSpaces(spacesData);
      setLoading(false);
    };

    loadData();
  }, [memberId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#a0968a]">Loading profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#6b5f52]">Member not found</p>
      </div>
    );
  }

  // Get shared spaces
  const sharedSpaces =
    member.spacesJoined && userProfile?.spacesJoined
      ? member.spacesJoined.filter((id) =>
          userProfile.spacesJoined?.includes(id)
        )
      : [];

  const memberSpaces = spaces.filter((s) => member.spacesJoined?.includes(s.id));

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8ddd2] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <Link
            href={-1 as any}
            className="inline-flex text-[#d4a574] hover:text-[#c9956d] mb-4"
          >
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Photo */}
            <div className="sm:col-span-1 flex flex-col items-center sm:items-start">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-[#f0e8e0] mb-4">
                <img
                  src={member.profilePhoto}
                  alt={member.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              {member.is_demo_profile && (
                <span className="bg-[#e8ddd2] text-[#a0968a] text-xs font-normal px-2 py-0.5 rounded">
                  Sample
                </span>
              )}
            </div>

            {/* Info */}
            <div className="sm:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-[#2a2318] mb-1">
                  {member.displayName}
                </h1>
                {member.pronouns && (
                  <p className="text-[#a0968a]">{member.pronouns}</p>
                )}
              </div>

              {member.profile_tagline && (
                <div className="bg-[#f3ede5] p-4 rounded-lg italic text-[#6b5f52]">
                  "{member.profile_tagline}"
                </div>
              )}

              <div className="space-y-2">
                {member.location && (
                  <p className="text-[#6b5f52]">
                    <strong className="text-[#2a2318]">Location:</strong>{" "}
                    {member.location}
                  </p>
                )}
                {member.ageRange && (
                  <p className="text-[#6b5f52]">
                    <strong className="text-[#2a2318]">Age:</strong>{" "}
                    {member.ageRange}
                  </p>
                )}
                {member.relationshipStatus && (
                  <p className="text-[#6b5f52]">
                    <strong className="text-[#2a2318]">Relationship:</strong>{" "}
                    {member.relationshipStatus}
                  </p>
                )}
              </div>

              {sharedSpaces.length > 0 && (
                <div className="pt-4 border-t border-[#e8ddd2]">
                  <p className="text-sm text-[#a0968a] mb-2">
                    You're both in {sharedSpaces.length} space
                    {sharedSpaces.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* About Section */}
        {member.whatBroughtYouHere && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#2a2318]">
              What Brought Them Here
            </h2>
            <p className="text-[#6b5f52] leading-relaxed">
              {member.whatBroughtYouHere}
            </p>
          </section>
        )}

        {/* Connection Hoping */}
        {member.connectionHoping && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#2a2318]">
              What They're Looking For
            </h2>
            <p className="text-[#6b5f52] leading-relaxed">
              {member.connectionHoping}
            </p>
          </section>
        )}

        {/* Interests */}
        {member.interests && member.interests.length > 0 && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#2a2318]">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {member.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-block bg-[#f3ede5] text-[#6b5f52] px-4 py-2 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Spaces */}
        {memberSpaces.length > 0 && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#2a2318]">
              Spaces They've Joined ({memberSpaces.length})
            </h2>
            <div className="space-y-2">
              {memberSpaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/app/spaces/${space.id}`}
                  className="block p-3 rounded-lg hover:bg-[#f3ede5] transition-colors group"
                >
                  <p className="font-medium text-[#2a2318] group-hover:text-[#d4a574] transition-colors">
                    {space.name}
                  </p>
                  <p className="text-sm text-[#a0968a]">
                    {space.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Connection Profile */}
        {member.quizResult && (
          <section className="bg-[#f3ede5] rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-semibold text-[#2a2318]">
              Connection Profile
            </h2>
            <p className="text-[#6b5f52]">
              Their connection profile is{" "}
              <strong className="text-[#2a2318]">{member.quizResult}</strong>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
