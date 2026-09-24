"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import {
  focusPointToObjectPosition,
  parsePhotoFocus,
  stripPhotoFocus,
  type PhotoFocus,
} from "@/lib/utils/photo-focus";

interface PhotoFramingEditorProps {
  photoUrl: string;
  onApply: (focus: PhotoFocus | null) => void;
  onCancel: () => void;
}

/**
 * Lets a member choose which part of their photo shows in the round
 * thumbnails around the app: they tap (or drag across) their face on the
 * full photo, and the circle previews update live. The result is an
 * object-position applied everywhere their photo appears -- see
 * lib/utils/photo-focus.ts.
 */
export function PhotoFramingEditor({ photoUrl, onApply, onCancel }: PhotoFramingEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [focus, setFocus] = useState<PhotoFocus | null>(parsePhotoFocus(photoUrl));
  // The tapped point as fractions of the image, for the marker. Starts
  // unset -- a saved focus is an object-position, not the original tap.
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const src = stripPhotoFocus(photoUrl);
  const previewStyle = { objectPosition: focus ? `${focus.x}% ${focus.y}%` : "50% 0%" };

  const pickAt = (clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const rect = img.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setMarker({ x, y });
    setFocus(focusPointToObjectPosition({ x, y }, { width: img.naturalWidth, height: img.naturalHeight }));
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#e8e3db] bg-[#fdfbf7] p-4">
      <div>
        <p className="font-medium text-[#1a1714]">Tap your face in the photo</p>
        <p className="text-sm text-[#6b6460]">
          This sets what shows in the round photo other members see. You can tap again or drag to fine-tune.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div
          className="relative inline-block cursor-crosshair select-none touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            pickAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (dragging) pickAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Your photo"
            draggable={false}
            className="block max-h-72 max-w-full w-auto rounded-md"
          />
          {marker && (
            <span
              className="pointer-events-none absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)]"
              style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-[#6b6460] uppercase tracking-wide">Preview</p>
          <img src={src} alt="" className="w-24 h-24 rounded-full object-cover border border-[#dcc4b3]" style={previewStyle} />
          <img src={src} alt="" className="w-12 h-12 rounded-full object-cover border border-[#dcc4b3]" style={previewStyle} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={() => onApply(focus)} disabled={!focus}>
          Use this framing
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {parsePhotoFocus(photoUrl) && (
          <button
            type="button"
            onClick={() => onApply(null)}
            className="text-sm text-[#8b6f47] hover:text-[#c9a876] underline px-2"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}
