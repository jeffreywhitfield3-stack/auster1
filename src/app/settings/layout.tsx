import { Suspense } from "react";
import SettingsNav from "./SettingsNav";

export const metadata = {
  title: "Settings - Austerian",
  description: "Manage your account settings and preferences",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">
            Manage your account, preferences, and subscriptions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Suspense fallback={<div>Loading...</div>}>
              <SettingsNav />
            </Suspense>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <Suspense fallback={
              <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                  <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
                </div>
              </div>
            }>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
