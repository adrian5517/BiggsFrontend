"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth, getUser } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type ProfileUser = {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
  address?: string;
  managedBranches?: string[];
  managed_branches?: string[];
  branches?: string[];
};

type AdminUser = {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  managedBranches?: string[];
  managed_branches?: string[];
  branches?: string[];
};

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function roleClass(role: string) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "superadmin") return "bg-amber-100 text-amber-900 border border-amber-200";
  if (normalized === "admin") return "bg-sky-100 text-sky-800 border border-sky-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function normalizeBranchList(value: any): string[] {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim());
  return Array.from(new Set(list.map((item) => String(item || "").trim()).filter(Boolean)));
}

export default function UsersPage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({ username: "", address: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managerBranchesInput, setManagerBranchesInput] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminError, setAdminError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const localUser = getUser();
      const userId = String(localUser?._id || localUser?.id || "").trim();

      if (!userId) {
        setProfile(localUser || null);
        setLoading(false);
        return;
      }

      const resp = await fetchWithAuth(`${API_BASE}/api/auth/users/${encodeURIComponent(userId)}`, { method: "GET" });
      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setProfile(localUser || null);
        setError(json?.message || "Unable to load profile details from server.");
        return;
      }

      const remoteUser = json?.user && typeof json.user === "object" ? json.user : null;
      const nextProfile = remoteUser || localUser || null;
      setProfile(nextProfile);
      setForm({
        username: String(nextProfile?.username || ""),
        address: String(nextProfile?.address || ""),
      });
    } catch (e: any) {
      const fallback = getUser();
      setProfile(fallback);
      setForm({
        username: String(fallback?.username || ""),
        address: String(fallback?.address || ""),
      });
      setError(e?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const persistLocalUser = (nextUser: any) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem("user", JSON.stringify(nextUser));
    } catch {
      // ignore local storage persistence errors
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const resp = await fetchWithAuth(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.username || "").trim(),
          address: String(form.address || "").trim(),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(json?.message || "Failed to update profile.");
        return;
      }
      const updated = json?.user && typeof json.user === "object" ? json.user : null;
      if (updated) {
        setProfile(updated);
        persistLocalUser(updated);
      }
      setNotice(json?.message || "Profile updated successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setNotice("");
    setError("");
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const resp = await fetchWithAuth(`${API_BASE}/api/auth/profile-picture`, {
        method: "POST",
        body: formData,
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(json?.message || "Failed to upload profile picture.");
        return;
      }
      const updated = json?.user && typeof json.user === "object" ? json.user : null;
      if (updated) {
        setProfile(updated);
        persistLocalUser(updated);
      }
      setNotice(json?.message || "Profile picture updated successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordNotice("");

    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError("Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 symbol.");
      return;
    }

    setChangingPassword(true);
    try {
      const resp = await fetchWithAuth(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setPasswordError(json?.message || "Failed to change password.");
        return;
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice(json?.message || "Password changed successfully.");
    } catch (e: any) {
      setPasswordError(e?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const loadAdminUsersAndBranches = async () => {
    setAdminLoading(true);
    setAdminError("");
    try {
      const [usersResp, branchesResp] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/auth/users`, { method: "GET" }),
        fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: "GET" }),
      ]);

      const usersJson = await usersResp.json().catch(() => ({}));
      const branchesJson = await branchesResp.json().catch(() => ({}));

      if (!usersResp.ok) {
        setAdminError(usersJson?.message || "Failed to load users.");
        return;
      }

      const users = Array.isArray(usersJson?.users) ? usersJson.users : [];
      const managers = users.filter((user: any) => String(user?.role || "").toLowerCase() === "manager");
      setAdminUsers(managers);

      const branches: string[] = Array.isArray(branchesJson?.branches)
        ? branchesJson.branches.map((item: any) => String(item || "").trim()).filter(Boolean)
        : [];
      setBranchOptions(Array.from(new Set(branches)).sort());
    } catch (error: any) {
      setAdminError(error?.message || "Failed to load admin manager tools.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSelectManager = (managerId: string) => {
    setSelectedManagerId(managerId);
    setAdminNotice("");
    setAdminError("");
    const manager = adminUsers.find((item) => String(item?._id || item?.id || "") === managerId);
    const scopes = normalizeBranchList(
      manager?.managedBranches && manager.managedBranches.length
        ? manager.managedBranches
        : (manager?.managed_branches && manager.managed_branches.length
            ? manager.managed_branches
            : manager?.branches)
    );
    setManagerBranchesInput(scopes.join(", "));
  };

  const toggleManagerBranch = (branch: string) => {
    const current = normalizeBranchList(managerBranchesInput);
    const hasBranch = current.includes(branch);
    const next = hasBranch ? current.filter((item) => item !== branch) : [...current, branch];
    setManagerBranchesInput(next.join(", "));
  };

  const handleSaveManagerBranches = async () => {
    if (!selectedManagerId) {
      setAdminError("Select a manager first.");
      return;
    }

    setAdminSaving(true);
    setAdminNotice("");
    setAdminError("");

    try {
      const scopedBranches = normalizeBranchList(managerBranchesInput);
      const resp = await fetchWithAuth(`${API_BASE}/api/auth/users/${encodeURIComponent(selectedManagerId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager", managedBranches: scopedBranches }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setAdminError(json?.message || "Failed to update manager branches.");
        return;
      }

      setAdminNotice(json?.message || "Manager branch scope updated.");
      await loadAdminUsersAndBranches();
    } catch (error: any) {
      setAdminError(error?.message || "Failed to update manager branches.");
    } finally {
      setAdminSaving(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    const role = String(profile?.role || "").toLowerCase();
    if (role === "admin") {
      void loadAdminUsersAndBranches();
    }
  }, [profile?.role]);

  const name = String(profile?.username || "User");
  const email = String(profile?.email || "—");
  const role = String(profile?.role || "user");
  const managedBranches = normalizeBranchList(
    profile?.managedBranches && profile.managedBranches.length
      ? profile.managedBranches
      : (profile?.managed_branches && profile.managed_branches.length
          ? profile.managed_branches
          : profile?.branches)
  );
  const avatarSeed = encodeURIComponent(name || email || "user");
  const avatar = profile?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`;
  const userId = String(profile?._id || profile?.id || "—");

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 text-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-slate-200 text-sm mt-1">Manage your account details and review your access metadata.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm p-3">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm p-3">{notice}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <img src={avatar} alt={name} className="w-24 h-24 rounded-full border border-slate-200 object-cover" />
            <label className="mt-3 inline-flex items-center justify-center h-9 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs cursor-pointer">
              {uploadingAvatar ? "Uploading..." : "Change Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                  void handleAvatarUpload(file);
                  e.currentTarget.value = "";
                }}
                disabled={uploadingAvatar}
              />
            </label>
            <h2 className="text-xl font-semibold text-slate-900 mt-3">{loading ? "Loading..." : name}</h2>
            <p className="text-sm text-slate-600 mt-1 break-all">{loading ? "" : email}</p>
            <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${roleClass(role)}`}>
              {role}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Username</div>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                disabled={loading || saving}
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
              <div className="mt-1 text-slate-900 font-medium break-all">{loading ? "Loading..." : email}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-1 text-slate-900 font-medium">{loading ? "Loading..." : role}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">User ID</div>
              <div className="mt-1 text-slate-900 font-medium break-all">{loading ? "Loading..." : userId}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Created At</div>
              <div className="mt-1 text-slate-900 font-medium">{loading ? "Loading..." : formatDate(profile?.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Updated At</div>
              <div className="mt-1 text-slate-900 font-medium">{loading ? "Loading..." : formatDate(profile?.updatedAt)}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Address</div>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[72px]"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                disabled={loading || saving}
              />
            </div>

            {String(role).toLowerCase() === "manager" ? (
              <div className="md:col-span-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Assigned Branches</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {managedBranches.length > 0 ? (
                    managedBranches.map((branch) => (
                      <span
                        key={branch}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {branch}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No branch scope assigned yet.</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={loading || saving}
              className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => void loadProfile()}
              disabled={loading || saving}
              className="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
            >
              {loading ? "Refreshing..." : "Reload"}
            </button>
            <a
              href="/settings"
              className="h-10 px-4 inline-flex items-center rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800"
            >
              Go to Settings
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
            <p className="text-sm text-slate-600 mt-1">Keep your account secure by setting a strong, unique password.</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            Security
          </span>
        </div>

        {passwordError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{passwordError}</div>
        ) : null}
        {passwordNotice ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm p-3">{passwordNotice}</div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Current Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              disabled={changingPassword}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleChangePassword()}
            disabled={changingPassword}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm disabled:opacity-60"
          >
            {changingPassword ? "Updating Password..." : "Update Password"}
          </button>
        </div>
      </div>

      {String(profile?.role || "").toLowerCase() === "admin" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Manager Branch Assignment</h3>
              <p className="text-sm text-slate-600 mt-1">Assign branch scope to manager accounts.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              Admin
            </span>
          </div>

          {adminError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{adminError}</div>
          ) : null}
          {adminNotice ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm p-3">{adminNotice}</div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Manager Account</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedManagerId}
                onChange={(e) => handleSelectManager(e.target.value)}
                disabled={adminLoading || adminSaving}
              >
                <option value="">Select manager</option>
                {adminUsers.map((user) => {
                  const id = String(user?._id || user?.id || "");
                  const label = `${user?.username || "unknown"} (${user?.email || "no-email"})`;
                  return (
                    <option key={id} value={id}>{label}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Assigned Branches (comma separated)</label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={managerBranchesInput}
                onChange={(e) => setManagerBranchesInput(e.target.value)}
                placeholder="AYALA-FRN, REPLAY-TEST"
                disabled={adminLoading || adminSaving || !selectedManagerId}
              />
            </div>
          </div>

          {branchOptions.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Quick Select</div>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-auto pr-1">
                {branchOptions.map((branch) => {
                  const selected = normalizeBranchList(managerBranchesInput).includes(branch);
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => toggleManagerBranch(branch)}
                      disabled={adminLoading || adminSaving || !selectedManagerId}
                      className={`px-3 py-1.5 rounded-full text-xs border ${selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} disabled:opacity-60`}
                    >
                      {branch}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleSaveManagerBranches()}
              disabled={adminLoading || adminSaving || !selectedManagerId}
              className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm disabled:opacity-60"
            >
              {adminSaving ? "Saving..." : "Save Manager Scope"}
            </button>
            <button
              type="button"
              onClick={() => void loadAdminUsersAndBranches()}
              disabled={adminLoading || adminSaving}
              className="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm disabled:opacity-60"
            >
              {adminLoading ? "Refreshing..." : "Reload"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
