import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import type { MenuItem, Category } from '../../../types';
import Spinner from '../../../components/ui/Spinner';

const fetchMenu       = async () => (await api.get('/menu/admin-list')).data;
const fetchCategories = async () => (await api.get('/categories')).data.data
  ?? (await api.get('/categories')).data;

const EMPTY_FORM = {
  name: '', description: '', price: '',
  imageUrl: '', prepTimeMins: '10', categoryId: '', isAvailable: true,
};

export default function MenuCRUD() {
  const queryClient = useQueryClient();

  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState<MenuItem | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);

  const [search,         setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus,   setFilterStatus]   = useState<'all' | 'available' | 'unavailable' | 'deleted'>('all');

  const { data: items      = [], isLoading } = useQuery({
    queryKey: ['admin-menu'],
    queryFn:  fetchMenu,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  fetchCategories,
  });

  
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => api.post('/menu', {
      ...data,
      prepTimeMins: Number(data.prepTimeMins),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      toast.success('Item created');
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) =>
      api.patch(`/menu/${id}`, {
        ...data,
        prepTimeMins: Number(data.prepTimeMins),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      toast.success('Item updated');
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update item');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/menu/${id}/toggle-availability`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      toast.success('Availability updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/${id}`),
    onSuccess: (res) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });

      const data = res.data as { type: 'soft' | 'hard'; orderCount?: number };
      if (data.type === 'soft') {
        toast(`Item marked as deleted — referenced by ${data.orderCount} order(s)`, {
          icon: '🗂️',
        });
      } else {
        toast.success('Item permanently deleted');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return api.post('/menu/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      const imageUrl = res.data?.url ?? res.data?.data?.url;
      if (!imageUrl) {
        toast.error('Upload succeeded but no image URL was returned');
        return;
      }

      setForm(prev => ({ ...prev, imageUrl }));
      toast.success('Image uploaded');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Image upload failed');
    },
  });


  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name:        item.name,
      description: item.description  || '',
      price:       item.price,
      imageUrl:    item.imageUrl     || '',
      prepTimeMins: String(item.prepTimeMins),
      categoryId:  item.category.id,
      isAvailable: item.isAvailable,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.price || !form.categoryId) {
      toast.error('Name, price and category are required');
      return;
    }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const filteredItems = (items as MenuItem[]).filter(item => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      !filterCategory || item.category.id === filterCategory;

    const matchesStatus =
      filterStatus === 'all' ? true
      : filterStatus === 'available'   ? (item.isAvailable && !item.deletedAt)
      : filterStatus === 'unavailable' ? (!item.isAvailable && !item.deletedAt)
      : !!item.deletedAt;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadImageMutation.mutate(file);
    e.target.value = '';
  };

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  );

  return (
    <div>
      
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm
                     font-semibold px-4 py-2 rounded-xl transition"
        >
          + Add Item
        </button>
      </div>

      
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editItem ? 'Edit Item' : 'New Menu Item'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="label-text text-gray-500 mb-1 block">
                Name *
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Garlic Bread"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            
            <div>
              <label className="label-text text-gray-500 mb-1 block">
                Price *
              </label>
              <input
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="9.99"
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            
            <div>
              <label className="label-text text-gray-500 mb-1 block">
                Category *
              </label>
              <select
                value={form.categoryId}
                onChange={e =>
                  setForm(f => ({ ...f, categoryId: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select category</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            
            <div>
              <label className="label-text text-gray-500 mb-1 block">
                Prep Time (mins)
              </label>
              <input
                value={form.prepTimeMins}
                onChange={e =>
                  setForm(f => ({ ...f, prepTimeMins: e.target.value }))
                }
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>


            <div className="sm:col-span-2">
              <label className="label-text text-gray-500 mb-1 block">
                Image URL
              </label>
              <input
                value={form.imageUrl}
                onChange={e =>
                  setForm(f => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="mt-2 flex items-center gap-3">
                <label
                  className="inline-flex items-center px-3 py-2 border border-gray-300
                             rounded-lg label-text text-gray-700 hover:bg-gray-50
                             cursor-pointer transition"
                >
                  {uploadImageMutation.isPending
                    ? 'Uploading...'
                    : 'Upload to Cloudinary'}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadImageMutation.isPending}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-400">
                  JPG, PNG, WEBP · max 5MB
                </span>
              </div>
              {form.imageUrl && (
                <div className="mt-3">
                  <img
                    src={form.imageUrl}
                    alt="Menu preview"
                    className="h-28 w-28 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            
            <div className="sm:col-span-2">
              <label className="label-text text-gray-500 mb-1 block">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           text-sm outline-none focus:ring-2 focus:ring-orange-400
                           resize-none"
              />
            </div>

            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={form.isAvailable}
                onChange={e =>
                  setForm(f => ({ ...f, isAvailable: e.target.checked }))
                }
                className="accent-orange-500"
              />
              <label htmlFor="available" className="text-sm text-gray-700">
                Available
              </label>
            </div>
          </div>

          
          <div className="flex gap-3 mt-5">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm
                         text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white
                         button-text text-sm font-semibold rounded-xl transition
                         disabled:opacity-50"
            >
              {isSaving
                ? <Spinner size="sm" />
                : editItem ? 'Save Changes' : 'Create Item'
              }
            </button>
          </div>
        </div>
      )}

      
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or description…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300
                     rounded-xl text-sm outline-none
                     focus:ring-2 focus:ring-orange-400"
        />

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm
                     outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All Categories</option>
          {categories.map((cat: Category) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm
                     outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="unavailable">Sold Out</option>
          <option value="deleted">Deleted</option>
        </select>

        {(search || filterCategory || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setSearch('');
              setFilterCategory('');
              setFilterStatus('all');
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700
                       border border-gray-300 rounded-xl transition"
          >
            Clear
          </button>
        )}

        <span className="flex items-center text-xs text-gray-400 ml-auto">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </span>
      </div>

     
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                      overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Item', 'Category', 'Price', 'Prep', 'Status', 'Actions']
                .map(h => (
                <th key={h}
                    className="text-left px-4 py-3 label-text
                               text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.map((item: MenuItem) => (
              <tr key={item.id}
                  className={`hover:bg-gray-50 transition ${item.deletedAt ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className={`font-medium text-gray-800 ${item.deletedAt ? 'line-through text-gray-400' : ''}`}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-400 truncate max-w-xs">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {item.category.name}
                </td>
                <td className="px-4 py-3 font-semibold text-orange-500">
                  ${Number(item.price).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {item.prepTimeMins}m
                </td>
                <td className="px-4 py-3">
                  {item.deletedAt ? (
                    <span className="px-2 py-0.5 rounded-full label-text
                      bg-gray-200 text-gray-500 line-through">
                      Deleted
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full label-text
                      ${item.isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100   text-red-600'
                      }`}>
                      {item.isAvailable ? 'Available' : 'Sold Out'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={!!item.deletedAt}
                      className="text-xs px-2 py-1 border border-gray-300
                                 rounded-lg hover:bg-gray-100 transition
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(item.id)}
                      disabled={!!item.deletedAt}
                      className="text-xs px-2 py-1 border border-gray-300
                                 rounded-lg hover:bg-gray-100 transition
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {item.isAvailable ? 'Sold Out' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?\n\nIf this item has order history it will be marked as deleted; otherwise it will be permanently removed.`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={!!item.deletedAt || deleteMutation.isPending}
                      className="text-xs px-2 py-1 border border-red-200
                                 text-red-500 rounded-lg hover:bg-red-50
                                 transition disabled:opacity-30
                                 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No menu items yet — add one above
          </div>
        )}
      </div>
    </div>
  );
}