"use client";

import { WeeklyNote } from "@/lib/data/daily-companion";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

interface WeeklyTrevorNoteCardProps {
  note: WeeklyNote | null;
}

export function WeeklyTrevorNoteCard({ note }: WeeklyTrevorNoteCardProps) {
  if (!note) return null;

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white border-2 border-[#d4a574]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-[#8fa878] uppercase tracking-wide mb-2">
            This Week from Trevor
          </p>
          <h3 className="text-xl font-semibold text-[#2a2318]">{note.title}</h3>
        </div>

        <p className="text-sm text-[#6b5f52] leading-relaxed">{note.body}</p>

        {note.related_space_id && (
          <Link href={`/app/spaces/${note.related_space_id}`}>
            <Button variant="outline" size="sm">
              Explore Related Space
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
