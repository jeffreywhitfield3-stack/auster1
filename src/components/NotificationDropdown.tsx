// src/components/NotificationDropdown.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [isOpen]);

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications/list?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function markAsRead(notificationId?: string) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId || null
        }),
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'new_follower':
        return '👤';
      case 'new_discussion':
        return '💬';
      case 'discussion_reply':
        return '↩️';
      case 'research_cited':
        return '📎';
      case 'research_published':
        return '📄';
      case 'tier_upgraded':
        return '⭐';
      case 'attribution_milestone':
        return '🎯';
      default:
        return '🔔';
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="relative flex items-center justify-center rounded-lg p-2 text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-zinc-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                disabled={isLoading}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-2 text-4xl">🔔</div>
                <p className="text-sm text-zinc-600">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id}>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => handleNotificationClick(notification)}
                      className={`block border-b border-zinc-100 p-4 transition-colors hover:bg-zinc-50 ${
                        !notification.read_at ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900">
                              {notification.title}
                            </p>
                            {!notification.read_at && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div
                      className={`border-b border-zinc-100 p-4 ${
                        !notification.read_at ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900">
                              {notification.title}
                            </p>
                            {!notification.read_at && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-zinc-200 p-2">
              <Link
                href="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="block rounded-lg p-2 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Notification settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
