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
  // The Commons - Raw vulnerability and honesty
  {
    user_id: userId,
    author_name: "Marcus Johnson",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "I broke down in the shower this morning. Just... let it out. I don't even know why exactly, but I've been holding something for so long that the walls are starting to crack. Feels terrifying and relieving at the same time. I don't have to have it all figured out.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Alex Rivera",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "I've been alone my whole adult life. And I'm starting to wonder if that's because I'm afraid of being seen. Like, what if someone actually knows me? What if I can't hide anymore? That scares me more than being alone.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64800000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jordan Lee",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Had a moment last night where I realized how much I ask for permission before doing anything. Permission I'll never get. From who? My dad? Society? I don't even know. But I'm tired of waiting.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 54000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Daniel Kim",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "My therapist asked me what I actually want. Not what I think I should want. And I realized... I don't know. I've been living someone else's life for so long I forgot what my own desires even look like.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Chris Martinez",
    author_pronouns: "he/him",
    space_id: "commons",
    content:
      "Getting angry today. Real, raw, unfiltered anger. Been pushing it down for decades. My hands are shaking as I write this. But I'm letting it be here instead of pretending I'm fine.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },

  // Start Here - Uncertainty and beginning
  {
    user_id: userId,
    author_name: "David Chen",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "Honestly? I'm not sure what I'm doing here. Part of me came because something's missing and I don't know what it is. Another part is scared I'm going to find out what it is and it's going to hurt. But I'm showing up anyway.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Miguel Santos",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "I don't know if I'm doing this right. I keep waiting for someone to tell me I'm doing it wrong. But nobody's here to judge me for once. That's weird. And somehow scarier than criticism.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 57600000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Thomas Wright",
    author_pronouns: "he/him",
    space_id: "start-here",
    content:
      "I've spent so long performing that I don't know who I actually am underneath the mask. And I'm realizing that's the whole point of being here. To find out. Terrifying.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 39600000).toISOString(),
  },

  // Embodiment - Feeling and sensation
  {
    user_id: userId,
    author_name: "Kevin Anderson",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "I tried to feel my feet on the ground like they said. And I just... cried. For no reason. My body remembered something my mind forgot. I'm sitting with this and I don't know what it means yet but it feels important.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 86000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "James Brown",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "My chest has been tight for so long I forgot what it feels like to breathe freely. Today I felt one moment where it opened. Just for a second. And then the fear came back and it closed. But I know it's possible now.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 64000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Robert Garcia",
    author_pronouns: "he/him",
    space_id: "embodiment",
    content:
      "I realized my whole life I've been running from my body. Pushing, striving, achieving. Never just... being. I'm learning that being is harder than doing. And I don't know how to be still.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 48000000).toISOString(),
  },

  // Couples - Intimacy and struggle
  {
    user_id: userId,
    author_name: "William Taylor",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "My wife asked me to just be with her. Not fix, not solve, not change the conversation. Just... be present. I failed. I tried to make her feel better. She just wanted me to feel WITH her. I'm learning the difference.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 82000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Edward Thompson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "We had our worst fight in years and something shifted. Because we didn't leave. We stayed angry and hurt and PRESENT with each other instead of shutting down. It was awful and beautiful at the same time.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 60000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Samuel Jackson",
    author_pronouns: "he/him",
    space_id: "couples",
    content:
      "I just realized I don't actually know my partner. Not really. We've been together 8 years and I've been performing 'good husband' the whole time. Now I'm wondering who she actually is too, underneath her mask. We're starting over in a way.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 42000000).toISOString(),
  },

  // Intimacy Patterns - Recognition and honesty
  {
    user_id: userId,
    author_name: "Nathan Harris",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "I see the pattern now. I'm the guy who comes on strong, loves intensely, then... ghosts. Every time. And I finally see how that's MY wound playing out on other people. Jesus. I owe some apologies.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 79000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Brandon Clark",
    author_pronouns: "he/him",
    space_id: "intimacy-patterns",
    content:
      "The walls I built to protect myself are now the reason I'm alone. I can see that. But I also can't just take them down. They kept me safe for so long. How do I learn that I'm safe without them?",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 61000000).toISOString(),
  },

  // Touch & Affection - Permission and healing
  {
    user_id: userId,
    author_name: "Gregory Lee",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "My friend hugged me longer than usual and I froze. My whole body tensed up. I wanted to pull away. But I didn't. And something in me cracked open. Touch feels like danger to me. I'm learning it doesn't have to be.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 77000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Marcus White",
    author_pronouns: "he/him",
    space_id: "touch-affection",
    content:
      "I realized every time I touch someone, I'm trying to get something from them. Comfort, validation, reassurance. I'm never just... giving. Just being present. That's a lot to work on. But at least I see it now.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 55000000).toISOString(),
  },

  // Spirituality, Sexuality & Integration - Wholeness
  {
    user_id: userId,
    author_name: "Andrew Mitchell",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "I've split myself in half my whole life. The spiritual guy and the sexual guy. They were enemies. I'm starting to wonder what happens if they become one person. What if I'm whole?",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 75000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Jeremy Scott",
    author_pronouns: "he/him",
    space_id: "spirituality-sexuality",
    content:
      "I had the most intimate experience with my partner last night and I cried afterwards. Not sad. Just... present with everything. The vulnerability, the joy, the tenderness. All of it at once. I didn't know that was possible.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 52000000).toISOString(),
  },

  // Dating, Desire & Vulnerability - Wanting and truth
  {
    user_id: userId,
    author_name: "Ryan Hall",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "I want to be pursued. I want someone to pursue ME. But I'm terrified to say that because it sounds needy or weak. But I'm saying it anyway. I want to feel wanted.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 73000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Justin Martin",
    author_pronouns: "he/him",
    space_id: "dating-desire",
    content:
      "I was honest on a date about what I'm looking for. It was terrifying. She left. And somehow that's better than her staying and me pretending to be someone I'm not. At least I was real.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 50000000).toISOString(),
  },

  // Workshops & Retreats - Being held
  {
    user_id: userId,
    author_name: "Derek Adams",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "I broke down in front of 20 strangers. And they didn't leave. They just held space. I've never felt anything like that. Like I could fall apart and still be worthy of being here. Still be okay.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 71000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Kyle Nelson",
    author_pronouns: "he/him",
    space_id: "workshops",
    content:
      "The men at the retreat saw me. Not the version I present. ME. And they didn't judge me or try to fix me. They just said yeah, I see you, you belong here. I'm still sitting with what that means.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 45000000).toISOString(),
  },

  // Masculinity, Sex, and Sexuality - Redefining strength
  {
    user_id: userId,
    author_name: "Justin Cole",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "I'm realizing everything I learned about being a man made me lonely. Strong. Invulnerable. Powerful. But alone. I'm wondering what it would feel like to be strong AND vulnerable. Powerful AND open.",
    is_prompt_response: false,
    created_at: new Date(Date.now() - 69000000).toISOString(),
  },
  {
    user_id: userId,
    author_name: "Aaron James",
    author_pronouns: "he/him",
    space_id: "masculinity-sex-sexuality",
    content:
      "My whole sexuality has been about chasing, conquering, performing. What does it feel like to just be with someone? To be still? To be seen and not performing? I'm scared to find out. But I'm trying.",
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
    console.log("Posts added to all spaces with raw, authentic vulnerability");
    process.exit(0);
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

seedPosts();
