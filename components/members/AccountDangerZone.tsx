"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconAlert } from "@/components/Icons";
import { clearSession } from "@/lib/session";
import { deactivateOwnAccount, deleteOwnAccount } from "@/lib/account/actions";

export function AccountDangerZone() {
  const router = useRouter();
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError("");
    try {
      const success = await deactivateOwnAccount();
      if (!success) {
        setError("Something went wrong deactivating your account. Please try again.");
        setIsDeactivating(false);
        return;
      }
      await clearSession();
      router.push("/");
    } catch (err) {
      console.error("Error deactivating account:", err);
      setError("Something went wrong deactivating your account. Please try again.");
      setIsDeactivating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    setError("");
    try {
      const { success, error: deleteError } = await deleteOwnAccount();
      if (!success) {
        setError(deleteError || "Something went wrong deleting your account. Please try again.");
        setIsDeleting(false);
        return;
      }
      await clearSession();
      router.push("/");
    } catch (err) {
      console.error("Error deleting account:", err);
      setError("Something went wrong deleting your account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-red-200">
        <CardHeader title="Account" icon={<IconAlert size={20} />} />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium text-[#1a0f0a]">Deactivate my account</p>
              <p className="text-sm text-[#a0704a]">
                Hides your profile from other members and community spaces. Your data is
                kept, and signing back in reactivates your account automatically.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError("");
                setShowDeactivateConfirm(true);
              }}
            >
              Deactivate
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-4 border-t border-[#e8ddd2]">
            <div>
              <p className="font-medium text-red-700">Delete my account</p>
              <p className="text-sm text-[#a0704a]">
                Permanently removes your account, login access, and all associated data.
                This cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300"
              onClick={() => {
                setError("");
                setDeleteConfirmText("");
                setShowDeleteConfirm(true);
              }}
            >
              Delete Account
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </Card>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1a0f0a]">Deactivate your account?</h2>
              <p className="text-sm text-[#a0704a]">
                Other members will no longer see your profile in spaces or the community
                grid. Your data isn&rsquo;t deleted -- signing back in with your email and
                password reactivates everything automatically.
              </p>
              <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300"
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? "Deactivating..." : "Yes, Deactivate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeactivateConfirm(false)}
                  disabled={isDeactivating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-red-600">Delete your account?</h2>
              <p className="text-sm text-[#a0704a]">
                This permanently deletes your account, login access, and all associated
                data (badges, journey progress, event registrations, connections). This
                cannot be undone.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                  Type <span className="font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-[#1a0f0a]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  className="font-medium rounded-xl transition-all duration-150 px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
