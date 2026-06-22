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
  // The Commons
  {
    user_id: userId,
    author_name: "Marcus Johnson",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "I'm new here and honestly a bit nervous. I've spent a lot of years in my head, and I'm trying to come back to my body and practice being more present. Thanks for creating this space.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Alex Rivera",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "There's something powerful about being in a space where vulnerability is not just allowed but celebrated. After years of hiding, this feels like coming home.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64800000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jordan Lee",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "I came here thinking I'd find answers, but what I'm finding is permission to ask better questions. Questions about what I actually want, not what I think I should want.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 54000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Daniel Kim",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Today I noticed I could actually feel my breath without analyzing it. That might sound small, but for someone who lives in their head, it's huge. Grateful for this practice.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Chris Martinez",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Hearing others share their struggles with embodiment and presence has been so validating. I'm not alone in this. We're all learning together.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },

  // Start Here
  {
    user_id: userId,
    author_name: "David Chen",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "This is my first time in a space like this. The orientation helped me understand what to expect, and I feel welcomed. Looking forward to exploring.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Miguel Santos",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "I appreciate how clear the expectations are here. No performance, no pressure. Just authentic exploration. That's rare and valuable.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 57600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Thomas Wright",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "Starting to understand the difference between connection and intimacy. This space is helping me see what I've been confusing.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 39600000).toISOString(),
  },

  // Embodiment
  {
    user_id: userId,
    author_name: "Kevin Anderson",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "I used to be completely disconnected from my body. Practicing presence here is showing me how much I've been missing. It's subtle but profound.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "James Brown",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "Noticing sensations without judgment is harder than it sounds. But when I get it, even for a moment, it's like coming alive.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Robert Garcia",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "My breathing has become my anchor. Some days I can feel the whole practice of being present just through paying attention to my breath.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 48000000).toISOString(),
  },

  // Couples
  {
    user_id: userId,
    author_name: "William Taylor",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "My partner and I have been practicing some of the touch exercises here. It's bringing us closer in ways we didn't expect.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 82000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Edward Thompson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "Vulnerability with my partner used to feel risky. This space is teaching us that honesty is actually what creates safety.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 60000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Samuel Jackson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "We're learning that intimacy isn't about performance. It's about presence and permission. That's changed everything for us.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 42000000).toISOString(),
  },

  // Intimacy Patterns
  {
    user_id: userId,
    author_name: "Nathan Harris",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "I'm noticing patterns in how I approach intimacy that I've never been aware of before. This space is helping me see myself more clearly.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 79000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Brandon Clark",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "Understanding my patterns has given me more choice. I don't have to repeat what I've always done.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 61000000).toISOString(),
  },

  // Touch & Affection
  {
    user_id: userId,
    author_name: "Gregory Lee",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "I grew up in a family where touch wasn't common. Learning that it's safe and nourishing has been transformative.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 77000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Marcus White",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "The difference between touch that's demanding and touch that's nurturing has become clear to me. I want more of the latter.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 55000000).toISOString(),
  },

  // Spirituality, Sexuality & Integration
  {
    user_id: userId,
    author_name: "Andrew Mitchell",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "For a long time I thought sexuality and spirituality were separate. This space is showing me they can be integrated.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jeremy Scott",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "Exploring sexuality as a spiritual practice has deepened my understanding of both. They inform each other.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 52000000).toISOString(),
  },

  // Dating, Desire & Vulnerability
  {
    user_id: userId,
    author_name: "Ryan Hall",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "Acknowledging what I actually desire instead of what I think I should want has changed my dating life completely.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 73000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Justin Martin",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "Being vulnerable about what I'm looking for has attracted people who actually match what I need. It works.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 50000000).toISOString(),
  },

  // Workshops & Retreats
  {
    user_id: userId,
    author_name: "Derek Adams",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "The retreat I just attended deepened my understanding of embodiment in ways I couldn't have imagined. Grateful for this community.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 71000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Kyle Nelson",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "The workshop on masculine presence was eye-opening. I'm bringing what I learned back to my daily life.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 45000000).toISOString(),
  },

  // Masculinity, Sex, and Sexuality
  {
    user_id: userId,
    author_name: "Justin Cole",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "Redefining what masculinity means to me outside of performance and control has been liberating. There's so much more freedom here.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 69000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Aaron James",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "Learning that vulnerability is a strength, not a weakness, has changed how I show up in intimate moments.",
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
