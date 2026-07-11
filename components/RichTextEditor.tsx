"use client";

import { useRef, useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Enter text..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInit, setIsInit] = useState(false);

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

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-2 border border-[#e8ddd2] rounded-t-lg bg-[#f9f7f4]">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] font-bold text-sm"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormat("italic")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] italic text-sm"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => applyFormat("underline")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] underline text-sm"
          title="Underline (Ctrl+U)"
        >
          U
        </button>
        <div className="border-l border-[#d4a348] mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormat("insertUnorderedList")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] text-sm"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => applyFormat("insertOrderedList")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] text-sm"
          title="Numbered List"
        >
          1. List
        </button>
        <div className="border-l border-[#d4a348] mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormat("removeFormat")}
          className="px-2 py-1 rounded hover:bg-[#e8ddd2] text-sm"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        onInput={handleInput}
        contentEditable
        suppressContentEditableWarning
        className="w-full px-3 py-2 border border-[#e8ddd2] rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] min-h-32"
        style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
