import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

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
      items.push({
        title: decodeHtml(titleMatch[1]),
        link: linkMatch[1],
        description: descriptionMatch ? decodeHtml(stripHtml(descriptionMatch[1])) : "",
        pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        author: authorMatch ? decodeHtml(authorMatch[1]) : "Trevor James",
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function GET(request: NextRequest) {
  try {
    // Fetch Substack RSS feed
    const response = await fetch("https://trevorjamesla.substack.com/feed");
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Substack feed" },
        { status: 500 }
      );
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml);

    if (!supabase) {
      return NextResponse.json(
        { message: "Supabase not available, synced locally", count: items.length },
        { status: 200 }
      );
    }

    // Store articles in Supabase, avoiding duplicates
    let syncedCount = 0;
    for (const item of items) {
      // Check if article already exists
      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("url", item.link)
        .single();

      if (!existing) {
        // Insert new article
        const { error } = await supabase.from("articles").insert({
          title: item.title,
          excerpt: item.description.substring(0, 500),
          content: item.description,
          url: item.link,
          author: item.author,
          published_at: new Date(item.pubDate),
          created_at: new Date(),
          updated_at: new Date(),
        });

        if (!error) {
          syncedCount++;
        } else {
          console.warn("Error inserting article:", error);
        }
      }
    }

    return NextResponse.json({
      message: "Sync complete",
      total: items.length,
      synced: syncedCount,
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
