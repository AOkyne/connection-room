"use client";

import { useEffect, useState } from "react";
import { getNextMonth5Alert, shouldShowMonth5Alert } from "@/lib/utils/rhythm-schedule";
import { Card } from "@/components/Card";

export function RhythmContentAlert() {
  const [alert, setAlert] = useState<any>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const show = shouldShowMonth5Alert();
    setShouldShow(show);

    if (show) {
      const alertData = getNextMonth5Alert();
      setAlert(alertData);
    }
  }, []);

  if (!shouldShow || dismissed || !alert) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-[#d4a574]/10 to-[#8fa878]/10 border-2 border-[#d4a574]">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#d4a574]">
              Content Preparation Needed
            </h3>
            <p className="text-sm text-[#6b5f52] mt-1">
              Month 5 of the Six-Month Guided Rhythm begins in{" "}
              <strong>{alert.daysUntil} days</strong>
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-[#a0968a] hover:text-[#6b5f52] text-2xl font-light leading-none"
          >
            ×
          </button>
        </div>

        <div className="bg-white rounded-lg p-3 border border-[#e8ddd2]">
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            <strong>Start Date:</strong> {alert.formattedDate}
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed mt-2">
            Please prepare new monthly themes, weekly prompts, integration questions,
            and Trevor Notes for the next 6-month cycle (Months 1-6).
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide">
            Next Steps:
          </p>
          <ul className="text-xs text-[#6b5f52] space-y-1">
            <li>• Review current Month 5 content in <code className="bg-[#f3ede5] px-1 rounded">lib/content/guided-rhythm.ts</code></li>
            <li>• Prepare new themes for all 6 months</li>
            <li>• Update content file before Month 5 begins</li>
            <li>• Optional: Add new connection prompts to the bank</li>
          </ul>
        </div>

        <div className="bg-[#f8f6f2] rounded-lg p-3 text-xs text-[#a0968a]">
          <p>
            The guided rhythm helps members stay engaged with a predictable, warm rhythm
            of themes, weekly prompts, and integration reflections. Fresh, authentic content
            keeps the experience meaningful.
          </p>
        </div>
      </div>
    </Card>
  );
}
