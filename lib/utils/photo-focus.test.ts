import { describe, it, expect } from "vitest";
import {
  parsePhotoFocus,
  stripPhotoFocus,
  withPhotoFocus,
  photoFocusStyle,
  focusPointToObjectPosition,
} from "./photo-focus";

describe("photo focus fragment", () => {
  it("round-trips a focus through a storage path", () => {
    const path = withPhotoFocus("abc/abc-1.jpg", { x: 50, y: 32 });
    expect(path).toBe("abc/abc-1.jpg#pos=50,32");
    expect(parsePhotoFocus(path)).toEqual({ x: 50, y: 32 });
    expect(stripPhotoFocus(path)).toBe("abc/abc-1.jpg");
  });

  it("replaces an existing focus instead of stacking fragments", () => {
    expect(withPhotoFocus("a.jpg#pos=10,10", { x: 20, y: 80 })).toBe("a.jpg#pos=20,80");
  });

  it("clears the focus when given null", () => {
    expect(withPhotoFocus("a.jpg#pos=10,10", null)).toBe("a.jpg");
  });

  it("survives being turned into a full public URL", () => {
    const url = `https://x.supabase.co/storage/v1/object/public/profile-photos/${withPhotoFocus("a/b.jpg", { x: 50, y: 20 })}`;
    expect(photoFocusStyle(url)).toEqual({ objectPosition: "50% 20%" });
  });

  it("returns nothing for photos without a focus", () => {
    expect(parsePhotoFocus("https://x/a.jpg")).toBeNull();
    expect(parsePhotoFocus("")).toBeNull();
    expect(parsePhotoFocus(undefined)).toBeNull();
    expect(photoFocusStyle("data:image/jpeg;base64,AAAA")).toBeUndefined();
  });

  it("clamps out-of-range values", () => {
    expect(withPhotoFocus("a.jpg", { x: -5, y: 140 })).toBe("a.jpg#pos=0,100");
  });
});

describe("focusPointToObjectPosition", () => {
  it("centers a point on a portrait photo's cropped axis", () => {
    // 800x1200 portrait: width fits the square, height overflows by 0.5.
    // Tapping 1/3 of the way down: offset = 1/3*1.5 - 0.5 = 0 -> 0%.
    expect(focusPointToObjectPosition({ x: 0.5, y: 1 / 3 }, { width: 800, height: 1200 })).toEqual({ x: 50, y: 0 });
    // Tapping the exact middle stays in the middle.
    expect(focusPointToObjectPosition({ x: 0.2, y: 0.5 }, { width: 800, height: 1200 })).toEqual({ x: 50, y: 50 });
    // 40% down: (0.6 - 0.5) / 0.5 = 20%.
    expect(focusPointToObjectPosition({ x: 0.5, y: 0.4 }, { width: 800, height: 1200 })).toEqual({ x: 50, y: 20 });
  });

  it("works on the horizontal axis for landscape photos", () => {
    // 1200x800: width overflows. Tapping 75% across: (1.125 - 0.5) / 0.5 = 125% -> clamped to 100.
    expect(focusPointToObjectPosition({ x: 0.75, y: 0.1 }, { width: 1200, height: 800 })).toEqual({ x: 100, y: 50 });
  });

  it("leaves square photos centered", () => {
    expect(focusPointToObjectPosition({ x: 0.1, y: 0.9 }, { width: 800, height: 800 })).toEqual({ x: 50, y: 50 });
  });
});
