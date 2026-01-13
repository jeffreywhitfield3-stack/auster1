"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, CreditCard, BarChart3, Shield } from "lucide-react";

const navItems = [
  {
    name: "Account",
    href: "/settings/account",
    icon: User,
    description: "Profile and password",
  },
  {
    name: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
    description: "Email preferences",
  },
  {
    name: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
    description: "Subscription and invoices",
  },
  {
    name: "Usage",
    href: "/settings/usage",
    icon: BarChart3,
    description: "API usage and limits",
  },
  {
    name: "Security",
    href: "/settings/security",
    icon: Shield,
    description: "Password and sessions",
  },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-neutral-300 hover:bg-neutral-700/50 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">{item.name}</div>
                <div
                  className={`text-xs mt-0.5 ${
                    isActive ? "text-blue-100" : "text-neutral-500"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
