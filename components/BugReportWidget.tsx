"use client";

import { useState, useRef } from "react";

export function BugReportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    severity: "medium",
    device: "iPhone",
    os: "iOS 17",
    steps: "",
    expected: "",
    actual: "",
    notes: "",
    screenshot: null as string | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          screenshot: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter a bug title");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/report-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit bug report");
      }

      setSubmitStatus("success");
      setFormData({
        title: "",
        severity: "medium",
        device: "iPhone",
        os: "iOS 17",
        steps: "",
        expected: "",
        actual: "",
        notes: "",
        screenshot: null,
      });

      setTimeout(() => {
        setIsOpen(false);
        setSubmitStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Bug report error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const notesLength = formData.notes.length;
  const charsRemaining = 4000 - notesLength;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
          color: "#FFFDF8",
          fontSize: "24px",
        }}
        title="Report a bug"
      >
        🐛
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <>
          <style>{`
            .bug-report-overlay {
              padding: 20px !important;
              position: fixed !important;
              inset: 0 !important;
              z-index: 9999 !important;
            }
            .bug-report-modal {
              background: #FDFBF6 !important;
              max-height: 85vh !important;
              border-radius: 18px !important;
              margin: 0 auto !important;
            }
          `}</style>
          <div
            className="bug-report-overlay fixed inset-0 bg-black/30 flex items-end md:items-center justify-center"
            onClick={() => !isSubmitting && setIsOpen(false)}
          >
            {/* Modal */}
            <div
              className="bug-report-modal bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div
              className="sticky top-0 px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "#D9CDB8", background: "#FDFBF6" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#2C2417" }}>
                Report a Bug
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="text-2xl opacity-60 hover:opacity-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                  Bug Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Profile photo won't upload on mobile"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "#D9CDB8",
                    color: "#2C2417",
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                  disabled={isSubmitting}
                >
                  <option value="low">Low (cosmetic)</option>
                  <option value="medium">Medium (partially broken)</option>
                  <option value="high">High (completely broken)</option>
                  <option value="critical">Critical (app broken/data lost)</option>
                </select>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                    Device
                  </label>
                  <input
                    type="text"
                    name="device"
                    value={formData.device}
                    onChange={handleInputChange}
                    placeholder="iPhone 15"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                    OS Version
                  </label>
                  <input
                    type="text"
                    name="os"
                    value={formData.os}
                    onChange={handleInputChange}
                    placeholder="iOS 17.2"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Steps */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                  Steps to Reproduce
                </label>
                <textarea
                  name="steps"
                  value={formData.steps}
                  onChange={handleInputChange}
                  placeholder="1. Click X&#10;2. Then click Y&#10;3. Bug happens"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                    Expected Behavior
                  </label>
                  <textarea
                    name="expected"
                    value={formData.expected}
                    onChange={handleInputChange}
                    placeholder="What should have happened"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                    Actual Behavior
                  </label>
                  <textarea
                    name="actual"
                    value={formData.actual}
                    onChange={handleInputChange}
                    placeholder="What actually happened"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: "#D9CDB8", color: "#2C2417" }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                  Additional Notes ({notesLength}/4000)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any other details that might help us..."
                  rows={3}
                  maxLength={4000}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: charsRemaining < 100 ? "#A67C2A" : "#D9CDB8",
                    color: "#2C2417",
                  }}
                  disabled={isSubmitting}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: charsRemaining < 100 ? "#A67C2A" : "#7A6F62" }}
                >
                  {charsRemaining} characters remaining
                </p>
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C2417" }}>
                  Screenshot (optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                {formData.screenshot ? (
                  <div className="space-y-2">
                    <img
                      src={formData.screenshot}
                      alt="Screenshot preview"
                      className="w-full rounded-lg border max-h-40 object-cover"
                      style={{ borderColor: "#D9CDB8" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, screenshot: null }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 rounded-lg border-2 border-dashed text-sm transition-colors"
                    style={{
                      borderColor: "#D9CDB8",
                      color: "#7A6F62",
                      background: "#F5EFE3",
                    }}
                    disabled={isSubmitting}
                  >
                    Click to upload or drag & drop
                  </button>
                )}
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div
                  className="p-3 rounded-lg text-sm text-white bg-green-600"
                >
                  ✓ Bug report submitted! Thank you for helping us improve.
                </div>
              )}
              {submitStatus === "error" && (
                <div
                  className="p-3 rounded-lg text-sm text-white bg-red-600"
                >
                  ✗ Failed to submit. Please try again or email support@trevorjamesla.com
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Bug Report"}
              </button>
            </form>
          </div>
          </div>
        </>
      )}
    </>
  );
}
