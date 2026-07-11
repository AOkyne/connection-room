"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { createEvent } from "@/lib/admin/events";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useToast } from "@/lib/hooks/useToast";

export default function CreateEventPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    facilitator: "",
    format: "online" as "online" | "in-person" | "hybrid",
    status: "draft" as "draft" | "published",
    featured: false,
    image: "" as string,
    price: "",
    currency: "USD",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const savedDraft = localStorage.getItem("connection-room:event-draft");
      if (savedDraft) {
        try {
          setFormData(JSON.parse(savedDraft));
        } catch (err) {
          console.error("Error loading saved draft:", err);
        }
      }

      setMounted(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem("connection-room:event-draft", JSON.stringify(formData));
    }, 3000);

    return () => clearInterval(timer);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          image: base64String,
        }));
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: "",
    }));
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("[CreateEvent] Form submitted");

    if (!formData.title.trim()) {
      console.log("[CreateEvent] Validation failed: no title");
      showToast("Event title is required", "error");
      return;
    }

    setSaving(true);
    console.log("[CreateEvent] Starting event creation...");

    try {
      const eventData = {
        title: formData.title,
        shortDescription: formData.shortDescription,
        description: formData.description,
        startAt: formData.startAt,
        endAt: formData.endAt,
        locationName: formData.location,
        hostName: formData.facilitator,
        eventType: formData.format,
        imageUrl: formData.image,
        status: formData.status as "draft" | "published",
        featured: formData.featured,
        visibility: "members" as const,
        priceCents: formData.price ? Math.round(parseFloat(formData.price) * 100) : undefined,
        currency: formData.price ? formData.currency : undefined,
      };

      console.log("[CreateEvent] Event data prepared:", { title: eventData.title, status: eventData.status });

      const result = await createEvent(eventData);
      console.log("[CreateEvent] createEvent returned:", result ? `Event ${result.id}` : "null");

      if (result) {
        console.log("[CreateEvent] Success - clearing draft and redirecting");
        localStorage.removeItem("connection-room:event-draft");
        showToast("Event created successfully!", "success");

        // Ensure redirect happens
        setTimeout(() => {
          console.log("[CreateEvent] Navigating to events list");
          router.push("/app/admin/events");
        }, 100);
      } else {
        console.log("[CreateEvent] Failed - result was null");
        showToast("Failed to create event - please try again", "error");
      }
    } catch (error) {
      console.error("[CreateEvent] Caught exception:", error);
      showToast(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setSaving(false);
      console.log("[CreateEvent] Form submission complete");
    }
  };

  if (!mounted || loading) {
    return (
      <LoadingScreen message="Loading" subtitle="Setting up event creation..." />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Create Event</h1>
        <p className="text-[#a0704a] mt-1">Add a new community event</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              required
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
              Short Description
            </label>
            <input
              type="text"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="Brief description for listing"
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
              Event Image
            </label>
            {imagePreview ? (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt="Event preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={removeImage}
                  className="text-red-600"
                >
                  Remove Image
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-[#e8ddd2] rounded-lg cursor-pointer hover:border-[#d4a348] transition-colors">
                <div className="text-center">
                  <p className="text-[#a0704a] mb-1">📸 Click to upload event image</p>
                  <p className="text-xs text-[#a0704a]">PNG, JPG, GIF up to 5MB</p>
                  <p className="text-xs text-[#a0704a] mt-1">Recommended: 4:3 aspect ratio (e.g., 1200×900px)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
              Full Description
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              placeholder="Detailed event description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                name="startAt"
                value={formData.startAt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                name="endAt"
                value={formData.endAt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Event location or 'Online'"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Facilitator
              </label>
              <input
                type="text"
                name="facilitator"
                value={formData.facilitator}
                onChange={handleChange}
                placeholder="Facilitator name"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
              Event Format
            </label>
            <select
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
            >
              <option value="online">Online</option>
              <option value="in-person">In-person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Price (Optional)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[#1a0f0a]">
                  Featured Event
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#e8ddd2]">
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Event"}
            </Button>
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => router.push("/app/admin/events")}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
