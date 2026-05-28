/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Shield, User, X } from "lucide-react";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface RoomUserInfo {
  user: UserInfo;
  role: string;
}

interface AdminPanelProps {
  roomId: string;
}

const AdminPanel = ({ roomId }: AdminPanelProps) => {
  const [admins, setAdmins] = useState<RoomUserInfo[]>([]);
  const [users, setUsers] = useState<RoomUserInfo[]>([]);
  const [creatorId, setCreatorId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}/admin`);
      const data = await res.json();
      setAdmins(data.admins || []);
      setUsers(data.users || []);
      setCreatorId(data.creatorId || "");
    } catch (err) {
      console.error("Error fetching room users:", err);
    }
  };

  const toggleAdmin = async (targetUserId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomId}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message);
        await fetchUsers();
      } else {
        toast(data.error || "Failed to update role");
      }
    } catch {
      toast("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  return (
    <div className="mt-4">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="w-full text-sm font-medium border-gray-300 hover:bg-gray-100"
      >
        <Shield className="w-4 h-4 mr-2" />
        Manage Admins
      </Button>

      {isOpen && (
        <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-[40vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Room Members</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {users.map((ru) => {
            const isCreator = ru.user.id === creatorId;
            const isAdmin = ru.role === "ADMIN";
            return (
              <div
                key={ru.user.id}
                className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCreator ? (
                    <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : isAdmin ? (
                    <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {ru.user.name || ru.user.email}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {isCreator ? "Creator" : isAdmin ? "Admin" : "Member"}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {!isCreator && (
                    <Button
                      size="sm"
                      variant={isAdmin ? "destructive" : "outline"}
                      className="h-7 px-2 text-[10px]"
                      disabled={loading}
                      onClick={() => toggleAdmin(ru.user.id)}
                    >
                      {isAdmin ? "Demote" : "Promote"}
                    </Button>
                  )}
                  {isCreator && (
                    <span className="text-[10px] text-yellow-600 font-medium">
                      Owner
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
