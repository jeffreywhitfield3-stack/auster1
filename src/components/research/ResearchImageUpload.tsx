"use client";

import React, { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface UploadedImage {
  path: string;
  publicUrl: string;
  caption: string;
}

interface Props {
  onImageAdded: (image: UploadedImage) => void;
  onImageRemoved: (publicUrl: string) => void;
  images: UploadedImage[];
}

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.(png|jpg|jpeg|webp|gif)$/);
  return m?.[1] || "png";
}

export default function ResearchImageUpload({ onImageAdded, onImageRemoved, images }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");

    try {
      // Check if bucket exists, if not you'll need to create it in Supabase dashboard
      // Bucket name: "research-images" with public access

      const ext = extFromName(file.name);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `${stamp}-${Math.random().toString(16).slice(2)}.${ext}`;

      const up = await supabase.storage.from("research-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

      if (up.error) {
        setMsg(up.error.message);
        return;
      }

      const pub = supabase.storage.from("research-images").getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      onImageAdded({
        path,
        publicUrl,
        caption: "",
      });

      setMsg("Image uploaded successfully.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setMsg(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateCaption(publicUrl: string, newCaption: string) {
    const image = images.find((img) => img.publicUrl === publicUrl);
    if (image) {
      onImageRemoved(publicUrl);
      onImageAdded({ ...image, caption: newCaption });
    }
    setEditingCaption(null);
    setCaptionText("");
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          {busy ? "Uploading..." : "📷 Upload Image"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            disabled={busy}
          />
        </label>
        {msg && <div className="mt-2 text-sm text-zinc-600">{msg}</div>}
        <p className="mt-2 text-xs text-zinc-500">
          Upload charts, graphs, or visualizations to support your research
        </p>
      </div>

      {/* Uploaded Images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-900">Uploaded Images ({images.length})</h4>
          {images.map((image) => (
            <div key={image.publicUrl} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                  <img
                    src={image.publicUrl}
                    alt={image.caption || "Research image"}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1">
                  {editingCaption === image.publicUrl ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Add caption (e.g., 'Figure 1: Income distribution by quintile')"
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCaption(image.publicUrl, captionText)}
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCaption(null);
                            setCaptionText("");
                          }}
                          className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {image.caption ? (
                        <p className="text-sm text-zinc-900">{image.caption}</p>
                      ) : (
                        <p className="text-sm italic text-zinc-500">No caption</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCaption(image.publicUrl);
                            setCaptionText(image.caption);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {image.caption ? "Edit Caption" : "Add Caption"}
                        </button>
                        <span className="text-zinc-300">|</span>
                        <button
                          onClick={() => onImageRemoved(image.publicUrl)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
