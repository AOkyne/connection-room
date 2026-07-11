"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { useToast } from "@/lib/hooks/useToast";
import { registerForEvent, cancelRegistration } from "@/lib/admin/registrations";

interface EventRegistrationModalProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  isOpen: boolean;
  isRegistered: boolean;
  userId: string;
  onClose: () => void;
  onRegistrationChange: (isRegistered: boolean) => void;
}

export function EventRegistrationModal({
  eventId,
  eventTitle,
  eventDate,
  isOpen,
  isRegistered,
  userId,
  onClose,
  onRegistrationChange,
}: EventRegistrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerForEvent(
        eventId,
        userId,
        formData.name,
        formData.email,
        eventTitle,
        eventDate
      );

      if (result) {
        showToast(`Registered for "${eventTitle}"!`, "success");
        onRegistrationChange(true);
        onClose();
      } else {
        showToast("Failed to register. Please try again.", "error");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showToast("Error registering for event", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await cancelRegistration(eventId, userId, eventTitle, formData.name, formData.email, eventDate);

      if (result) {
        showToast(`Cancelled registration for "${eventTitle}"`, "success");
        onRegistrationChange(false);
        onClose();
      } else {
        showToast("Failed to cancel registration. Please try again.", "error");
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      showToast("Error cancelling registration", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1a0f0a]">
              {isRegistered ? "Event Registration" : "Register for Event"}
            </h2>
            <p className="text-sm text-[#a0704a] mt-1">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#a0704a] hover:text-[#1a0f0a] text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {isRegistered ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ You are registered for this event
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-red-600 w-full"
            >
              {isLoading ? "Cancelling..." : "Cancel Registration"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Registering..." : "Complete Registration"}
              </Button>
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
