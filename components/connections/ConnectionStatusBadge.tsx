import type { AsyncConnectionStatus } from "@/lib/types/connection";

// Maps every status in the async-connection state model to a warm, neutral
// label and color -- never "Active" alone (ambiguous per the product spec),
// and never dating-app language ("matched", "rejected"). Color is always
// paired with the label text, never the only signal (accessibility
// requirement from the spec).
const STATUS_META: Record<AsyncConnectionStatus, { label: string; className: string }> = {
  pending_their_acceptance: { label: "Waiting on them", className: "bg-[#f3ede5] text-[#a0704a]" },
  confirmed: { label: "Connected", className: "bg-[#e5f3ea] text-[#2f6b45]" },
  active: { label: "Active exchange", className: "bg-[#e5f3ea] text-[#2f6b45]" },
  completed: { label: "Completed", className: "bg-[#ece7f3] text-[#5a4a8b]" },
  declined: { label: "Not confirmed", className: "bg-[#f3ede5] text-[#a0704a]" },
  awaiting_acceptance: { label: "Invitation sent", className: "bg-[#fdf3e3] text-[#a06b1a]" },
  accepted_by_one: { label: "Waiting on them", className: "bg-[#fdf3e3] text-[#a06b1a]" },
  waiting_for_participant: { label: "Waiting on them", className: "bg-[#fdf3e3] text-[#a06b1a]" },
  extended: { label: "Extra time added", className: "bg-[#fdf3e3] text-[#a06b1a]" },
  awaiting_next_round: { label: "Ready for next round", className: "bg-[#e5f3ea] text-[#2f6b45]" },
  exchange_complete: { label: "Exchange complete", className: "bg-[#ece7f3] text-[#5a4a8b]" },
  live_requested: { label: "Live conversation requested", className: "bg-[#e3ecfd] text-[#1a4ba0]" },
  live_scheduled: { label: "Live conversation scheduled", className: "bg-[#e3ecfd] text-[#1a4ba0]" },
  expired: { label: "Window closed", className: "bg-[#f3ede5] text-[#7a6f63]" },
  ended: { label: "Ended", className: "bg-[#f3ede5] text-[#7a6f63]" },
  reported: { label: "Under review", className: "bg-[#f9e5e5] text-[#a02f2f]" },
  cancelled: { label: "Cancelled", className: "bg-[#f3ede5] text-[#7a6f63]" },
};

export function ConnectionStatusBadge({ status }: { status: AsyncConnectionStatus }) {
  const meta = STATUS_META[status] || { label: status, className: "bg-[#f3ede5] text-[#7a6f63]" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}
