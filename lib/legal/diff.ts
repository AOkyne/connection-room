// Tracked changes for the legal pages. Pure: takes the saved versions of a
// page in order (the first is the baseline -- normally the last published
// copy) and replays them word by word, recording who added and who removed
// each word. The result renders like Word's track changes: additions
// underlined, removals struck through, each with its author and date.
//
// Words added since the baseline and then removed again simply vanish
// (as in Word): only changes that survive to the latest draft are shown.

export interface VersionInput {
  html: string;
  author: string;
  at: string;
}

interface Mark {
  author: string;
  at: string;
}

interface Item {
  tok: string;
  ins?: Mark;
  del?: Mark;
}

export interface AuthorSummary {
  name: string;
  additions: number;
  removals: number;
  lastAt: string;
  /** Color slot (0-5), matching the lc-author-N class in the rendered HTML. */
  color: number;
}

export interface TrackedChanges {
  html: string;
  authors: AuthorSummary[];
  changeCount: number;
}

type Op = "equal" | "delete" | "insert";

/** Tags, words and runs of whitespace. Input is sanitized HTML. */
export function tokenize(html: string): string[] {
  return html.match(/<[^>]+>|[^\s<]+|\s+/g) || [];
}

const isTag = (tok: string) => tok.startsWith("<");
const isSpace = (tok: string) => /^\s+$/.test(tok);

/**
 * Myers' O(ND) diff on token arrays, after trimming the common prefix and
 * suffix. Within each changed stretch, removals come before additions.
 */
export function diffTokens(a: string[], b: string[]): Op[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const ops: Op[] = new Array(start).fill("equal");
  ops.push(...myersMiddle(a.slice(start, endA), b.slice(start, endB)));
  for (let i = endA; i < a.length; i++) ops.push("equal");
  return groupChanges(ops);
}

function myersMiddle(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  if (n === 0) return new Array(m).fill("insert");
  if (m === 0) return new Array(n).fill("delete");

  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];

  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }

  // Walk back through the saved frontiers.
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = vd[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push("equal");
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) ops.push("insert");
      else ops.push("delete");
    }
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

function groupChanges(ops: Op[]): Op[] {
  const out: Op[] = [];
  let dels = 0;
  let ins = 0;
  const flush = () => {
    for (; dels > 0; dels--) out.push("delete");
    for (; ins > 0; ins--) out.push("insert");
  };
  for (const op of ops) {
    if (op === "delete") dels++;
    else if (op === "insert") ins++;
    else {
      flush();
      out.push(op);
    }
  }
  flush();
  return out;
}

export function trackChanges(versions: VersionInput[]): TrackedChanges {
  if (versions.length === 0) return { html: "", authors: [], changeCount: 0 };

  let items: Item[] = tokenize(versions[0].html).map((tok) => ({ tok }));

  for (const version of versions.slice(1)) {
    const mark: Mark = { author: version.author, at: version.at };
    const next = tokenize(version.html);
    const live = items.filter((it) => !it.del);
    const ops = diffTokens(live.map((it) => it.tok), next);

    const result: Item[] = [];
    let i = 0; // position in items
    let j = 0; // position in next
    const copyRemoved = () => {
      while (i < items.length && items[i].del) result.push(items[i++]);
    };
    for (const op of ops) {
      copyRemoved();
      if (op === "equal") {
        result.push(items[i++]);
        j++;
      } else if (op === "delete") {
        const it = items[i++];
        // Added since the baseline and now removed again: no trace.
        if (!it.ins) result.push({ tok: it.tok, del: mark });
      } else {
        result.push({ tok: next[j++], ins: mark });
      }
    }
    while (i < items.length) result.push(items[i++]);
    items = result;
  }

  return render(items);
}

const AUTHOR_COLORS = 6;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function formatWhen(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function render(items: Item[]): TrackedChanges {
  const authorIndex = new Map<string, number>();
  const summary = new Map<string, AuthorSummary>();
  const out: string[] = [];
  let open: string | null = null;
  let changeCount = 0;
  let prevKey: string | null = null;

  const close = () => {
    if (open) out.push(open === "ins" ? "</ins>" : "</del>");
    open = null;
  };

  for (const it of items) {
    if (isTag(it.tok)) {
      if (it.del) continue; // removed structure: its words still show, struck through
      close();
      prevKey = null;
      out.push(it.tok);
      continue;
    }
    const mark = it.ins || it.del;
    if (!mark) {
      close();
      prevKey = null;
      out.push(it.tok);
      continue;
    }
    const kind = it.ins ? "ins" : "del";
    const key = `${kind}|${mark.author}|${mark.at}`;
    if (key !== prevKey) {
      close();
      if (!authorIndex.has(mark.author)) authorIndex.set(mark.author, authorIndex.size % AUTHOR_COLORS);
      const verb = kind === "ins" ? "Added" : "Removed";
      const when = formatWhen(mark.at);
      out.push(
        `<${kind} class="lc-${kind} lc-author-${authorIndex.get(mark.author)}" title="${escapeAttr(`${verb} by ${mark.author}${when ? ` · ${when}` : ""}`)}">`
      );
      open = kind;
      prevKey = key;
    }
    out.push(it.tok);

    if (!isSpace(it.tok)) {
      const s = summary.get(mark.author) || {
        name: mark.author,
        additions: 0,
        removals: 0,
        lastAt: mark.at,
        color: authorIndex.get(mark.author) || 0,
      };
      if (kind === "ins") s.additions++;
      else s.removals++;
      if (mark.at > s.lastAt) s.lastAt = mark.at;
      summary.set(mark.author, s);
      changeCount++;
    }
  }
  close();

  return {
    html: out.join(""),
    authors: [...summary.values()].sort((x, y) => (x.lastAt < y.lastAt ? 1 : -1)),
    changeCount,
  };
}
