"use client";

import { useState, useEffect } from "react";
import { getPendingReminders, getReminderMessage } from "@/lib/data/event-reminders";
import { getUserUpcomingEvents } from "@/lib/data/events";
import { getProfile } from "@/lib/data/profiles";

export function EventReminderBanner() {
  const [reminders, setReminders] = useState<Array<{
    event: any;
    timing: "within_week" | "within_day" | "within_hour";
  }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadReminders = async () => {
      const profile = await getProfile();
      if (!profile) return;

      const upcomingEvents = await getUserUpcomingEvents(profile.id);
      const pending = getPendingReminders(profile.id, upcomingEvents);
      setReminders(pending);
      setMounted(true);
    };

    loadReminders();
  }, []);

  if (!mounted || reminders.length === 0) return null;

  const current = reminders[currentIndex];
  const message = getReminderMessage(current.event, current.timing);

  const bgColor =
    current.timing === "within_hour"
      ? "bg-[#a84a2a]/10 border-[#a84a2a]" // rust/warning
      : current.timing === "within_day"
      ? "bg-[#d4a348]/10 border-[#d4a348]" // gold/attention
      : "bg-[#c97a2a]/10 border-[#c97a2a]"; // sage/info

  const textColor =
    current.timing === "within_hour"
      ? "text-[#a84a2a]"
      : current.timing === "within_day"
      ? "text-[#8b6f47]"
      : "text-[#7a8f6e]";

  return (
    <div className={`border-l-4 ${bgColor} p-4 rounded-r-lg`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`font-medium ${textColor}`}>{message}</p>
          <p className="text-xs text-[#a0704a] mt-2">
            {current.timing === "within_hour" && "This event is starting soon!"}
            {current.timing === "within_day" && "See you tomorrow!"}
            {current.timing === "within_week" && "Mark your calendar!"}
          </p>
        </div>
        {reminders.length > 1 && (
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % reminders.length)}
            className="text-xs font-medium text-[#1a0f0a] hover:text-[#1a0f0a] whitespace-nowrap"
          >
            Next ({currentIndex + 1}/{reminders.length})
          </button>
        )}
      </div>
    </div>
  );
}
