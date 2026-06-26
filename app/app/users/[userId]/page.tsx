"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  displayName: string;
  pronouns?: string;
  location?: string;
  profilePhoto?: string;
  interests?: string[];
  whatBroughtYouHere?: string;
  connectionComfortLevel?: string;
  memberType?: string;
  joinedAt?: Date;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile({
            id: data.id,
            displayName: data.display_name,
            pronouns: data.pronouns,
            location: data.location,
            profilePhoto: data.profile_photo,
            interests: data.interests || [],
            whatBroughtYouHere: data.what_brought_you_here,
            connectionComfortLevel: data.pairing_comfort_level,
            memberType: data.member_type,
            joinedAt: data.joined_at ? new Date(data.joined_at) : undefined,
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-[#6b5f52]">Profile not found</p>
        <Link href="/app/spaces">
          <Button variant="outline" size="sm">
            ← Back to Spaces
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/app/spaces">
          <Button variant="outline" size="sm" className="mb-4">
            ← Back
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card>
        <div className="space-y-4">
          {profile.profilePhoto && (
            <img
              src={profile.profilePhoto}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold text-[#2a2318]">{profile.displayName}</h1>
            {profile.pronouns && <p className="text-[#6b5f52]">({profile.pronouns})</p>}
          </div>
          {profile.location && <p className="text-[#6b5f52]">📍 {profile.location}</p>}
          {profile.joinedAt && (
            <p className="text-sm text-[#a0968a]">
              Member since {profile.joinedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>

      {/* About */}
      {profile.whatBroughtYouHere && (
        <Card>
          <CardHeader title="What Brought Them Here" />
          <p className="text-[#6b5f52]">{profile.whatBroughtYouHere}</p>
        </Card>
      )}

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <Card>
          <CardHeader title="Interests" />
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 bg-[#f3ede5] text-[#2a2318] rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Pairing Preferences */}
      {profile.connectionComfortLevel && (
        <Card>
          <CardHeader title="Connection Comfort Level" />
          <p className="text-[#6b5f52] capitalize">{profile.connectionComfortLevel.replace(/-/g, " ")}</p>
        </Card>
      )}
    </div>
  );
}
