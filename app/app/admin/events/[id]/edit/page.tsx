"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    status: "draft" as "draft" | "published",
    featured: false,
    image: "" as string,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      // TODO: Load event data from database
      setMounted(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

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
    // TODO: Implement event update
    console.log("Update event:", eventId, formData);
    router.push("/app/admin/events");
  };

  if (!mounted || loading) {
    return (
      <LoadingScreen message="Loading" subtitle="Loading event details..." />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Edit Event</h1>
        <p className="text-[#a0704a] mt-1">Update event details</p>
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
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed event description"
              rows={4}
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
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
            <Button variant="primary" size="md" type="submit">
              Save Changes
            </Button>
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => router.push("/app/admin/events")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
