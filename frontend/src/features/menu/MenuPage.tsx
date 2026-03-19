import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import type { MenuItem, Category } from '../../types';
import ItemCard from './ItemCart';
import ItemDetailModal  from './ItemDetailModal';
import SkeletonCard from '../../components/ui/Skeleton';

// ─── API Calls ────────────────────────────────────────

const fetchCategories = async (): Promise<Category[]> => {
  const res = await api.get('/categories');
  return res.data.data ?? res.data;
};

const fetchMenuItems = async (
  category: string,
  search: string,
): Promise<MenuItem[]> => {
  const params: Record<string, string> = { available: 'true' };
  if (category) params.category = category;
  if (search)   params.search   = search;
  const res = await api.get('/menu', { params });
  return res.data.data ?? res.data;
};

// ─── Component ───────────────────────────────────────

export default function MenuPage() {
  const INITIAL_VISIBLE_ITEMS = 16;
  const LOAD_MORE_STEP = 12;

  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch]                     = useState('');
  const [selectedItem, setSelectedItem]         = useState<MenuItem | null>(null);
  const [visibleCount, setVisibleCount]         = useState(INITIAL_VISIBLE_ITEMS);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  fetchCategories,
  });

  // Fetch menu items — refetch when category or search changes
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['menu', selectedCategory, search],
    queryFn:  () => fetchMenuItems(selectedCategory, search),
  });

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ITEMS);
  }, [selectedCategory, search]);

  useEffect(() => {
    const hasMore = visibleCount < items.length;
    if (!hasMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        setVisibleCount(prev => Math.min(prev + LOAD_MORE_STEP, items.length));
      },
      { rootMargin: '400px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, items.length]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">

      {/* ── Category Sidebar ─────────────────────── */}
      <aside className="w-48 shrink-0 hidden md:block">
        <h2 className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wide mb-3">
          Categories
        </h2>
        <ul className="space-y-1">

          {/* All Items */}
          <li>
            <button
              onClick={() => setSelectedCategory('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm
                          font-medium transition
                ${selectedCategory === ''
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All Items
            </button>
          </li>

          {categories.map(cat => (
            <li key={cat.id}>
              <button
                onClick={() => setSelectedCategory(cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm
                            font-medium transition
                  ${selectedCategory === cat.name
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <main className="flex-1 min-w-0">

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl border border-gray-300
                       text-sm outline-none focus:ring-2 focus:ring-orange-400
                       focus:border-transparent"
          />
        </div>

        {/* Mobile Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 md:hidden">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium
                        whitespace-nowrap transition border
              ${selectedCategory === ''
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-600'
              }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium
                          whitespace-nowrap transition border
                ${selectedCategory === cat.name
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 text-gray-600'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Section Heading */}
        <h1 className="text-lg font-bold text-gray-800 mb-4">
          {selectedCategory || 'All Items'}
          <span className="text-sm font-normal text-gray-400 ml-2">
            ({items.length} items)
          </span>
        </h1>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🍽</p>
            <p className="font-medium">No items found</p>
            <p className="text-sm mt-1">Try a different category or search term</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={setSelectedItem}
                />
              ))}
            </div>

            {visibleCount < items.length && (
              <div ref={loadMoreRef} className="py-6 text-center text-sm text-gray-400">
                Loading more items...
              </div>
            )}
          </>
        )}
      </main>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
