"use client";

import { WeeklyNote } from "@/lib/data/daily-companion";
import { Avatar } from "@/components/Avatar";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

interface WeeklyTrevorNoteCardProps {
  note: WeeklyNote | null;
}

export function WeeklyTrevorNoteCard({ note }: WeeklyTrevorNoteCardProps) {
  if (!note) return null;

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white border-2 border-[#d4a348]">
      <div className="flex items-start gap-6">
        <img
          src="/trevor-photo.png"
          alt="Trevor James"
          className="w-48 h-48 rounded-full object-cover border-4 border-[#d4a348] shadow-lg flex-shrink-0"
        />
        <div className="flex-1 space-y-3 flex flex-col">
          <div>
            <p className="text-xs font-semibold text-[#c97a2a] uppercase tracking-wide mb-1">
              This Week from Trevor
            </p>
            <h3 className="text-xl font-semibold text-[#1a0f0a]">{note.title}</h3>
          </div>
          <p className="text-sm text-[#1a0f0a] leading-relaxed">{note.body}</p>
          {note.related_space_id && (
            <Link href={`/app/spaces/${note.related_space_id}`}>
              <Button variant="outline" size="sm">
                Explore Related Space
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
