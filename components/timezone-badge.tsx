"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export default function TimezoneBadge({ className = "" }: { className?: string }) {
  const [timeZone, setTimeZone] = useState("Asia/Manila");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const tz = String(data?.settings?.uiPreferences?.timezone || "").trim();
        if (tz) setTimeZone(tz);
      } catch {
        // keep default timezone label
      }
    })();
  }, []);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded border bg-slate-50 text-slate-700 text-xs ${className}`}>
      TZ: {timeZone}
    </span>
  );
}
