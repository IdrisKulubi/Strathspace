'use client';

import React, { useEffect } from 'react';
import { useNotifications, useStrathSpeedRealtimeStore } from '@/lib/stores/strathspeed-realtime-store';
import { X, Heart, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationToast() {
  const notifications = useNotifications();
  const { clearNotifications } = useStrathSpeedRealtimeStore();

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotifications();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications, clearNotifications]);

  if (notifications.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white border-green-600';
      case 'error':
        return 'bg-red-500 text-white border-red-600';
      case 'warning':
        return 'bg-orange-500 text-white border-orange-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'flex items-center gap-3 p-4 rounded-2xl border-2 shadow-lg backdrop-blur-sm animate-slide-in',
            getStyles(notification.type)
          )}
        >
          {getIcon(notification.type)}
          <p className="flex-1 text-sm font-medium">
            {notification.message}
          </p>
          <button
            onClick={clearNotifications}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
} 