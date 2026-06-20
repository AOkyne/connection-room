export interface TrevorNote {
  id: string;
  weekNumber: number;
  note: string;
  communityInvitation: string;
}

export const trevorNotes: TrevorNote[] = [
  {
    id: "week-1",
    weekNumber: 1,
    note: "Connection does not usually begin with a grand confession. Sometimes it begins with noticing the part of you that wants to be known and the part that is already looking for the exit.",
    communityInvitation:
      "Share one place where connection feels appealing, but slightly complicated.",
  },
  {
    id: "week-2",
    weekNumber: 2,
    note: "We often know where we want to go before we have taken stock of where we are. Today is about gentle self-awareness.",
    communityInvitation:
      "Name one small truth you are noticing about how you show up in connection.",
  },
  {
    id: "week-3",
    weekNumber: 3,
    note: "Being seen is not the same as being fixed. Sometimes the most intimate gift is simply: I see you, and you do not need to change.",
    communityInvitation:
      "Share something you would like witnessed, without needing it solved.",
  },
  {
    id: "week-4",
    weekNumber: 4,
    note: "Curiosity is different from judgment. When you notice something in yourself or another, you can wonder instead of conclude.",
    communityInvitation:
      "Ask a gentle question you are carrying about connection or yourself.",
  },
];

export function getTrevorNoteForWeek(weekNumber: number): TrevorNote | undefined {
  return trevorNotes.find((note) => note.weekNumber === weekNumber);
}

export function getCurrentTrevorNote(): TrevorNote {
  const weekOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  const weekNumber = (weekOfYear % 4) + 1;
  return getTrevorNoteForWeek(weekNumber) || trevorNotes[0];
}
