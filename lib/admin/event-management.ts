export interface EventWithCapacity {
  id: string;
  title: string;
  date: Date;
  capacity?: number;
  registeredCount: number;
  registrants: EventRegistrant[];
  isAtCapacity: boolean;
}

export interface EventRegistrant {
  id: string;
  userId: string;
  userName: string;
  registeredAt: string;
  status: "registered" | "interested" | "attended" | "cancelled";
}

// Get or initialize event capacity
export function getEventCapacity(eventId: string): number | undefined {
  if (typeof window === "undefined") return undefined;

  const capacities = JSON.parse(
    localStorage.getItem("connection-room:event-capacities") || "{}"
  );
  return capacities[eventId];
}

// Set event capacity
export function setEventCapacity(eventId: string, capacity: number): void {
  if (typeof window === "undefined") return;

  const capacities = JSON.parse(
    localStorage.getItem("connection-room:event-capacities") || "{}"
  );
  capacities[eventId] = capacity;
  localStorage.setItem(
    "connection-room:event-capacities",
    JSON.stringify(capacities)
  );
}

// Get event registrants
export function getEventRegistrants(eventId: string): EventRegistrant[] {
  if (typeof window === "undefined") return [];

  const registrants = JSON.parse(
    localStorage.getItem(`connection-room:event-registrants:${eventId}`) ||
      "[]"
  );
  return registrants.sort(
    (a: EventRegistrant, b: EventRegistrant) =>
      new Date(b.registeredAt).getTime() -
      new Date(a.registeredAt).getTime()
  );
}

// Add event registrant
export function addEventRegistrant(
  eventId: string,
  userId: string,
  userName: string,
  status: "registered" | "interested" = "interested"
): boolean {
  if (typeof window === "undefined") return false;

  const registrants = JSON.parse(
    localStorage.getItem(`connection-room:event-registrants:${eventId}`) ||
      "[]"
  );

  // Check if already registered
  if (registrants.some((r: EventRegistrant) => r.userId === userId)) {
    return false;
  }

  const registrant: EventRegistrant = {
    id: `reg-${Date.now()}`,
    userId,
    userName,
    registeredAt: new Date().toISOString(),
    status,
  };

  registrants.push(registrant);
  localStorage.setItem(
    `connection-room:event-registrants:${eventId}`,
    JSON.stringify(registrants)
  );

  // Log action
  const log = {
    action: "event_registration",
    eventId,
    userId,
    status,
    timestamp: new Date().toISOString(),
  };
  const logs = JSON.parse(
    localStorage.getItem("connection-room:admin-logs") || "[]"
  );
  logs.push(log);
  localStorage.setItem(
    "connection-room:admin-logs",
    JSON.stringify(logs.slice(-100))
  );

  return true;
}

// Update registrant status
export function updateRegistrantStatus(
  eventId: string,
  registrantId: string,
  status: "registered" | "interested" | "attended" | "cancelled"
): boolean {
  if (typeof window === "undefined") return false;

  const registrants = JSON.parse(
    localStorage.getItem(`connection-room:event-registrants:${eventId}`) ||
      "[]"
  );

  const updated = registrants.map((r: EventRegistrant) =>
    r.id === registrantId ? { ...r, status } : r
  );

  localStorage.setItem(
    `connection-room:event-registrants:${eventId}`,
    JSON.stringify(updated)
  );

  return true;
}

// Remove registrant
export function removeRegistrant(
  eventId: string,
  registrantId: string
): boolean {
  if (typeof window === "undefined") return false;

  const registrants = JSON.parse(
    localStorage.getItem(`connection-room:event-registrants:${eventId}`) ||
      "[]"
  );

  const filtered = registrants.filter(
    (r: EventRegistrant) => r.id !== registrantId
  );

  localStorage.setItem(
    `connection-room:event-registrants:${eventId}`,
    JSON.stringify(filtered)
  );

  return true;
}

// Send event notification to registrants
export function sendEventNotification(
  eventId: string,
  eventTitle: string,
  message: string
): number {
  if (typeof window === "undefined") return 0;

  const registrants = getEventRegistrants(eventId);
  let notificationCount = 0;

  registrants.forEach((registrant) => {
    // Send notification (stored as admin message)
    const msg = {
      id: `notif-${Date.now()}-${registrant.userId}`,
      fromAdmin: "Event Admin",
      toUserId: registrant.userId,
      toUserName: registrant.userName,
      subject: `Update: ${eventTitle}`,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      isEventNotification: true,
      eventId,
    };

    const messages = JSON.parse(
      localStorage.getItem(`connection-room:messages:${registrant.userId}`) ||
        "[]"
    );
    messages.push(msg);
    localStorage.setItem(
      `connection-room:messages:${registrant.userId}`,
      JSON.stringify(messages)
    );

    notificationCount++;
  });

  return notificationCount;
}

// Get event statistics
export function getEventStats(eventId: string) {
  const registrants = getEventRegistrants(eventId);
  const registered = registrants.filter(
    (r) => r.status === "registered"
  ).length;
  const interested = registrants.filter(
    (r) => r.status === "interested"
  ).length;
  const attended = registrants.filter(
    (r) => r.status === "attended"
  ).length;
  const cancelled = registrants.filter(
    (r) => r.status === "cancelled"
  ).length;

  return {
    totalRegistrants: registrants.length,
    registered,
    interested,
    attended,
    cancelled,
  };
}
