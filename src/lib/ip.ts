// src/lib/ip.ts
import crypto from "crypto";

export function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT || "";
  // If salt missing, still return something stable-ish, but you SHOULD set salt.
  return crypto.createHmac("sha256", salt || "missing_salt").update(ip).digest("hex");
}