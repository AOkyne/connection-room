import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";

interface SubstackItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  guid: string;
}

// Simple RSS parser
function parseRSSFeed(xml: string): SubstackItem[] {
  const items: SubstackItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
    const descriptionMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const authorMatch = itemContent.match(/<author>([\s\S]*?)<\/author>/);
    const guidMatch = itemContent.match(/<guid>([\s\S]*?)<\/guid>/);

    if (titleMatch && linkMatch) {
      // Extract and clean description (subtitle)
      let description = "";
      if (descriptionMatch) {
        description = stripCDATA(decodeHtml(descriptionMatch[1]))
          .replace(/<[^>]*>/g, "") // Remove any HTML tags
          .trim();
      }

      items.push({
        title: stripCDATA(decodeHtml(titleMatch[1])),
        link: linkMatch[1],
        description: description,
        pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        author: authorMatch ? stripCDATA(decodeHtml(authorMatch[1])) : "Trevor James",
        guid: guidMatch ? guidMatch[1] : linkMatch[1],
      });
    }
  }

  return items;
}

function decodeHtml(html: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
  };
  return html.replace(/&[a-z]+;/g, (entity) => entities[entity] || entity);
}

function stripCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function GET(request: NextRequest) {
  try {
    // Accept either a trusted internal call from the cron route (CRON_SECRET)
    // or a real signed-in admin (for manual triggering from the dashboard).
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      const auth = await requireAdmin(request);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    // Initialize Supabase with service role (for server-side operations)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Substack RSS feed
    const response = await fetch("https://trevorjamesla.substack.com/feed");
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Substack feed" },
        { status: 500 }
      );
    }

    const xml = await response.text();
    let items = parseRSSFeed(xml);

    // Check for pagination and fetch additional pages
    const nextPageMatch = xml.match(/<link rel="next" href="([^"]+)"/);
    let nextPageUrl = nextPageMatch ? nextPageMatch[1] : null;
    let pageCount = 1;
    const maxPages = 10; // Fetch up to 10 pages (200+ articles)

    while (nextPageUrl && pageCount < maxPages) {
      console.log(`Fetching page ${pageCount + 1} from:`, nextPageUrl);
      try {
        const pageResponse = await fetch(nextPageUrl);
        if (!pageResponse.ok) break;

        const pageXml = await pageResponse.text();
        const pageItems = parseRSSFeed(pageXml);
        items = [...items, ...pageItems];
        console.log(`Page ${pageCount + 1} fetched:`, pageItems.length, "articles");

        // Look for next page link
        const pageNextMatch = pageXml.match(/<link rel="next" href="([^"]+)"/);
        nextPageUrl = pageNextMatch ? pageNextMatch[1] : null;
        pageCount++;
      } catch (err) {
        console.warn("Error fetching pagination page:", err);
        break;
      }
    }

    console.log(`Total articles fetched: ${items.length} across ${pageCount} pages`);

    // Store articles in Supabase, avoiding duplicates
    let syncedCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        console.log("Processing article:", item.title);

        // Check if article already exists
        const { data: existing, error: checkError } = await supabase
          .from("articles")
          .select("id")
          .eq("url", item.link)
          .maybeSingle();

        console.log("Existing check:", { existing, checkError });

        if (!existing) {
          // Insert new article
          const { data, error } = await supabase.from("articles").insert({
            title: item.title,
            excerpt: item.description.substring(0, 500),
            content: item.description,
            url: item.link,
            author: item.author,
            published_at: new Date(item.pubDate),
            created_at: new Date(),
            updated_at: new Date(),
          }).select();

          console.log("Insert result:", { data, error });

          if (!error) {
            syncedCount++;
            console.log("✓ Synced article:", item.title);
          } else {
            console.warn("✗ Error inserting article:", item.title, error);
            errors.push({ title: item.title, error: error.message });
          }
        } else {
          console.log("Article already exists:", item.title);
        }
      } catch (err) {
        console.warn("Exception processing article:", item.title, err);
        errors.push({ title: item.title, error: String(err) });
      }
    }

    return NextResponse.json({
      message: "Sync complete",
      total: items.length,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing Substack feed:", error);
    return NextResponse.json(
      { error: "Failed to sync Substack feed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST also triggers sync (for manual triggering)
  return GET(request);
}
