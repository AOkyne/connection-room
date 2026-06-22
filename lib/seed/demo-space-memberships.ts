/**
 * Demo member space assignments
 * Maps each demo member to the spaces they've joined
 */

export const demoSpaceMemberships: Record<string, string[]> = {
  "demo-marcus-h": ["commons", "start-here", "touch-and-affection", "intimacy-patterns"],
  "demo-daniel-r": ["commons", "start-here", "dating-desire", "couples-closeness"],
  "demo-james-t": ["commons", "start-here", "spirituality-sexuality", "masculinity-sexuality"],
  "demo-alex-m": ["commons", "start-here", "dating-desire", "embodiment"],
  "demo-chris-w": ["commons", "start-here", "couples-closeness", "spirituality-sexuality"],
  "demo-jordan-k": ["commons", "start-here", "touch-and-affection", "couples-closeness"],
  "demo-david-l": ["commons", "start-here", "masculinity-sexuality", "embodiment"],
  "demo-ryan-p": ["commons", "start-here", "dating-desire", "intimacy-patterns"],
  "demo-sammy-c": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "demo-noah-g": ["commons", "start-here", "couples-closeness", "dating-desire"],
  "demo-ethan-b": ["commons", "start-here", "embodiment", "touch-and-affection"],
  "demo-liam-s": ["commons", "start-here", "masculinity-sexuality", "touch-and-affection"],
  "demo-mason-h": ["commons", "start-here", "spirituality-sexuality", "couples-closeness"],
  "demo-lucas-j": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "demo-oliver-f": [
    "commons",
    "start-here",
    "spirituality-sexuality",
    "masculinity-sexuality",
  ],
  "demo-aiden-n": ["commons", "start-here", "spirituality-sexuality", "couples-closeness"],
  "demo-isaac-b": ["commons", "start-here", "embodiment", "dating-desire"],
  "demo-michael-p": ["commons", "start-here", "couples-closeness", "touch-and-affection"],
  "demo-william-r": ["commons", "start-here", "dating-desire", "embodiment"],
  "demo-benjamin-m": ["commons", "start-here", "dating-desire", "intimacy-patterns"],
  "demo-jacob-d": ["commons", "start-here", "touch-and-affection", "spirituality-sexuality"],
  "demo-henry-c": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "demo-tyler-w": ["commons", "start-here", "couples-closeness", "touch-and-affection"],
  "demo-gabriel-h": ["commons", "start-here", "touch-and-affection", "dating-desire"],
};

// Helper function to get all demo member IDs
export function getAllDemoMemberIds(): string[] {
  return Object.keys(demoSpaceMemberships);
}

// Helper function to get members in a specific space
export function getMembersInSpace(spaceId: string): string[] {
  return Object.entries(demoSpaceMemberships)
    .filter(([, spaces]) => spaces.includes(spaceId))
    .map(([memberId]) => memberId);
}

// Get member count per space
export function getMemberCountsBySpace(): Record<string, number> {
  const counts: Record<string, number> = {};

  Object.values(demoSpaceMemberships).forEach((spaces) => {
    spaces.forEach((spaceId) => {
      counts[spaceId] = (counts[spaceId] || 0) + 1;
    });
  });

  return counts;
}
