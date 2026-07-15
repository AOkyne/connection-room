// <input type="datetime-local"> reads/writes a naive "YYYY-MM-DDTHH:mm" string
// with no timezone info. The browser (and JS Date parsing) treats that naive
// string as local time, but Supabase's timestamptz columns need an explicit
// UTC instant. These helpers convert in both directions so an admin picking
// "6:00 PM" in their own timezone gets back "6:00 PM" when they reload it.

// Local datetime-local string -> UTC ISO string, for sending to Supabase.
export function datetimeLocalToISO(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value); // naive string is parsed as local time
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

// UTC ISO string from Supabase -> local datetime-local string, for populating the input.
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
