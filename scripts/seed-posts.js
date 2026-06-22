const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8");
const envVars = {};
envFile.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use the authenticated user's ID for all posts
const userId = "192267b8-8cfa-43ae-84eb-b3440fd7366d";

const demoPosts = [
  // The Commons - General introductions and welcoming space
  {
    user_id: userId,
    author_name: "Marcus Johnson",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Week 2 of the guided rhythm and I'm already noticing shifts. The embodiment practices are helping me actually feel my nervous system settle instead of just knowing about it intellectually. Starting to understand what 'coming back to the body' really means.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Alex Rivera",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Coming to this space after years of solo work on myself. There's something different about doing this in community. The permission to be imperfect and still belong—that's new for me.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64800000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jordan Lee",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "The EROS method (Embody, Regulate, Own, Share) is becoming my framework for everything—not just intimacy. Applied it to a difficult conversation with my boss yesterday. Different outcome entirely.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 54000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Daniel Kim",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Month 1 focus: Embodiment and Presence. I'm noticing I was living entirely in my head—planning, analyzing, never actually *here*. The breath work is teaching me what present actually feels like in my body.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Chris Martinez",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "The difference between this space and other personal development communities: there's no performance, no 'healing journey' narrative. Just practical work on being more present, more honest, more integrated.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },

  // Start Here - Orientation and foundational understanding
  {
    user_id: userId,
    author_name: "David Chen",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "The orientation made something clear: this isn't therapy, it's not a fix, and I'm not broken. It's more like learning a language I should have learned years ago—the language of my own body and authentic connection.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Miguel Santos",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "First week assignment: notice where you're not present in your daily life. Wow. I'm not present at work, not present with my phone scrolling, not present with my partner sometimes. This is going to be a bigger journey than I expected.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 57600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Thomas Wright",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "The foundation work is teaching me the difference between connection (being present with someone) and intimacy (vulnerability and deep knowing). I've been confusing them. Makes sense now why my relationships felt empty even when busy.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 39600000).toISOString(),
  },

  // Embodiment - Presence and somatic practices
  {
    user_id: userId,
    author_name: "Kevin Anderson",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "The somatic work this month is pointing at something I've avoided: my body has wisdom I've been ignoring. There's information in sensation that my thinking mind can't access. Learning to listen instead of always directing.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "James Brown",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "Today during the grounding practice I felt something shift. A tightness in my chest that I've carried for years suddenly loosened. Not gone, but I can feel it's not permanent. That's different from before.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Robert Garcia",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "The practice of feeling my feet on the ground before responding to anything has changed how I show up. Less reactive, more grounded. My partner noticed. She said I seem more 'here' lately.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 48000000).toISOString(),
  },

  // Couples - Partnership and relational work
  {
    user_id: userId,
    author_name: "William Taylor",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "The touch protocol my partner and I practiced this week was awkward at first. But then something opened. We weren't performing closeness, we were actually *present* with each other. That's what was missing.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 82000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Edward Thompson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "We've been trying the repair framework when we conflict instead of just pushing through. Takes longer but we actually *resolve* things now instead of sweeping them under the rug. Our intimacy is deeper because of it.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 60000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Samuel Jackson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "Month 3 theme: Spirituality and Integration. We're exploring how our sexuality can be an expression of something deeper—not just physical, but actually spiritual. Changing how we approach intimacy entirely.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 42000000).toISOString(),
  },

  // Intimacy Patterns - Understanding relational patterns
  {
    user_id: userId,
    author_name: "Nathan Harris",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "The pattern I'm seeing: I approach quickly and intensely, then withdraw when things get real. It's kept me from sustained intimacy my whole life. Seeing it clearly now. First step to changing it.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 79000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Brandon Clark",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "I'm learning my 'armor'—the ways I protect myself that also keep people from getting close. It made sense when I developed it. Now it's just in the way. What does vulnerability actually look like for me?",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 61000000).toISOString(),
  },

  // Touch & Affection - Physical presence and non-sexual touch
  {
    user_id: userId,
    author_name: "Gregory Lee",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "Growing up, touch meant either punishment or obligation. Learning that affectionate touch—just present, no agenda—exists. My nervous system is slowly allowing it. This is foundational work.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 77000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Marcus White",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "The distinction between touch that demands something and touch that just meets you—that's everything. Learning to offer the latter instead of always reaching for contact that has an agenda underneath.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 55000000).toISOString(),
  },

  // Spirituality, Sexuality & Integration - Seeing sexuality as sacred
  {
    user_id: userId,
    author_name: "Andrew Mitchell",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "Month 5 topic: Spirituality and Integration. It's opening something in me—the possibility that sexuality and spirituality aren't in opposition. They're expressions of the same aliveness, the same presence.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jeremy Scott",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "Exploring sacred sexuality with my partner has given us a completely different framework. It's not about performance or technique anymore. It's about showing up as whole, awake, present human beings with each other.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 52000000).toISOString(),
  },

  // Dating, Desire & Vulnerability - Desire and authentic relating
  {
    user_id: userId,
    author_name: "Ryan Hall",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "The permission to actually want things—and say it—is revolutionary for me. I've spent years presenting as easy-going and adaptable. But I have desires. They're valid. That changes everything in dating.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 73000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Justin Martin",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "Being honest about what I'm looking for (even when it feels vulnerable or 'too much') has actually attracted people who are looking for the same thing. Honesty is a filter, not a barrier.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 50000000).toISOString(),
  },

  // Workshops & Retreats - Intensive practice and community
  {
    user_id: userId,
    author_name: "Derek Adams",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "The embodiment retreat accelerated my progress by months. Being with other men doing this work, being held in a container where vulnerability is the norm—that changes what's possible. Already considering the next one.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 71000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Kyle Nelson",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "The workshop on masculine presence shifted something foundational. I don't have to be bigger, louder, or more aggressive to be a man. I can be grounded, present, and calm—and that's powerful.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 45000000).toISOString(),
  },

  // Masculinity, Sex, and Sexuality - Redefining masculine sexuality
  {
    user_id: userId,
    author_name: "Justin Cole",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "Month 6 Integration: Redefining what healthy masculine sexuality looks like. Not performance. Not conquest. Not control. But presence, authenticity, and genuine desire to know and be known.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 69000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Aaron James",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "Learning that my vulnerability with a partner is actually what creates trust and depth. The old framework (strong, invulnerable, always knowing) was lonely. This is better. This is actually intimate.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 46000000).toISOString(),
  },
];

async function seedPosts() {
  try {
    console.log(`Seeding ${demoPosts.length} posts...`);

    const { data, error } = await supabase
      .from("posts")
      .insert(demoPosts)
      .select();

    if (error) {
      console.error("Error seeding posts:", error);
      process.exit(1);
    }

    console.log(`Successfully seeded ${data.length} posts`);
    console.log("Posts added to spaces:");
    console.log("- The Commons: 5 posts");
    console.log("- Start Here: 3 posts");
    console.log("- Embodiment: 3 posts");
    console.log("- Couples: 3 posts");
    console.log("- Intimacy Patterns: 2 posts");
    console.log("- Touch & Affection: 2 posts");
    console.log("- Spirituality, Sexuality & Integration: 2 posts");
    console.log("- Dating, Desire & Vulnerability: 2 posts");
    console.log("- Workshops & Retreats: 2 posts");
    console.log("- Masculinity, Sex, and Sexuality: 2 posts");
    process.exit(0);
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

seedPosts();
