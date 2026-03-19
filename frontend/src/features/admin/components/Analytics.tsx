import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import type { Order } from '../../../types';
import Spinner from '../../../components/ui/Spinner';

interface AnalyticsData {
  totalRevenue:    number;
  totalOrders:     number;
  avgOrderValue:   number;
  topItems:        { name: string; count: number }[];
  revenueByHour:   { hour: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
}

const fetchAnalytics = async (): Promise<AnalyticsData> => {
  const res  = await api.get('/orders');
  const orders: Order[] = res.data.data ?? res.data;

  // Calculate analytics client-side from orders data
  const completed = orders.filter(o =>
    ['COMPLETED', 'SERVED'].includes(o.status)
  );

  const totalRevenue  = completed.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders   = orders.length;
  const avgOrderValue = completed.length > 0
    ? totalRevenue / completed.length
    : 0;

  // Top items by order count
  const itemCount: Record<string, number> = {};
  orders.forEach(order => {
    order.orderItems.forEach(item => {
      itemCount[item.itemNameSnapshot] =
        (itemCount[item.itemNameSnapshot] || 0) + item.quantity;
    });
  });

  const topItems = Object.entries(itemCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Revenue by hour
  const hourMap: Record<number, number> = {};
  completed.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourMap[hour] = (hourMap[hour] || 0) + Number(order.total);
  });

  const revenueByHour = Array.from({ length: 24 }, (_, i) => ({
    hour:    i,
    revenue: hourMap[i] || 0,
  }));

  // Status breakdown
  const statusMap: Record<string, number> = {};
  orders.forEach(o => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });

  const statusBreakdown = Object.entries(statusMap).map(
    ([status, count]) => ({ status, count }),
  );

  return {
    totalRevenue, totalOrders, avgOrderValue,
    topItems, revenueByHour, statusBreakdown,
  };
};

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn:  fetchAnalytics,
  });

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  );

  if (!data) return null;

  const maxHourRevenue = Math.max(...data.revenueByHour.map(h => h.revenue), 1);
  const maxItemCount   = Math.max(...data.topItems.map(i => i.count), 1);

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: `$${data.totalRevenue.toFixed(2)}`,
            icon:  '',
            color: 'text-green-600',
          },
          {
            label: 'Total Orders',
            value: data.totalOrders,
            icon:  '',
            color: 'text-blue-600',
          },
          {
            label: 'Avg Order Value',
            value: `$${data.avgOrderValue.toFixed(2)}`,
            icon:  '',
            color: 'text-purple-600',
          },
        ].map(card => (
          <div key={card.label}
               className="bg-white rounded-2xl border border-gray-100
                          shadow-sm p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>
              {card.icon} {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Top 5 Items ────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
             TOP 5 ITEMS
          </h2>
          {data.topItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topItems.map((item, i) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium truncate">
                      {i + 1}. {item.name}
                    </span>
                    <span className="text-gray-500 shrink-0 ml-2">
                      {item.count} orders
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{
                        width: `${(item.count / maxItemCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Status Breakdown ───────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            ORDER STATUS BREAKDOWN
          </h2>
          {data.statusBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.statusBreakdown.map(({ status, count }) => (
                <div key={status}
                     className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{status}</span>
                  <span className="font-bold text-gray-800 bg-gray-100
                                   px-3 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Peak Hour Heatmap ──────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100
                      shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">
          Revenue by Hour
        </h2>
        <div className="flex items-end gap-1 h-24">
          {data.revenueByHour.map(({ hour, revenue }) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-orange-400 rounded-sm transition-all"
                style={{
                  height: `${(revenue / maxHourRevenue) * 80}px`,
                  minHeight: revenue > 0 ? '4px' : '0px',
                  opacity: revenue > 0 ? 1 : 0.15,
                }}
                title={`${hour}:00 — $${revenue.toFixed(2)}`}
              />
              {hour % 6 === 0 && (
                <span className="text-xs text-gray-400">{hour}h</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}