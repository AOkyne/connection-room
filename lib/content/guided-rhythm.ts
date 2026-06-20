import { Month, PairingPromptBank } from "@/lib/types/guided-rhythm";

export const guidedRhythm: Month[] = [
  {
    monthNumber: 1,
    title: "Finding Your Rhythm",
    monthlyTheme:
      "You've arrived. Now you begin to notice what helps you return. This month is about building a simple rhythm of reflection, connection, and participation without pressure.",
    monthlyReflection:
      "What kind of rhythm would help this community feel useful, nourishing, and realistic for you?",
    trevorNote:
      "You do not have to become a different person to belong here. Start by noticing what helps you return: to your body, to honesty, to connection, and to the parts of yourself that have been waiting for a little more room.",
    ritual: {
      title: "Choose Your Rhythm",
      description: "How do you want to participate this month?",
      options: [
        "Quiet observer",
        "Weekly prompt responder",
        "Pairing participant",
        "Community commenter",
        "Workshop/event explorer",
      ],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Small Honesty",
        dashboardPrompt: "What is one small truth you can admit today?",
        privateReflection:
          "Where do you tend to edit yourself before anyone else has even responded?",
        communityInvitation:
          "Share one small honest thing you are practicing naming more clearly.",
        pairingPrompt:
          "What is one place where you are trying to be more honest with yourself or others?",
      },
      {
        weekNumber: 2,
        title: "Ease and Belonging",
        dashboardPrompt: "Where do you feel most at ease being yourself?",
        privateReflection:
          "What helps you feel like you do not have to perform to belong?",
        communityInvitation:
          "Share a moment when you felt accepted without having to prove anything.",
        pairingPrompt: "What kind of connection helps you relax?",
      },
      {
        weekNumber: 3,
        title: "Asking and Receiving",
        dashboardPrompt:
          "What is something you would like to get better at receiving?",
        privateReflection:
          "What do you often give easily but receive awkwardly?",
        communityInvitation:
          "Share something you are learning about asking for support, attention, touch, care, or clarity.",
        pairingPrompt:
          "What makes it easier or harder for you to ask for what you need?",
      },
      {
        weekNumber: 4,
        title: "What Keeps You Away",
        dashboardPrompt: "What tends to pull you away from connection?",
        privateReflection:
          "When you withdraw, what are you usually protecting?",
        communityInvitation:
          "Share one way you create distance, even when part of you wants closeness.",
        pairingPrompt:
          "What do you notice in yourself when connection starts to feel real?",
      },
    ],
    integration: {
      prompt:
        "Looking back over this month, what did you learn about how you enter, avoid, or return to connection?",
      suggestedNextStep: "Choose one space you want to keep returning to.",
      nextSteps: [
        { label: "Revisit your quiz result", href: "/app/quiz" },
        { label: "Join a connection pairing", href: "/app/pairing" },
        { label: "Attend an event", href: "/app/events" },
        { label: "Explore a workshop or retreat", href: "/app/workshops" },
        { label: "Book a consultation", href: "https://trevorjamesla.as.me/free-consult" },
        { label: "Return to The Seven Doors", href: "/app/journey" },
      ],
    },
  },
  {
    monthNumber: 2,
    title: "Touch, Affection, and the Body",
    monthlyTheme:
      "Connection is not only something we think about. It is something we feel, avoid, crave, tense around, and carry in the body. This month explores touch, affection, embodiment, and the quiet ways the body speaks.",
    monthlyReflection:
      "What is your current relationship with touch, affection, and being physically present with yourself or others?",
    trevorNote:
      "Touch can be simple, and it can also carry history. This month is not about forcing openness. It is about listening to the body with more patience and less judgment.",
    ritual: {
      title: "Body Check-In",
      description: "A simple weekly practice of listening to your body.",
      options: ["What do I notice?", "What do I need?", "What would help me soften?"],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Noticing the Body",
        dashboardPrompt: "What is your body trying to tell you today?",
        privateReflection:
          "Where do you tend to hold tension when you feel vulnerable?",
        communityInvitation:
          "Share one thing you are noticing about your body lately, without needing to explain or fix it.",
        pairingPrompt: "When do you feel most present in your body?",
      },
      {
        weekNumber: 2,
        title: "Affection Without Pressure",
        dashboardPrompt: "What kind of affection feels nourishing to you?",
        privateReflection:
          "What makes affection feel safe, and what makes it feel complicated?",
        communityInvitation:
          "Share a kind of affection or closeness you miss that does not have to become sexual.",
        pairingPrompt:
          "What helps touch or affection feel relaxed instead of loaded?",
      },
      {
        weekNumber: 3,
        title: "Asking for Touch",
        dashboardPrompt:
          "What kind of touch or closeness do you wish felt easier to ask for?",
        privateReflection:
          "What story do you tell yourself when you want touch but hesitate to ask?",
        communityInvitation:
          "Share what makes asking for affection feel vulnerable.",
        pairingPrompt:
          "What is one way you might ask for closeness more directly and kindly?",
      },
      {
        weekNumber: 4,
        title: "Receiving Care",
        dashboardPrompt: "What helps you let care in?",
        privateReflection:
          "What happens inside you when someone offers attention, care, or tenderness?",
        communityInvitation:
          "Share something you are learning about receiving without deflecting.",
        pairingPrompt:
          "What kind of care do you tend to trust, and what kind feels harder to receive?",
      },
    ],
    integration: {
      prompt:
        "What did you notice this month about touch, affection, embodiment, or your capacity to receive?",
      suggestedNextStep:
        "Visit the Touch & Affection or Embodiment Practice space and respond to one prompt.",
    },
  },
  {
    monthNumber: 3,
    title: "Desire, Sexuality, and Shame-Free Honesty",
    monthlyTheme:
      "Desire becomes easier to understand when we stop treating it as a problem to solve or a performance to manage. This month explores sexuality, honesty, shame, curiosity, and self-acceptance.",
    monthlyReflection:
      "What would change if you approached your desire with more curiosity and less judgment?",
    trevorNote:
      "Desire does not always arrive neatly. Sometimes it brings longing, confusion, curiosity, memory, shame, tenderness, and surprise. The invitation is not to perform certainty. The invitation is to listen more honestly.",
    ritual: {
      title: "Shame-Free Question",
      description:
        "Privately or publicly name one question you are carrying about desire, sexuality, or intimacy.",
      options: [
        "Write it privately",
        "Share it in community",
        "Discuss it in a pairing",
      ],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Naming Desire",
        dashboardPrompt: "What is something you are learning about your desire?",
        privateReflection:
          "Where do you hint at what you want instead of naming it?",
        communityInvitation:
          "Share one thing that makes desire feel easier or harder to talk about.",
        pairingPrompt: "What helps desire feel honest instead of pressured?",
      },
      {
        weekNumber: 2,
        title: "Shame and Self-Acceptance",
        dashboardPrompt: "What part of yourself could use less judgment today?",
        privateReflection:
          "What is something you were taught to feel embarrassed about that you are ready to meet with more kindness?",
        communityInvitation:
          "Share one place where you are practicing less shame and more curiosity.",
        pairingPrompt:
          "What helps you talk about tender or complicated things without shutting down?",
      },
      {
        weekNumber: 3,
        title: "Sexuality and Integration",
        dashboardPrompt:
          "What part of your sexuality wants to feel more integrated into your life?",
        privateReflection: "Where do you compartmentalize parts of yourself?",
        communityInvitation:
          "Share what integration means to you in a practical, everyday way.",
        pairingPrompt:
          "What does it mean to bring more honesty and care to your sexuality?",
      },
      {
        weekNumber: 4,
        title: "Desire Without Performance",
        dashboardPrompt:
          "Where do you perform confidence when something more honest is true?",
        privateReflection:
          "What happens when you stop trying to be impressive and simply notice what you feel?",
        communityInvitation:
          "Share one way performance shows up in intimacy, dating, sex, or relationships.",
        pairingPrompt:
          'What would "feel more, perform less" look like for you this week?',
      },
    ],
    integration: {
      prompt:
        "What did you learn this month about desire, shame, sexuality, or performance?",
      suggestedNextStep:
        "Take or revisit the What's Your Intimacy Pattern quiz, then reflect on what feels accurate now.",
    },
  },
  {
    monthNumber: 4,
    title: "Relationships, Repair, and Emotional Courage",
    monthlyTheme:
      "Connection does not require perfection. It asks for presence, honesty, repair, and the courage to stay in the conversation. This month supports both individuals and couples in practicing relational clarity.",
    monthlyReflection:
      "What kind of repair or relational honesty feels important in your life right now?",
    trevorNote:
      "Repair does not always require a grand speech. Sometimes it begins with 'I see how I pulled away,' or 'I want to try that conversation again.' Small honest returns matter.",
    ritual: {
      title: "One Repair",
      description: "Choose one small repair with yourself or someone else.",
      options: [
        "With yourself",
        "With a partner",
        "With a friend",
        "In a family relationship",
      ],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Communication Without Performance",
        dashboardPrompt: "What is one thing you wish felt easier to say?",
        privateReflection:
          "What do you usually do when you are afraid of being misunderstood?",
        communityInvitation:
          "Share a communication pattern you are trying to change.",
        pairingPrompt:
          "What helps you speak honestly without becoming harsh or guarded?",
      },
      {
        weekNumber: 2,
        title: "Conflict and Protection",
        dashboardPrompt: "How do you protect yourself when you feel hurt?",
        privateReflection:
          "What does your defensiveness usually need underneath the surface?",
        communityInvitation:
          "Share one way you tend to react when you feel unseen, criticized, or overwhelmed.",
        pairingPrompt:
          "What helps you stay present when a conversation gets uncomfortable?",
      },
      {
        weekNumber: 3,
        title: "Repair Without Drama",
        dashboardPrompt: "What small repair feels possible right now?",
        privateReflection:
          "Where might a simple acknowledgment go further than a long explanation?",
        communityInvitation:
          "Share what repair looks like for you when it is gentle and real.",
        pairingPrompt:
          "What makes it easier for you to apologize, reconnect, or try again?",
      },
      {
        weekNumber: 4,
        title: "Closeness in Relationship",
        dashboardPrompt: "What kind of closeness are you wanting more of?",
        privateReflection:
          "Where do you want more emotional, physical, or spiritual closeness in your relationships?",
        communityInvitation:
          "Share what closeness means to you at this stage of your life.",
        pairingPrompt:
          "What is one small way you and your partner could reach for each other this week without pressure?",
      },
    ],
    integration: {
      prompt:
        "What did you notice this month about communication, conflict, repair, or closeness?",
      suggestedNextStep:
        "If you are partnered, visit Couples, Closeness & Repair. If you are single, reflect on how repair shows up in friendship, dating, family, or self-relationship.",
    },
  },
  {
    monthNumber: 5,
    title: "Spirituality, Meaning, and Integration",
    monthlyTheme:
      "Spirituality does not have to be abstract. It can show up in how we listen, touch, speak, desire, repair, grieve, rest, and relate. This month explores meaning, wholeness, and the places where different parts of life begin to come together.",
    monthlyReflection:
      "What parts of your life are asking to be brought into better relationship with each other?",
    trevorNote:
      "Spirituality does not have to float above the body. Sometimes it is found in breath, touch, desire, grief, laughter, apology, rest, and the willingness to let more of yourself belong.",
    ritual: {
      title: "Integration Inventory",
      description:
        "Ask: What parts of me have I kept separate, and what wants to be brought into the same life?",
      options: [
        "Work and intimacy",
        "Sexuality and spirituality",
        "Strength and tenderness",
        "Ambition and rest",
      ],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Meaning and Connection",
        dashboardPrompt: "What has been feeling meaningful to you lately?",
        privateReflection:
          "Where do you feel most connected to something larger than yourself?",
        communityInvitation:
          "Share a moment that reminded you you are not just going through the motions.",
        pairingPrompt:
          "What gives your life a sense of depth or meaning these days?",
      },
      {
        weekNumber: 2,
        title: "Spirituality Without Performance",
        dashboardPrompt: "What helps you feel grounded?",
        privateReflection:
          "Where do you perform being okay, evolved, spiritual, or 'above it' when something human is happening?",
        communityInvitation:
          "Share a simple practice that helps you return to yourself.",
        pairingPrompt:
          "What does spirituality look like when it is honest and ordinary?",
      },
      {
        weekNumber: 3,
        title: "Wholeness",
        dashboardPrompt: "What part of you wants more room to exist?",
        privateReflection:
          "Which part of yourself have you been trying to keep separate, hidden, or managed?",
        communityInvitation:
          "Share one area of life where you are practicing more integration.",
        pairingPrompt:
          "What does feeling whole mean to you, even imperfectly?",
      },
      {
        weekNumber: 4,
        title: "Reverence and Responsibility",
        dashboardPrompt: "What deserves more care in your life right now?",
        privateReflection:
          "Where are you being invited to treat yourself, your body, your desire, or your relationships with more respect?",
        communityInvitation:
          "Share something you are learning to approach with more reverence and responsibility.",
        pairingPrompt:
          "What is one thing you want to care for more intentionally?",
      },
    ],
    integration: {
      prompt:
        "What did you learn this month about meaning, spirituality, integration, or wholeness?",
      suggestedNextStep:
        "Visit Spirituality, Sexuality & Integration and respond to one prompt that feels approachable.",
    },
  },
  {
    monthNumber: 6,
    title: "Belonging, Practice, and What Comes Next",
    monthlyTheme:
      "Connection grows through repetition, honesty, care, and return. This month is about belonging, community, continued practice, and choosing what you want to cultivate next.",
    monthlyReflection:
      "How has your relationship with connection changed since you arrived here?",
    trevorNote:
      "Belonging is not built all at once. It grows through return: one honest post, one thoughtful comment, one quiet reflection, one moment of letting yourself be seen a little more clearly.",
    ritual: {
      title: "Intention Renewal",
      description: "Choose a new monthly intention for your continued journey.",
      options: [
        "Community engagement",
        "Personal practice",
        "Relationship deepening",
        "Creative expression",
      ],
    },
    weeks: [
      {
        weekNumber: 1,
        title: "Belonging",
        dashboardPrompt: "Where do you feel a sense of belonging?",
        privateReflection: "What helps you believe there is room for you?",
        communityInvitation:
          "Share a moment when you felt welcomed, included, or less alone.",
        pairingPrompt:
          "What makes a community feel safe enough for you to participate?",
      },
      {
        weekNumber: 2,
        title: "Friendship and Community",
        dashboardPrompt: "What kind of friendship are you wanting more of?",
        privateReflection: "How has friendship changed for you over time?",
        communityInvitation:
          "Share what meaningful friendship looks like to you now.",
        pairingPrompt: "What do you appreciate most in a friend?",
      },
      {
        weekNumber: 3,
        title: "Continuing the Practice",
        dashboardPrompt: "What is one practice you want to keep returning to?",
        privateReflection: "What has been most useful to you here so far?",
        communityInvitation:
          "Share one thing from The Connection Room that you want to keep practicing in daily life.",
        pairingPrompt:
          "What helps you keep showing up without turning growth into pressure?",
      },
      {
        weekNumber: 4,
        title: "Choosing the Next Step",
        dashboardPrompt:
          "What is one thing you want more of in the next season of your life?",
        privateReflection:
          "What kind of support, structure, or community would help you keep growing?",
        communityInvitation: "Share your intention for the next month.",
        pairingPrompt: "What kind of connection feels worth moving toward now?",
      },
    ],
    integration: {
      prompt:
        "Looking back over the last six months, what has shifted in how you understand yourself, your body, your desire, your relationships, or your need for connection?",
      suggestedNextStep:
        "Choose one: Revisit your quiz result, Join a connection pairing, Attend an event, Explore a workshop or retreat, Book a consultation, or Return to The Seven Doors and notice what feels different now.",
    },
  },
];

export const pairingPromptBank: PairingPromptBank[] = [
  {
    id: "pairing-1",
    prompt: "What kind of connection are you practicing this month?",
  },
  {
    id: "pairing-2",
    prompt: "What helps you feel safe enough to be honest?",
  },
  {
    id: "pairing-3",
    prompt:
      "What is one thing you are learning about asking, receiving, or being seen?",
  },
  {
    id: "pairing-4",
    prompt: "Where do you tend to protect yourself when connection gets real?",
  },
  {
    id: "pairing-5",
    prompt: "What kind of touch, affection, or attention feels meaningful to you?",
  },
  {
    id: "pairing-6",
    prompt: "What is one thing you are approaching with more curiosity and less shame?",
  },
  {
    id: "pairing-7",
    prompt: "What helps you come back to your body?",
  },
  {
    id: "pairing-8",
    prompt: "What does repair look like for you?",
  },
  {
    id: "pairing-9",
    prompt: "What kind of belonging are you looking for?",
  },
  {
    id: "pairing-10",
    prompt: "What is one intention you want to carry into the next month?",
  },
];
