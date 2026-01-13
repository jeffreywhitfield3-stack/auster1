import { Suspense } from "react";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata = {
  title: "Unsubscribe - Austerian",
  description: "Manage your email preferences",
};

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeClient />
    </Suspense>
  );
}
