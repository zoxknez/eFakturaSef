/**
 * Notifications Page - pregled i upravljanje notifikacijama
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { sr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  FileText, 
  X, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Calendar, 
  RefreshCw,
  ChevronRight,
  Send,
  XCircle,
  Ban,
  DollarSign,
  AlertCircle,
  Settings,
  Filter,
  Archive
} from 'lucide-react';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

type NotificationType = 
  | 'INVOICE_SENT'
  | 'INVOICE_ACCEPTED'
  | 'INVOICE_REJECTED'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'VAT_DEADLINE'
  | 'SYSTEM_UPDATE'
  | 'WARNING'
  | 'ERROR';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  INVOICE_SENT: <Send className="w-5 h-5 text-blue-600" />,
  INVOICE_ACCEPTED: <Check className="w-5 h-5 text-green-600" />,
  INVOICE_REJECTED: <XCircle className="w-5 h-5 text-red-600" />,
  INVOICE_CANCELLED: <Ban className="w-5 h-5 text-gray-600" />,
  PAYMENT_RECEIVED: <DollarSign className="w-5 h-5 text-emerald-600" />,
  PAYMENT_OVERDUE: <Clock className="w-5 h-5 text-orange-600" />,
  VAT_DEADLINE: <Calendar className="w-5 h-5 text-purple-600" />,
  SYSTEM_UPDATE: <Settings className="w-5 h-5 text-cyan-600" />,
  WARNING: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  ERROR: <AlertCircle className="w-5 h-5 text-red-600" />
};

const notificationColors: Record<NotificationType, string> = {
  INVOICE_SENT: 'bg-blue-100 border-blue-200',
  INVOICE_ACCEPTED: 'bg-green-100 border-green-200',
  INVOICE_REJECTED: 'bg-red-100 border-red-200',
  INVOICE_CANCELLED: 'bg-gray-100 border-gray-200',
  PAYMENT_RECEIVED: 'bg-emerald-100 border-emerald-200',
  PAYMENT_OVERDUE: 'bg-orange-100 border-orange-200',
  VAT_DEADLINE: 'bg-purple-100 border-purple-200',
  SYSTEM_UPDATE: 'bg-cyan-100 border-cyan-200',
  WARNING: 'bg-amber-100 border-amber-200',
  ERROR: 'bg-red-100 border-red-200'
};

const typeLabels: Record<NotificationType, string> = {
  INVOICE_SENT: 'Faktura poslata',
  INVOICE_ACCEPTED: 'Faktura prihvaćena',
  INVOICE_REJECTED: 'Faktura odbijena',
  INVOICE_CANCELLED: 'Faktura stornirana',
  PAYMENT_RECEIVED: 'Plaćanje primljeno',
  PAYMENT_OVERDUE: 'Rok plaćanja istekao',
  VAT_DEADLINE: 'PDV rok',
  SYSTEM_UPDATE: 'Sistemsko obaveštenje',
  WARNING: 'Upozorenje',
  ERROR: 'Greška'
};

type FilterType = 'all' | 'unread' | NotificationType;

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch notifications using central API client
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params: { unreadOnly?: boolean; type?: string } = {};
      if (filter === 'unread') params.unreadOnly = true;
      else if (filter !== 'all') params.type = filter;
      
      const response = await api.getNotifications(params);
      return response;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const notifications: Notification[] = (notificationsResponse?.data?.data as Notification[]) || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.markNotificationAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifikacija označena kao pročitana');
    },
    onError: () => {
      toast.error('Greška pri označavanju notifikacije');
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await api.markAllNotificationsAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Sve notifikacije označene kao pročitane');
    },
    onError: () => {
      toast.error('Greška pri označavanju notifikacija');
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.deleteNotification(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications(new Set());
      toast.success('Notifikacija obrisana');
    },
    onError: () => {
      toast.error('Greška pri brisanju notifikacije');
    }
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return await api.clearAllNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications(new Set());
      toast.success('Sve notifikacije obrisane');
    },
    onError: () => {
      toast.error('Greška pri brisanju notifikacija');
    }
  });

  // Stats
  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
  const todayCount = notifications.filter((n: Notification) => {
    const today = new Date();
    const notifDate = new Date(n.createdAt);
    return notifDate.toDateString() === today.toDateString();
  }).length;

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  const selectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map((n: Notification) => n.id)));
    }
  };

  const handleMarkSelectedAsRead = () => {
    // Mark each selected notification as read
    selectedNotifications.forEach(id => {
      markAsReadMutation.mutate(id);
    });
    setSelectedNotifications(new Set());
  };

  const handleDeleteSelected = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    // Delete each selected notification
    selectedNotifications.forEach(id => {
      deleteNotificationMutation.mutate(id);
    });
    setDeleteConfirmOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return formatDistanceToNow(date, { addSuffix: true, locale: sr });
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: sr });
    } else {
      return format(date, 'dd.MM.yyyy HH:mm', { locale: sr });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifikacije</h1>
              <p className="text-amber-200 mt-1">
                {unreadCount > 0 ? `${unreadCount} nepročitanih` : 'Sve notifikacije su pročitane'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all duration-200"
            >
              <CheckCheck className="w-4 h-4" />
              Označi sve kao pročitano
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-5 shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Bell className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm text-gray-500">Ukupno</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{notifications.length}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 p-5 shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">Nepročitane</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{unreadCount}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200/50 p-5 shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Danas</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{todayCount}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200/50 p-5 shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Check className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Selektovane</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{selectedNotifications.size}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4 shadow-lg">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sve
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'unread'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Nepročitane
          </button>
          <div className="w-px h-8 bg-gray-200 mx-2 self-center"></div>
          {(Object.keys(typeLabels) as NotificationType[]).slice(0, 6).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filter === type
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === type ? (
                <span className="text-white">{React.cloneElement(notificationIcons[type] as React.ReactElement, { className: 'w-4 h-4 text-white' })}</span>
              ) : (
                notificationIcons[type]
              )}
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <span className="text-amber-800 font-medium">
            {selectedNotifications.size} notifikacija selektovano
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleMarkSelectedAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:opacity-90 text-sm shadow-lg shadow-amber-500/25 transition-all duration-200"
            >
              <Check className="w-4 h-4" />
              Označi kao pročitano
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm shadow-lg transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Obriši
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-lg">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Učitavanje notifikacija...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-amber-500" />
          </div>
          <p className="text-gray-700 text-lg font-medium">Nema notifikacija</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter !== 'all' ? 'Probajte sa drugim filterom' : 'Nove notifikacije će se pojaviti ovde'}
          </p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden shadow-lg">
          {/* Select all */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                onChange={selectAll}
                className="w-5 h-5 text-amber-600 border-gray-300 rounded-lg focus:ring-amber-500 mr-3 cursor-pointer"
              />
              <span className="text-sm text-gray-600 font-medium">Selektuj sve</span>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Osveži
            </button>
          </div>

          {/* Notifications */}
          <div className="divide-y divide-gray-100">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-5 hover:bg-gray-50/80 transition-all duration-200 ${
                  !notification.isRead ? 'bg-amber-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => toggleSelection(notification.id)}
                    className="w-5 h-5 text-amber-600 border-gray-300 rounded-lg focus:ring-amber-500 mt-1 cursor-pointer"
                  />

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${notificationColors[notification.type]}`}>
                    {notificationIcons[notification.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                        {notification.data && Object.keys(notification.data).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.data.invoiceNumber && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 font-medium">
                                <FileText className="w-3 h-3" />
                                Faktura: {notification.data.invoiceNumber}
                              </span>
                            )}
                            {notification.data.amount && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-lg text-xs text-green-700 font-medium">
                                <DollarSign className="w-3 h-3" />
                                Iznos: {notification.data.amount.toLocaleString('sr-RS')} RSD
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2.5 h-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="mt-4 ml-[68px] flex gap-3">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Označi kao pročitano
                    </button>
                  )}
                  {notification.data?.invoiceId && (
                    <a
                      href={`/invoices/${notification.data.invoiceId}`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Otvori fakturu
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Brisanje notifikacija"
        message={`Da li ste sigurni da želite da obrišete ${selectedNotifications.size} notifikacija?`}
        confirmText="Obriši"
        variant="danger"
      />
    </div>
  );
}
