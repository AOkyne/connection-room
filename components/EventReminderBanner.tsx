"use client";

import { useState, useEffect } from "react";
import { getPendingReminders, getReminderMessage } from "@/lib/data/event-reminders";
import { getUserEventInterestsList } from "@/lib/data/events";
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

      const interestedEvents = getUserEventInterestsList(profile.id);
      const pending = getPendingReminders(profile.id, interestedEvents);
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
      ? "bg-[#b86a52]/10 border-[#b86a52]" // rust/warning
      : current.timing === "within_day"
      ? "bg-[#d4a574]/10 border-[#d4a574]" // gold/attention
      : "bg-[#8fa878]/10 border-[#8fa878]"; // sage/info

  const textColor =
    current.timing === "within_hour"
      ? "text-[#b86a52]"
      : current.timing === "within_day"
      ? "text-[#9d7f5c]"
      : "text-[#7a8f6e]";

  return (
    <div className={`border-l-4 ${bgColor} p-4 rounded-r-lg`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`font-medium ${textColor}`}>{message}</p>
          <p className="text-xs text-[#a0968a] mt-2">
            {current.timing === "within_hour" && "This event is starting soon!"}
            {current.timing === "within_day" && "See you tomorrow!"}
            {current.timing === "within_week" && "Mark your calendar!"}
          </p>
        </div>
        {reminders.length > 1 && (
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % reminders.length)}
            className="text-xs font-medium text-[#6b5f52] hover:text-[#2a2318] whitespace-nowrap"
          >
            Next ({currentIndex + 1}/{reminders.length})
          </button>
        )}
      </div>
    </div>
  );
}
