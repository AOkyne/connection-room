"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  time: string;
  location?: string;
  format: "in-person" | "virtual" | "hybrid";
  facilitator: string;
  attendeeCount: number;
}

const EVENTS_STORAGE_KEY = "connection-room:custom-events";

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Event>({
    id: "",
    title: "",
    description: "",
    date: "",
    time: "",
    format: "virtual",
    facilitator: "",
    attendeeCount: 0,
  });

  // Load events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (stored) {
      setEvents(JSON.parse(stored));
    }
  }, []);

  // Save events to localStorage
  const saveEvents = (newEvents: Event[]) => {
    setEvents(newEvents);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(newEvents));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.time) {
      alert("Please fill in all required fields");
      return;
    }

    if (editingId) {
      // Update existing event
      const updated = events.map((e) => (e.id === editingId ? { ...formData, id: editingId } : e));
      saveEvents(updated);
      setEditingId(null);
    } else {
      // Add new event
      const newEvent = {
        ...formData,
        id: `event-${Date.now()}`,
      };
      saveEvents([...events, newEvent]);
    }

    // Reset form
    setFormData({
      id: "",
      title: "",
      description: "",
      date: "",
      time: "",
      format: "virtual",
      facilitator: "",
      attendeeCount: 0,
    });
    setShowForm(false);
  };

  const handleEdit = (event: Event) => {
    setFormData(event);
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      saveEvents(events.filter((e) => e.id !== id));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      id: "",
      title: "",
      description: "",
      date: "",
      time: "",
      format: "virtual",
      facilitator: "",
      attendeeCount: 0,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl text-[#2a2318]">Manage Events</h1>
        <Link href="/app/admin">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      {!showForm && (
        <Button variant="primary" size="md" onClick={() => setShowForm(true)}>
          + Add New Event
        </Button>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-[#2a2318]">
              {editingId ? "Edit Event" : "Create New Event"}
            </h2>

            <div>
              <label className="block text-sm font-medium text-[#2a2318] mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Monthly Connection Circle"
                className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a2318] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this event about?"
                rows={3}
                className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2a2318] mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2a2318] mb-1">
                  Time *
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="e.g., 7:00 PM PT"
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2a2318] mb-1">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                >
                  <option value="virtual">Virtual</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {(formData.format === "in-person" || formData.format === "hybrid") && (
                <div>
                  <label className="block text-sm font-medium text-[#2a2318] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Los Angeles, CA"
                    className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2a2318] mb-1">
                  Facilitator
                </label>
                <input
                  type="text"
                  value={formData.facilitator}
                  onChange={(e) => setFormData({ ...formData, facilitator: e.target.value })}
                  placeholder="e.g., Trevor James"
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2a2318] mb-1">
                  Attendee Count
                </label>
                <input
                  type="number"
                  value={formData.attendeeCount}
                  onChange={(e) => setFormData({ ...formData, attendeeCount: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" size="md" type="button" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" className="flex-1">
                {editingId ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2a2318]">Events ({events.length})</h2>

        {events.length === 0 ? (
          <p className="text-[#6b5f52]">No events yet. Create one to get started!</p>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#2a2318]">{event.title}</h3>
                  <p className="text-sm text-[#6b5f52] mt-1">{event.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-[#a0968a]">
                    <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                    <span>🕐 {event.time}</span>
                    <span>👥 {event.format}</span>
                    {event.location && <span>📍 {event.location}</span>}
                  </div>
                  <p className="text-sm text-[#8fa878] mt-2">Facilitator: {event.facilitator}</p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                    className="border-[#b86a52] text-[#b86a52]"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
