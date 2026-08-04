"use client";

import { useRef, useEffect, useState } from "react";
import { uploadBroadcastImage } from "@/lib/utils/storage";
import { resizeAndCompressImage } from "@/lib/utils/image";
import { buildQuestionUrl, renderQuestionHtml } from "@/lib/newsletter/generate";

// The email template's content column is ~496px wide (560px card minus
// padding) -- an inserted image is capped to fit it. Also used as the
// resize target so the actual file uploaded is never bigger than it will
// ever be displayed at, not just visually shrunk by CSS.
const EMAIL_CONTENT_WIDTH = 480;

export interface BroadcastEventOption {
  id: string;
  title: string;
  startAt: string;
  locationName?: string;
  imageUrl?: string;
}

export interface BroadcastQuestionOption {
  id: string;
  postId: string;
  spaceId: string;
  spaceName: string;
  questionText: string;
}

interface BroadcastRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  adminUserId: string;
  events: BroadcastEventOption[];
  questions: BroadcastQuestionOption[];
  appUrl: string;
}

const BUTTON_CLASS = "px-2 py-1 rounded hover:bg-[#e8ddd2] text-sm whitespace-nowrap";

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

export function BroadcastRichTextEditor({
  value,
  onChange,
  placeholder = "Write your announcement...",
  adminUserId,
  events,
  questions,
  appUrl,
}: BroadcastRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInit, setIsInit] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  // Tracks the last HTML this editor itself produced (via typing or a
  // toolbar command), so the sync effect below can tell "value changed
  // because we typed" (skip -- resetting innerHTML mid-keystroke would
  // reset the cursor to the start) apart from "value changed because the
  // parent loaded a draft / cleared the form after sending" (apply it).
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    if (!editorRef.current) return;

    if (!isInit) {
      editorRef.current.innerHTML = value;
      lastEmittedValue.current = value;
      setIsInit(true);
      return;
    }

    if (value !== lastEmittedValue.current) {
      editorRef.current.innerHTML = value;
      lastEmittedValue.current = value;
    }
  }, [value, isInit]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastEmittedValue.current = html;
      onChange(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertParagraph", false);
    }
  };

  // Toolbar buttons are mousedown-prevented so clicking one doesn't first
  // collapse the editor's text selection (a link/bold/etc needs the
  // selection that existed a moment ago, not "nothing selected").
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // "formatBlock" (H2/H3/blockquote) is the same notoriously unreliable
  // execCommand as insertUnorderedList/insertOrderedList (see toggleList
  // below): passing a bare tag name ("H2") is silently ignored in some
  // browsers, which only accept the bracketed form ("<h2>") per the
  // (deprecated but still-implemented) spec. Passing the bracketed form
  // fixes the common case; the manual-DOM fallback below additionally
  // covers browsers where even that demonstrably does nothing, mirroring
  // toggleList's exact "verify it actually changed something, else do it
  // by hand" approach.
  const applyFormatBlock = (tag: "h2" | "h3" | "blockquote") => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const beforeHtml = editor.innerHTML;
    document.execCommand("formatBlock", false, `<${tag}>`);

    if (editor.innerHTML !== beforeHtml) {
      handleInput();
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      handleInput();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      handleInput();
      return;
    }

    // Find the nearest block-level ancestor within the editor (or the
    // editor itself, for text with no wrapping block yet) and replace
    // just that element's tag, preserving its content -- not the whole
    // editor, so nothing else on the page is touched.
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    let blockEl = node as HTMLElement | null;
    while (blockEl && blockEl !== editor && !["DIV", "P", "H2", "H3", "BLOCKQUOTE", "LI"].includes(blockEl.tagName)) {
      blockEl = blockEl.parentElement;
    }

    const newBlock = document.createElement(tag);
    if (blockEl && blockEl !== editor) {
      newBlock.innerHTML = blockEl.innerHTML;
      blockEl.replaceWith(newBlock);
    } else {
      // No block wrapper at all (raw text typed directly into the
      // editor) -- wrap the current selection's contents instead.
      newBlock.appendChild(range.extractContents());
      range.insertNode(newBlock);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(newBlock);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);

    handleInput();
  };

  // document.execCommand("insertUnorderedList"/"insertOrderedList") is the
  // most notoriously unreliable pair of commands in that (deprecated) API
  // -- Safari in particular has long-standing bugs where it silently
  // no-ops instead of throwing, which reads exactly as "nothing happens
  // when you click." Verified execCommand itself does work correctly here
  // in Chromium, so this only replaces the DOM by hand as a fallback when
  // the browser's own command demonstrably didn't do anything -- Chromium
  // (and any other browser where the native command already works) is
  // unaffected.
  const toggleList = (ordered: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const command = ordered ? "insertOrderedList" : "insertUnorderedList";
    const beforeHtml = editor.innerHTML;
    const success = document.execCommand(command, false);

    if (success && editor.innerHTML !== beforeHtml) {
      handleInput();
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      handleInput();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      handleInput();
      return;
    }

    const list = document.createElement(ordered ? "ol" : "ul");
    const li = document.createElement("li");
    if (range.collapsed) {
      li.appendChild(document.createElement("br"));
    } else {
      li.appendChild(range.extractContents());
    }
    list.appendChild(li);
    range.insertNode(list);

    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);

    handleInput();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    handleInput();
  };

  const handleInsertLink = () => {
    const url = window.prompt("Link URL:", "https://");
    if (!url) return;
    applyFormat("createLink", url);
  };

  const handleInsertImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImageError("");
    setIsUploadingImage(true);
    try {
      // Resized/compressed before upload -- previously the raw file (up to
      // 5MB, whatever resolution the admin's phone/camera produced) was
      // uploaded as-is and inserted with only a CSS max-width:100%, no
      // real width. Many email clients (Outlook desktop in particular)
      // don't honor CSS on <img> at all and render it at native pixel
      // size -- a real photo landing in an inbox many times wider than
      // the email itself, with no visible way to undo except the
      // browser's native Ctrl+Z (not obvious, and not always reliable
      // after other edits).
      const resizedBlob = await resizeAndCompressImage(file, EMAIL_CONTENT_WIDTH);
      const resizedFile = new File([resizedBlob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });

      const { width } = await getImageDimensions(resizedBlob);

      const url = await uploadBroadcastImage(resizedFile, adminUserId);
      if (!url) {
        setImageError("Failed to upload image");
        return;
      }
      insertHtml(
        `<img src="${url}" alt="" width="${width}" style="max-width:100%;width:${width}px;height:auto;border-radius:8px;" />`
      );
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInsertButton = () => {
    const label = window.prompt("Button text:", "Learn More");
    if (!label) return;
    const url = window.prompt("Button link:", "https://");
    if (!url) return;
    insertHtml(
      `<a href="${url}" style="display:inline-block;background-color:#B8892F;color:#FFFDF8;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;font-size:15px;">${label}</a>`
    );
  };

  const handleInsertEvent = (event: BroadcastEventOption) => {
    setShowEventPicker(false);
    const dateLabel = new Date(event.startAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    // Bordered card + pill RSVP button (the original look, restored on
    // request) plus the event's own cover photo when it has one -- a
    // fixed HTML width attribute (not just CSS), same reasoning as the
    // uploaded-image fix above: some email clients ignore CSS on <img>
    // entirely, so a real pixel width is what actually keeps this from
    // rendering oversized.
    const coverImageHtml = event.imageUrl
      ? `<img src="${event.imageUrl}" alt="" width="${EMAIL_CONTENT_WIDTH}" style="display:block;width:100%;max-width:${EMAIL_CONTENT_WIDTH}px;height:auto;border-radius:8px;margin-bottom:14px;" />`
      : "";
    insertHtml(
      `<div style="border:1px solid #e8ddd2;border-radius:12px;padding:16px 20px;margin:16px 0;">
        ${coverImageHtml}
        <div style="font-weight:700;font-size:17px;color:#1a0f0a;">${event.title}</div>
        <div style="color:#a0704a;margin-top:4px;">${dateLabel}${event.locationName ? ` &middot; ${event.locationName}` : ""}</div>
        <a href="${appUrl}/app/events" style="display:inline-block;margin-top:12px;background-color:#B8892F;color:#FFFDF8;text-decoration:none;padding:10px 24px;border-radius:999px;font-weight:600;font-size:14px;">RSVP</a>
      </div>`
    );
  };

  // Inserts a real, working Question of the Week block -- same
  // table-based inline-CSS HTML the standalone generator
  // (app/app/admin/newsletter) produces, via document.execCommand
  // insertHTML so it lands as live, rendered DOM in this contentEditable
  // editor (a working button), not as visible HTML source text the way
  // pasting the generator's "Copy HTML" output into a rich-text field
  // would. campaign defaults to the current year-month, editable via the
  // prompt below since it's just a tracking tag, not shown to recipients.
  const handleInsertQuestion = (question: BroadcastQuestionOption) => {
    setShowQuestionPicker(false);
    const buttonLabel = window.prompt("Button text:", "Join the Conversation");
    if (!buttonLabel) return;
    const campaign = window.prompt("Campaign tag (for tracking only, not shown to recipients):", new Date().toISOString().slice(0, 7));
    if (!campaign) return;

    const url = buildQuestionUrl(question.postId, question.spaceId, campaign, appUrl);
    const html = renderQuestionHtml(
      { postId: question.postId, spaceId: question.spaceId, spaceName: question.spaceName, questionText: question.questionText, buttonLabel },
      url
    );
    insertHtml(html);
  };

  const handleInsertMergeTag = () => {
    insertHtml("{{firstName}}");
  };

  return (
    <div className="space-y-2">
      {/* sticky (not fixed): the app shell's main content area is its own
          scroll container (app/app/layout.tsx), so "top-0" here sticks
          the toolbar to the top of THAT scrolling region -- right below
          the app header -- once it scrolls past, instead of needing a
          manual pixel offset to dodge the header. */}
      <div className="flex flex-wrap items-center gap-1 p-2 border border-[#e8ddd2] rounded-t-lg bg-[#f9f7f4] sticky top-0 z-20">
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("undo")} className={BUTTON_CLASS} title="Undo">
          ↺ Undo
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("redo")} className={BUTTON_CLASS} title="Redo">
          ↻ Redo
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("bold")} className={`${BUTTON_CLASS} font-bold`} title="Bold">
          B
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("italic")} className={`${BUTTON_CLASS} italic`} title="Italic">
          I
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormatBlock("h2")} className={BUTTON_CLASS} title="Heading 2">
          H2
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormatBlock("h3")} className={BUTTON_CLASS} title="Heading 3">
          H3
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("justifyLeft")} className={BUTTON_CLASS} title="Align Left">
          ⯇≡
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("justifyCenter")} className={BUTTON_CLASS} title="Align Center">
          ≡
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("justifyRight")} className={BUTTON_CLASS} title="Align Right">
          ≡⯈
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={() => toggleList(false)} className={BUTTON_CLASS} title="Bullet List">
          • List
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => toggleList(true)} className={BUTTON_CLASS} title="Numbered List">
          1. List
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormatBlock("blockquote")} className={BUTTON_CLASS} title="Quote">
          ❝
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("insertHorizontalRule")} className={BUTTON_CLASS} title="Divider">
          —
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={handleInsertLink} className={BUTTON_CLASS} title="Insert Link">
          🔗 Link
        </button>
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={handleInsertImageClick}
          disabled={isUploadingImage}
          className={`${BUTTON_CLASS} disabled:opacity-50`}
          title="Insert Image"
        >
          {isUploadingImage ? "Uploading..." : "🖼 Image"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          className="hidden"
          onChange={handleImageFileSelected}
        />

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={handleInsertButton} className={BUTTON_CLASS} title="Insert a call-to-action button">
          ⚡ Button
        </button>
        <div className="relative">
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => setShowEventPicker((v) => !v)}
            className={BUTTON_CLASS}
            title="Insert an event"
          >
            📅 Event
          </button>
          {showEventPicker && (
            <div className="absolute z-10 top-full left-0 mt-1 w-64 max-h-56 overflow-y-auto bg-white border border-[#e8ddd2] rounded-lg shadow-lg">
              {events.length === 0 ? (
                <p className="p-3 text-xs text-[#a0704a]">No events found</p>
              ) : (
                events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => handleInsertEvent(event)}
                    className="w-full text-left p-2 px-3 hover:bg-[#f9f7f4] text-sm text-[#1a0f0a] border-b border-[#f3ede5] last:border-0"
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-[#a0704a]">
                      {new Date(event.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button type="button" onMouseDown={preventBlur} onClick={handleInsertMergeTag} className={BUTTON_CLASS} title="Insert the recipient's first name">
          {"{}"} Merge
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <div className="relative">
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => setShowQuestionPicker((v) => !v)}
            className={BUTTON_CLASS}
            title="Insert a Question of the Week"
          >
            📰 Question
          </button>
          {showQuestionPicker && (
            <div className="absolute z-10 top-full left-0 mt-1 w-72 max-h-56 overflow-y-auto bg-white border border-[#e8ddd2] rounded-lg shadow-lg">
              {questions.length === 0 ? (
                <p className="p-3 text-xs text-[#a0704a]">No newsletter-eligible questions found</p>
              ) : (
                questions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => handleInsertQuestion(question)}
                    className="w-full text-left p-2 px-3 hover:bg-[#f9f7f4] text-sm text-[#1a0f0a] border-b border-[#f3ede5] last:border-0"
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-[#8b6f47]">{question.spaceName}</div>
                    <div className="font-medium">{question.questionText}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {imageError && <p className="text-xs text-red-600">{imageError}</p>}

      <div
        ref={editorRef}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        contentEditable
        suppressContentEditableWarning
        className="broadcast-editor-content w-full px-3 py-2 border border-[#e8ddd2] rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] min-h-48"
        style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
