// Start Here checklist tracking

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  autoComplete?: boolean; // If true, can be auto-completed based on app state
}

const CHECKLIST_STORAGE_KEY = "connection-room:start-here-checklist";

export const START_HERE_CHECKLIST: ChecklistItem[] = [
  {
    id: "complete-profile",
    title: "Complete Your Profile",
    description: "Add your photo, pronouns, location, and interests",
    completed: false,
    autoComplete: true,
  },
  {
    id: "explore-spaces",
    title: "Explore Other Spaces",
    description: "Visit at least 2 community spaces besides Start Here",
    completed: false,
  },
  {
    id: "first-post",
    title: "Make Your First Post",
    description: "Share something in any space to introduce yourself",
    completed: false,
    autoComplete: true,
  },
  {
    id: "take-quiz",
    title: "Take a Quiz",
    description: "Complete one of the relationship or intimacy quizzes",
    completed: false,
    autoComplete: true,
  },
  {
    id: "respond-prompt",
    title: "Respond to Daily Prompt",
    description: "Share your thoughts on a daily reflection prompt",
    completed: false,
    autoComplete: true,
  },
];

// Get checklist with current progress
export function getChecklist(): ChecklistItem[] {
  if (typeof window === "undefined") return START_HERE_CHECKLIST;

  const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing checklist:", e);
    }
  }

  return START_HERE_CHECKLIST.map(item => ({ ...item }));
}

// Save checklist progress
export function saveChecklist(checklist: ChecklistItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
}

// Toggle item completion
export function toggleChecklistItem(itemId: string): void {
  const checklist = getChecklist();
  const item = checklist.find(i => i.id === itemId);
  if (item) {
    item.completed = !item.completed;
    saveChecklist(checklist);
  }
}

// Get progress percentage
export function getChecklistProgress(): number {
  const checklist = getChecklist();
  if (checklist.length === 0) return 0;
  const completed = checklist.filter(i => i.completed).length;
  return Math.round((completed / checklist.length) * 100);
}

// Get completed items count
export function getCompletedCount(): number {
  const checklist = getChecklist();
  return checklist.filter(i => i.completed).length;
}
