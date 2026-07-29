import { describe, it, expect } from "vitest";
import { isAcceptableProfilePhotoFile } from "./storage";

function makeFile(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("isAcceptableProfilePhotoFile", () => {
  it("accepts standard image MIME types", () => {
    expect(isAcceptableProfilePhotoFile(makeFile("photo.jpg", "image/jpeg"))).toBe(true);
    expect(isAcceptableProfilePhotoFile(makeFile("photo.png", "image/png"))).toBe(true);
    expect(isAcceptableProfilePhotoFile(makeFile("photo.gif", "image/gif"))).toBe(true);
  });

  it("accepts HEIC/HEIF, the default iPhone camera format", () => {
    expect(isAcceptableProfilePhotoFile(makeFile("IMG_1234.heic", "image/heic"))).toBe(true);
    expect(isAcceptableProfilePhotoFile(makeFile("IMG_1234.heif", "image/heif"))).toBe(true);
  });

  it("falls back to the file extension when the browser reports no/generic MIME type", () => {
    expect(isAcceptableProfilePhotoFile(makeFile("IMG_1234.HEIC", ""))).toBe(true);
    expect(isAcceptableProfilePhotoFile(makeFile("IMG_1234.heic", "application/octet-stream"))).toBe(true);
    expect(isAcceptableProfilePhotoFile(makeFile("photo.jpg", ""))).toBe(true);
  });

  it("rejects non-image files even with a generic MIME type", () => {
    expect(isAcceptableProfilePhotoFile(makeFile("resume.pdf", "application/octet-stream"))).toBe(false);
    expect(isAcceptableProfilePhotoFile(makeFile("notes.txt", ""))).toBe(false);
  });

  it("rejects unsupported explicit MIME types", () => {
    expect(isAcceptableProfilePhotoFile(makeFile("clip.mp4", "video/mp4"))).toBe(false);
  });
});
