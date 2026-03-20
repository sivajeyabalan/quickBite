import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import MenuCRUD      from './components/MenuCRUD';
import OrdersTable   from './components/OrdersTable';
import Analytics     from './components/Analytics';
import UsersManagement from './components/UsersManagement';
import { useSocket } from '../../hooks/useSocket';
import { PENDING_REFUND_COUNT_QUERY_KEY, usePendingRefundCount } from '../../hooks/usePendingRefundCount';

type Tab = 'analytics' | 'menu' | 'orders' | 'users';

const TABS: { key: Tab; label: string }[] = [
  { key: 'analytics', label: ' ANALYTICS'  },
  { key: 'menu',      label: ' MENU CRUD'   },
  { key: 'orders',    label: ' ORDERS'      },
  { key: 'users',     label: ' USERS'       },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: pendingRefundCount = 0 } = usePendingRefundCount(true);

  useEffect(() => {
    if (!socket) return;

    const refreshPendingCount = () => {
      queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });
    };

    socket.on('order:new', refreshPendingCount);
    socket.on('order:statusUpdated', refreshPendingCount);
    socket.on('payment:refundPending', refreshPendingCount);
    socket.on('payment:refunded', refreshPendingCount);

    return () => {
      socket.off('order:new', refreshPendingCount);
      socket.off('order:statusUpdated', refreshPendingCount);
      socket.off('payment:refundPending', refreshPendingCount);
      socket.off('payment:refunded', refreshPendingCount);
    };
  }, [socket, queryClient]);

  return (
    <div className="w-full px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="heading-2 text-gray-800">Admin Dashboard</h1>
        <p className="body-text-sm text-gray-500 mt-1">
          Manage your restaurant
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-ui px-4 py-2.5 text-sm font-medium border-b-2 transition
              -mb-px
              ${activeTab === tab.key
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <span className="relative inline-flex items-center">
              {tab.label}
              {tab.key === 'orders' && pendingRefundCount > 0 && (
                <span className="ml-2 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingRefundCount > 9 ? '9+' : pendingRefundCount}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && <Analytics />}
      {activeTab === 'menu'      && <MenuCRUD />}
      {activeTab === 'orders'    && <OrdersTable />}
      {activeTab === 'users'     && <UsersManagement />}
    </div>
  );
}
