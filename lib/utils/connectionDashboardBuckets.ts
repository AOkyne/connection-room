// Pure classification logic for the Connections dashboard sections
// (Invitations / Waiting for you / Waiting for them / Ready to reveal /
// Active exchanges / Live conversations / Completed / Expired or ended --
// see the product spec). Extracted out of
// components/connections/GuidedExchangeSection.tsx so it's testable without
// rendering React (see connectionDashboardBuckets.test.ts).

import type { AsyncConnection, AsyncConnectionStatus } from "@/lib/types/connection";

export type DashboardBucket =
  | "invitations"
  | "waitingForYou"
  | "waitingForThem"
  | "readyToReveal"
  | "active"
  | "live"
  | "completed"
  | "expiredEnded";

export interface CurrentRoundStateLike {
  roundStatus: "open" | "revealed";
  mySubmitted: boolean;
}

const LIVE_STATUSES: AsyncConnectionStatus[] = ["live_requested", "live_scheduled"];
const COMPLETED_STATUSES: AsyncConnectionStatus[] = ["exchange_complete", "completed"];
const TERMINAL_STATUSES: AsyncConnectionStatus[] = ["expired", "ended", "declined", "cancelled", "reported"];

export function bucketForConnection(
  connection: Pick<AsyncConnection, "status" | "myInvitationStatus">,
  roundState: CurrentRoundStateLike | undefined
): DashboardBucket {
  if (connection.status === "awaiting_acceptance") {
    return connection.myInvitationStatus === "invited" ? "invitations" : "waitingForThem";
  }
  if (LIVE_STATUSES.includes(connection.status)) return "live";
  if (COMPLETED_STATUSES.includes(connection.status)) return "completed";
  if (TERMINAL_STATUSES.includes(connection.status)) return "expiredEnded";

  if (roundState?.roundStatus === "revealed") return "readyToReveal";
  if (roundState?.roundStatus === "open") return roundState.mySubmitted ? "waitingForThem" : "waitingForYou";

  return "active";
}
