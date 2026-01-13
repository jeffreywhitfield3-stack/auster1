import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Reset Password - Austerian",
  description: "Set a new password for your account",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
