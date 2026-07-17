"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getProfile, Profile, CommunityProfile, getPublicProfile } from "@/lib/data/profiles";
import { getSession } from "@/lib/session";
import { getSpaces, Space } from "@/lib/data/spaces";
import { Button } from "@/components/Button";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<CommunityProfile | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      const memberData = await getPublicProfile(memberId);
      const profileData = await getProfile();
      const spacesData = await getSpaces();

      setMember(memberData);
      setUserProfile(profileData);
      setSpaces(spacesData);
      setLoading(false);
    };

    loadData();
  }, [memberId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#a0704a]">Loading profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#1a0f0a]">Member not found</p>
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
          <button
            onClick={() => router.back()}
            className="inline-flex text-[#d4a348] hover:text-[#c9956d] mb-4 bg-none border-none cursor-pointer font-inherit"
          >
            Back
          </button>
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
                <span className="bg-[#e8ddd2] text-[#a0704a] text-xs font-normal px-2 py-0.5 rounded">
                  Sample
                </span>
              )}
            </div>

            {/* Info */}
            <div className="sm:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-[#1a0f0a] mb-1">
                  {member.displayName}
                </h1>
                {member.pronouns && (
                  <p className="text-[#a0704a]">{member.pronouns}</p>
                )}
              </div>

              {member.profile_tagline && (
                <div className="bg-[#f3ede5] p-4 rounded-lg italic text-[#1a0f0a]">
                  "{member.profile_tagline}"
                </div>
              )}

              <div className="space-y-2">
                {member.location && (
                  <p className="text-[#1a0f0a]">
                    <strong className="text-[#1a0f0a]">Location:</strong>{" "}
                    {member.location}
                  </p>
                )}
                {member.ageRange && (
                  <p className="text-[#1a0f0a]">
                    <strong className="text-[#1a0f0a]">Age:</strong> {member.ageRange}
                  </p>
                )}
                {member.orientation && (
                  <p className="text-[#1a0f0a]">
                    <strong className="text-[#1a0f0a]">Orientation:</strong> {member.orientation}
                  </p>
                )}
                {member.relationshipStatus && (
                  <p className="text-[#1a0f0a]">
                    <strong className="text-[#1a0f0a]">Relationship Status:</strong> {member.relationshipStatus}
                  </p>
                )}
                {(member.memberSince || member.joinedAt) && (
                  <p className="text-[#1a0f0a]">
                    <strong className="text-[#1a0f0a]">Member Since:</strong>{" "}
                    {new Date(member.memberSince || member.joinedAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              {sharedSpaces.length > 0 && (
                <div className="pt-4 border-t border-[#e8ddd2]">
                  <p className="text-sm text-[#a0704a] mb-2">
                    You're both in {sharedSpaces.length} space
                    {sharedSpaces.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Why I&apos;m Here */}
        {(member.whatBroughtYouHere || member.connectionHoping) && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">Why I&apos;m Here</h2>
            {member.whatBroughtYouHere && (
              <div>
                <p className="text-sm text-[#a0704a] mb-1">What brought them here</p>
                <p className="text-[#1a0f0a] leading-relaxed">{member.whatBroughtYouHere}</p>
              </div>
            )}
            {member.connectionHoping && (
              <div>
                <p className="text-sm text-[#a0704a] mb-1">Looking to connect with</p>
                <p className="text-[#1a0f0a] leading-relaxed">{member.connectionHoping}</p>
              </div>
            )}
          </section>
        )}

        {/* A Little Deeper -- only present when the member has opted in */}
        {(member.quizResult || member.connectionComfortLevel || member.selectedReflection) && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">A Little Deeper</h2>
            {member.quizResult && (
              <div className="border-l-4 border-[#d4a348] pl-4">
                <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-1">Connection Pattern</p>
                <p className="font-medium text-[#1a0f0a]">{member.quizResult}</p>
              </div>
            )}
            {member.connectionComfortLevel && (
              <div className="border-l-4 border-[#d4a348] pl-4">
                <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-1">Preferred Ways to Connect</p>
                <p className="font-medium text-[#1a0f0a]">{member.connectionComfortLevel}</p>
              </div>
            )}
            {member.selectedReflection && (
              <div className="border-l-4 border-[#d4a348] pl-4">
                <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-1">A Question They&apos;re Sitting With</p>
                <p className="text-[#1a0f0a] leading-relaxed italic">{member.selectedReflection}</p>
              </div>
            )}
          </section>
        )}

        {/* Interests */}
        {member.interests && member.interests.length > 0 && (
          <section className="bg-white rounded-lg p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {member.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-block bg-[#f3ede5] text-[#1a0f0a] px-4 py-2 rounded-full text-sm"
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
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">
              Spaces They've Joined ({memberSpaces.length})
            </h2>
            <div className="space-y-2">
              {memberSpaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/app/spaces/${space.id}`}
                  className="block p-3 rounded-lg hover:bg-[#f3ede5] transition-colors group"
                >
                  <p className="font-medium text-[#1a0f0a] group-hover:text-[#d4a348] transition-colors">
                    {space.name}
                  </p>
                  <p className="text-sm text-[#a0704a]">
                    {space.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
