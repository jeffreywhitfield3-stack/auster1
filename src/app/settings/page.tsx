import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to the account settings tab by default
  redirect("/settings/account");
}
