import { useState } from 'react';
import MenuCRUD      from './components/MenuCRUD';
import OrdersTable   from './components/OrdersTable';
import Analytics     from './components/Analytics';
import UsersManagement from './components/UsersManagement';

type Tab = 'analytics' | 'menu' | 'orders' | 'users';

const TABS: { key: Tab; label: string }[] = [
  { key: 'analytics', label: '📊 Analytics'  },
  { key: 'menu',      label: '🍽 Menu CRUD'   },
  { key: 'orders',    label: '📋 Orders'      },
  { key: 'users',     label: '👥 Users'       },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your restaurant
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition
              -mb-px
              ${activeTab === tab.key
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
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