import { describe, it, expect } from "vitest";
import { bucketForConnection } from "./connectionDashboardBuckets";

describe("bucketForConnection", () => {
  it("puts an invited-but-not-yet-responded connection in Invitations", () => {
    expect(bucketForConnection({ status: "awaiting_acceptance", myInvitationStatus: "invited" }, undefined)).toBe("invitations");
  });

  it("puts the inviter's own pending invitation in Waiting for them", () => {
    expect(bucketForConnection({ status: "awaiting_acceptance", myInvitationStatus: "accepted" }, undefined)).toBe("waitingForThem");
  });

  it("puts live_requested/live_scheduled connections in Live conversations", () => {
    expect(bucketForConnection({ status: "live_requested", myInvitationStatus: "accepted" }, undefined)).toBe("live");
    expect(bucketForConnection({ status: "live_scheduled", myInvitationStatus: "accepted" }, undefined)).toBe("live");
  });

  it("puts exchange_complete/completed connections in Completed", () => {
    expect(bucketForConnection({ status: "exchange_complete", myInvitationStatus: "accepted" }, undefined)).toBe("completed");
    expect(bucketForConnection({ status: "completed", myInvitationStatus: "accepted" }, undefined)).toBe("completed");
  });

  it("puts expired/ended/declined/cancelled/reported connections in Expired or ended", () => {
    for (const status of ["expired", "ended", "declined", "cancelled", "reported"] as const) {
      expect(bucketForConnection({ status, myInvitationStatus: "accepted" }, undefined)).toBe("expiredEnded");
    }
  });

  it("puts an active connection with a revealed round in Ready to reveal", () => {
    const result = bucketForConnection(
      { status: "active", myInvitationStatus: "accepted" },
      { roundStatus: "revealed", mySubmitted: true }
    );
    expect(result).toBe("readyToReveal");
  });

  it("puts an active connection with an open round I haven't answered in Waiting for you", () => {
    const result = bucketForConnection(
      { status: "active", myInvitationStatus: "accepted" },
      { roundStatus: "open", mySubmitted: false }
    );
    expect(result).toBe("waitingForYou");
  });

  it("puts an active connection with an open round I HAVE answered in Waiting for them", () => {
    const result = bucketForConnection(
      { status: "active", myInvitationStatus: "accepted" },
      { roundStatus: "open", mySubmitted: true }
    );
    expect(result).toBe("waitingForThem");
  });

  it("falls back to Active exchanges when there is no round state yet", () => {
    expect(bucketForConnection({ status: "active", myInvitationStatus: "accepted" }, undefined)).toBe("active");
  });
});
