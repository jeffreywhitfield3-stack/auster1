// src/components/blog/AdminImageUpload.tsx
"use client";

import React, { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  folder: "covers" | "inline";
  onUploaded: (args: { path: string; publicUrl: string; markdown?: string }) => void;
  label: string;
};

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.(png|jpg|jpeg|webp|gif)$/);
  return m?.[1] || "png";
}

export default function AdminImageUpload({ folder, onUploaded, label }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");

    try {
      const { data: sess } = await supabase.auth.getSession();
      const email = sess.session?.user?.email || "";
      if (email !== "jeffreywhitfield3@gmail.com") {
        setMsg("Not authorized.");
        return;
      }

      const ext = extFromName(file.name);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `${folder}/${stamp}-${Math.random().toString(16).slice(2)}.${ext}`;

      const up = await supabase.storage.from("blog-covers").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

      if (up.error) {
        setMsg(up.error.message);
        return;
      }

      const pub = supabase.storage.from("blog-covers").getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      onUploaded({
        path,
        publicUrl,
        markdown: folder === "inline" ? `![image](${publicUrl})` : undefined,
      });

      setMsg("Uploaded.");
    } catch (e: any) {
      setMsg(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <label className="cursor-pointer rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
          {busy ? "Uploading…" : "Choose image"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            disabled={busy}
          />
        </label>
        {msg ? <div className="text-sm text-zinc-600">{msg}</div> : null}
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Uploads to <span className="font-mono">blog-covers/{folder}/</span>
      </div>
    </div>
  );
}