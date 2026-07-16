"use client";

import { useRef, useEffect, useState } from "react";
import { uploadBroadcastImage } from "@/lib/utils/storage";

export interface BroadcastEventOption {
  id: string;
  title: string;
  startAt: string;
  locationName?: string;
}

interface BroadcastRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  adminUserId: string;
  events: BroadcastEventOption[];
  appUrl: string;
}

const BUTTON_CLASS = "px-2 py-1 rounded hover:bg-[#e8ddd2] text-sm whitespace-nowrap";

export function BroadcastRichTextEditor({
  value,
  onChange,
  placeholder = "Write your announcement...",
  adminUserId,
  events,
  appUrl,
}: BroadcastRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInit, setIsInit] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (editorRef.current && !isInit) {
      editorRef.current.innerHTML = value;
      setIsInit(true);
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
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
      const url = await uploadBroadcastImage(file, adminUserId);
      if (!url) {
        setImageError("Failed to upload image");
        return;
      }
      insertHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;" />`);
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
    insertHtml(
      `<div style="border:1px solid #e8ddd2;border-radius:12px;padding:16px 20px;margin:16px 0;">
        <div style="font-weight:700;font-size:17px;color:#1a0f0a;">${event.title}</div>
        <div style="color:#a0704a;margin-top:4px;">${dateLabel}${event.locationName ? ` &middot; ${event.locationName}` : ""}</div>
        <a href="${appUrl}/app/events" style="display:inline-block;margin-top:12px;background-color:#B8892F;color:#FFFDF8;text-decoration:none;padding:10px 24px;border-radius:999px;font-weight:600;font-size:14px;">RSVP</a>
      </div>`
    );
  };

  const handleInsertMergeTag = () => {
    insertHtml("{{firstName}}");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 p-2 border border-[#e8ddd2] rounded-t-lg bg-[#f9f7f4]">
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("bold")} className={`${BUTTON_CLASS} font-bold`} title="Bold">
          B
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("italic")} className={`${BUTTON_CLASS} italic`} title="Italic">
          I
        </button>

        <div className="border-l border-[#d4a348] mx-1 self-stretch" />

        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("formatBlock", "H2")} className={BUTTON_CLASS} title="Heading 2">
          H2
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("formatBlock", "H3")} className={BUTTON_CLASS} title="Heading 3">
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

        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("insertUnorderedList")} className={BUTTON_CLASS} title="Bullet List">
          • List
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("insertOrderedList")} className={BUTTON_CLASS} title="Numbered List">
          1. List
        </button>
        <button type="button" onMouseDown={preventBlur} onClick={() => applyFormat("formatBlock", "BLOCKQUOTE")} className={BUTTON_CLASS} title="Quote">
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
      </div>

      {imageError && <p className="text-xs text-red-600">{imageError}</p>}

      <div
        ref={editorRef}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        contentEditable
        suppressContentEditableWarning
        className="w-full px-3 py-2 border border-[#e8ddd2] rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] min-h-48"
        style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
