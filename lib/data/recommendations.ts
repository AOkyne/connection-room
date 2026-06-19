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
    "What kind of connection would feel good today?",
    "What is one thing you wish felt easier to say out loud?",
    "Where could you use a little more honesty with yourself?",
    "What is something your body has been trying to tell you lately?",
    "What kind of support would feel welcome right now?",
    "What is one small way you could be kinder to yourself today?",
    "Where have you been performing 'fine' when something more honest is true?",
    "What kind of touch, affection, or closeness do you miss?",
    "What is one thing you want to stop pretending does not matter?",
    "Where do you feel most like yourself these days?",
    "What is one place in your life where you want to feel less guarded?",
    "What kind of conversation are you craving?",
    "What is something you are learning about how you connect with others?",
    "Where do you tend to rush when slowing down might help?",
    "What is one small truth you can admit today?",
    "What helps you feel safe enough to open up?",
    "What is something you often give to others but struggle to receive?",
    "Where are you craving more ease?",
    "What is one thing you want to ask for more directly?",
    "What part of you could use a little more patience?",
    "What is one way you protect yourself when connection gets real?",
    "What kind of attention feels nourishing to you?",
    "What is something you are ready to approach with more curiosity and less shame?",
    "Where do you notice yourself overthinking instead of feeling?",
    "What helps you come back to your body?",
    "What kind of intimacy feels easiest for you right now?",
    "What kind of intimacy feels more challenging?",
    "What is one thing you are trying to understand about yourself?",
    "Where could you let something be simple today?",
    "What is something you want more of in your relationships?",
    "What is one way you have grown in how you relate to others?",
    "What is something you are still learning how to receive?",
    "What kind of closeness feels inviting, but a little scary?",
    "What is one small boundary that would help you feel more relaxed?",
    "What is one place where you want to stop abandoning yourself?",
    "What kind of affection feels meaningful to you?",
    "What is one thing you appreciate about how you love or care for others?",
    "Where are you learning to be more honest without being harsh?",
    "What is something you wish people understood about you?",
    "What does 'connection without pressure' mean to you today?",
    "What is one thing you would like to feel more comfortable asking for?",
    "Where are you noticing tenderness in yourself?",
    "What is one small way you could practice being more present?",
    "What kind of space do you need today: quiet, conversation, touch, play, clarity, or rest?",
    "What is one thing you are carrying that you do not want to carry alone?",
    "Where have you been braver than you give yourself credit for?",
    "What kind of repair, with yourself or someone else, feels possible?",
    "What is one thing that helps you feel connected to your own desire?",
    "What is something you want to explore without judging yourself?",
    "What would feeling more and performing less look like today?",
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
