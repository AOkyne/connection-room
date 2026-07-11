"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";

interface Concern {
  id: string;
  userId: string;
  connectionId: string;
  concern: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  status: "pending" | "resolved";
  reviewed: boolean;
  adminNotes?: string;
}

type FilterStatus = "all" | "pending" | "resolved";
type FilterSeverity = "all" | "low" | "medium" | "high";
type SortBy = "date" | "severity";

export default function AdminConcernsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [filteredConcerns, setFilteredConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedConcern, setSelectedConcern] = useState<Concern | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      // Load concerns from localStorage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("connection-room:connection-reports");
        if (stored) {
          const data = JSON.parse(stored);
          setConcerns(data);
        }
      }

      setMounted(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = [...concerns];

    // Status filter
    if (filterStatus === "pending") {
      filtered = filtered.filter((c) => c.status === "pending");
    } else if (filterStatus === "resolved") {
      filtered = filtered.filter((c) => c.status === "resolved");
    }

    // Severity filter
    if (filterSeverity !== "all") {
      filtered = filtered.filter((c) => c.severity === filterSeverity);
    }

    // Sort
    if (sortBy === "date") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "severity") {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );
    }

    setFilteredConcerns(filtered);
  }, [concerns, filterStatus, filterSeverity, sortBy]);

  const handleResolve = (id: string) => {
    const updated = concerns.map((c) =>
      c.id === id ? { ...c, status: "resolved" as const } : c
    );
    setConcerns(updated);
    localStorage.setItem(
      "connection-room:connection-reports",
      JSON.stringify(updated)
    );
    showToast("Concern marked as resolved", "success");
    setShowDetailModal(false);
  };

  const handleSaveNotes = (id: string) => {
    const updated = concerns.map((c) =>
      c.id === id ? { ...c, adminNotes, reviewed: true } : c
    );
    setConcerns(updated);
    localStorage.setItem(
      "connection-room:connection-reports",
      JSON.stringify(updated)
    );
    showToast("Notes saved", "success");
  };

  if (!mounted || loading) {
    return (
      <LoadingScreen
        message="Loading concerns"
        subtitle="Fetching reported issues..."
      />
    );
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200 text-red-900";
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-900";
      default:
        return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const statusBadge = (status: string) => {
    return status === "resolved"
      ? "bg-green-100 text-green-800"
      : "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Reported Concerns</h1>
        <p className="text-[#a0704a] mt-1">
          Manage user-reported issues ({filteredConcerns.length} of {concerns.length})
        </p>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-sm text-[#a0704a] block mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-[#a0704a] block mb-1">Severity</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-[#a0704a] block mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="date">Date (Newest)</option>
            <option value="severity">Severity (High First)</option>
          </select>
        </div>
      </div>

      {/* Concerns List */}
      {filteredConcerns.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[#a0704a]">
            {concerns.length === 0
              ? "No concerns reported yet."
              : "No concerns matching your filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredConcerns.map((concern) => (
            <Card
              key={concern.id}
              className={`p-4 border-l-4 cursor-pointer hover:shadow-lg transition-shadow ${
                concern.severity === "high"
                  ? "border-l-red-500"
                  : concern.severity === "medium"
                    ? "border-l-yellow-500"
                    : "border-l-blue-500"
              }`}
              onClick={() => {
                setSelectedConcern(concern);
                setAdminNotes(concern.adminNotes || "");
                setShowDetailModal(true);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${statusBadge(
                        concern.status
                      )}`}
                    >
                      {concern.status === "resolved" ? "✓ Resolved" : "Pending"}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${severityColor(
                        concern.severity
                      )}`}
                    >
                      {concern.severity.charAt(0).toUpperCase() +
                        concern.severity.slice(1)}{" "}
                      Severity
                    </span>
                  </div>
                  <p className="text-[#1a0f0a] font-medium break-words">
                    {concern.concern}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-[#a0704a]">
                    <span>By: {concern.userId.substring(0, 8)}...</span>
                    <span>Connection: {concern.connectionId.substring(0, 8)}...</span>
                    <span>
                      Reported:{" "}
                      {new Date(concern.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {concern.adminNotes && (
                    <p className="text-xs text-[#1a0f0a] mt-2 p-2 bg-[#f3ede5] rounded">
                      <strong>Admin Notes:</strong> {concern.adminNotes}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-[#a0704a]">
                  {concern.reviewed ? "✓ Reviewed" : "Not reviewed"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedConcern && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1a0f0a]">
                  Concern Details
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-[#a0704a] hover:text-[#1a0f0a]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 p-3 bg-[#f3ede5] rounded">
                <div>
                  <p className="text-sm font-medium text-[#a0704a]">Concern</p>
                  <p className="text-[#1a0f0a]">{selectedConcern.concern}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[#a0704a]">Status</p>
                    <p className="text-[#1a0f0a] font-medium">
                      {selectedConcern.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0704a]">Severity</p>
                    <p className="text-[#1a0f0a] font-medium">
                      {selectedConcern.severity}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0704a]">Reported Date</p>
                    <p className="text-[#1a0f0a]">
                      {new Date(selectedConcern.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0704a]">Reviewed</p>
                    <p className="text-[#1a0f0a]">
                      {selectedConcern.reviewed ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#1a0f0a] block mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add resolution notes, investigation details, or actions taken..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                {selectedConcern.status === "pending" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolve(selectedConcern.id)}
                  >
                    Mark as Resolved
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleSaveNotes(selectedConcern.id)
                  }
                >
                  Save Notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
