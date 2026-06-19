// Recommended next step logic for personalized guidance

import type { Profile } from "./profiles";
import { appConfig } from "@/lib/config";

export interface Recommendation {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: string;
  type: "action" | "learning" | "external";
}

export function getRecommendedNextStep(profile: Profile | null): Recommendation | null {
  if (!profile) return null;

  // Not completed onboarding
  if (!profile.completedOnboarding) {
    return {
      title: "Complete Your Profile",
      description: "Help the community get to know you",
      action: "Finish Onboarding",
      href: "/onboarding",
      icon: "✨",
      type: "action",
    };
  }

  // No spaces joined
  if (!profile.spacesJoined || profile.spacesJoined.length === 0) {
    return {
      title: "Choose Your First Space",
      description: "Find a community that resonates with you",
      action: "Browse Spaces",
      href: "/app/spaces",
      icon: "🏛️",
      type: "action",
    };
  }

  // Couples member but incomplete couples profile
  if (profile.memberType === "couple" && !profile.relationshipStatus) {
    return {
      title: "Complete Your Couples Profile",
      description: "Tell us about your relationship",
      action: "Edit Profile",
      href: "/app/profile",
      icon: "🕊️",
      type: "action",
    };
  }

  // Partnered but no relationship interests
  if (
    (profile.memberType === "partnered-individual" || profile.memberType === "couple") &&
    (!profile.interests || !profile.interests.some((i) => ["Relationships", "Couples intimacy", "Communication and repair"].includes(i)))
  ) {
    return {
      title: "Explore Relationship Resources",
      description: "Strengthen your connection with your partner",
      action: "Learn More",
      href: appConfig.urls.couplesDiscoveryCall,
      icon: "💕",
      type: "external",
    };
  }

  // Interested in embodiment/sexuality
  if (profile.interests?.some((i) => ["Embodiment", "Spirituality", "Sexuality"].includes(i))) {
    return {
      title: "Feel More, Perform Less Coaching",
      description: "Reconnect with sensation, desire, and authenticity",
      action: "Explore Coaching",
      href: appConfig.urls.freeConsult,
      icon: "🧘",
      type: "external",
    };
  }

  // Interested in coaching support
  if (profile.interests?.includes("Coaching support")) {
    return {
      title: "Book a Free Consultation",
      description: "Explore how coaching can support your journey",
      action: "Schedule Call",
      href: appConfig.urls.freeConsult,
      icon: "🤝",
      type: "external",
    };
  }

  // Interested in workshops
  if (profile.interests?.includes("Workshops and retreats")) {
    return {
      title: "Upcoming Workshops & Retreats",
      description: "Deepen your practice with Trevor James",
      action: "View Events",
      href: "/app",
      icon: "🏕️",
      type: "action",
    };
  }

  // Default: explore more spaces
  return {
    title: "Keep Exploring",
    description: "Join more spaces to expand your practice",
    action: "Browse Spaces",
    href: "/app/spaces",
    icon: "🌟",
    type: "action",
  };
}

export function getTodaysPrompt(): string {
  // Simple date-based prompt selection (deterministic)
  const prompts = [
    "What kind of connection are you craving this week, and what part of you feels hesitant to ask for it?",
    "Pause for ten seconds. Where do you feel yourself most clearly in your body right now?",
    "What kind of non-sexual touch do you miss most, and what makes it hard to ask for?",
    "What would change if your sexuality was not something to manage, hide, or perform, but something to listen to?",
    "What part of you is asking to be brought back into the whole?",
    "When do you notice yourself analyzing intimacy instead of feeling it?",
    "Where do you perform competence when what you actually want is care?",
    "What is one small sign that you are becoming more honest with yourself?",
  ];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return prompts[dayOfYear % prompts.length];
}

export function getSuggestedSpace(): { name: string; icon: string; description: string } {
  const spaces = [
    {
      name: "The Commons",
      icon: "🏛️",
      description: "A welcoming space for introductions and general connection",
    },
    {
      name: "Start Here",
      icon: "👋",
      description: "Orientation and first reflections for new members",
    },
    {
      name: "Embodiment Practice",
      icon: "🧘",
      description: "Coming back to your body: breath, sensation, presence",
    },
    {
      name: "Touch & Affection",
      icon: "🤲",
      description: "Non-sexual touch and receiving affection",
    },
    {
      name: "Spirituality, Sexuality & Integration",
      icon: "✨",
      description: "Integrating spirit, sexuality, body, and emotion",
    },
  ];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return spaces[dayOfYear % spaces.length];
}
