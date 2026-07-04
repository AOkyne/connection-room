// Connection requests data access layer

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  toUserId: string;
  createdAt: Date;
  status: "pending" | "accepted" | "declined";
  fromUserInterests?: string[];
  sharedPrompt?: string;
}

const REQUESTS_STORAGE_KEY = "connection-room:connection-requests";

export function sendConnectionRequest(
  fromUserId: string,
  fromUserName: string,
  fromUserPhoto: string,
  toUserId: string
): ConnectionRequest {
  if (typeof window === "undefined") {
    throw new Error("Connection requests require browser environment");
  }

  const request: ConnectionRequest = {
    id: `request-${Date.now()}`,
    fromUserId,
    fromUserName,
    fromUserPhoto,
    toUserId,
    createdAt: new Date(),
    status: "pending",
  };

  const allRequests = getAllRequests();
  allRequests.push(request);
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(allRequests));

  return request;
}

export function getIncomingRequests(toUserId: string): ConnectionRequest[] {
  if (typeof window === "undefined") return [];

  const allRequests = getAllRequests();
  return allRequests.filter(
    (r) => r.toUserId === toUserId && r.status === "pending"
  );
}

export function getSentRequests(fromUserId: string): ConnectionRequest[] {
  if (typeof window === "undefined") return [];

  const allRequests = getAllRequests();
  return allRequests.filter(
    (r) => r.fromUserId === fromUserId && r.status === "pending"
  );
}

export function acceptConnectionRequest(
  requestId: string,
  userId: string
): ConnectionRequest | null {
  if (typeof window === "undefined") return null;

  const allRequests = getAllRequests();
  const request = allRequests.find((r) => r.id === requestId);

  if (!request || request.toUserId !== userId) {
    return null;
  }

  request.status = "accepted";
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(allRequests));

  return request;
}

export function declineConnectionRequest(
  requestId: string,
  userId: string
): boolean {
  if (typeof window === "undefined") return false;

  const allRequests = getAllRequests();
  const index = allRequests.findIndex((r) => r.id === requestId);

  if (index === -1 || allRequests[index].toUserId !== userId) {
    return false;
  }

  allRequests.splice(index, 1);
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(allRequests));

  return true;
}

export function hasRequestSent(
  fromUserId: string,
  toUserId: string
): boolean {
  if (typeof window === "undefined") return false;

  const allRequests = getAllRequests();
  return allRequests.some(
    (r) =>
      r.fromUserId === fromUserId &&
      r.toUserId === toUserId &&
      r.status === "pending"
  );
}

export function checkMutualRequest(
  userId1: string,
  userId2: string
): boolean {
  if (typeof window === "undefined") return false;

  const allRequests = getAllRequests();
  const user1ToUser2 = allRequests.some(
    (r) =>
      r.fromUserId === userId1 &&
      r.toUserId === userId2 &&
      r.status === "pending"
  );
  const user2ToUser1 = allRequests.some(
    (r) =>
      r.fromUserId === userId2 &&
      r.toUserId === userId1 &&
      r.status === "pending"
  );

  return user1ToUser2 && user2ToUser1;
}

// Demo helper: Create test incoming requests
export function createDemoIncomingRequests(toUserId: string): void {
  if (typeof window === "undefined") return;

  const demoRequests: ConnectionRequest[] = [
    {
      id: `request-demo-1`,
      fromUserId: "demo-alex",
      fromUserName: "Alex",
      fromUserPhoto: "/demo-members/seed-man-04.png",
      toUserId,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: "pending",
    },
    {
      id: `request-demo-2`,
      fromUserId: "demo-sam",
      fromUserName: "Sam",
      fromUserPhoto: "/demo-members/seed-man-16.png",
      toUserId,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      status: "pending",
    },
  ];

  const allRequests = getAllRequests();
  const existingDemoRequests = allRequests.filter((r) => r.id.includes("demo"));
  const filteredRequests = allRequests.filter((r) => !r.id.includes("demo"));

  localStorage.setItem(
    REQUESTS_STORAGE_KEY,
    JSON.stringify([...filteredRequests, ...demoRequests])
  );
}

function getAllRequests(): ConnectionRequest[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}
