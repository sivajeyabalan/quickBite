import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import type { Address } from '../../types';
import Spinner from '../../components/ui/Spinner';

type AddressForm = {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  landmark: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  label: '',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
  isDefault: false,
};

const fetchAddresses = async (): Promise<Address[]> => {
  const res = await api.get('/users/addresses');
  return res.data.data ?? res.data;
};

function toPayload(form: AddressForm) {
  return {
    label: form.label.trim() || undefined,
    recipientName: form.recipientName.trim() || undefined,
    phone: form.phone.trim() || undefined,
    line1: form.line1.trim(),
    line2: form.line2.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim() || undefined,
    postalCode: form.postalCode.trim(),
    landmark: form.landmark.trim() || undefined,
    isDefault: form.isDefault,
  };
}

export default function AddressesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddressForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddressForm>(EMPTY_FORM);

  const fromCart = searchParams.get('from') === 'cart';
  const returnTo = searchParams.get('returnTo') || '/';

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  const createMutation = useMutation({
    mutationFn: async (form: AddressForm) => {
      await api.post('/users/addresses', toPayload(form));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      toast.success('Address added');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add address');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: AddressForm }) => {
      await api.patch(`/users/addresses/${id}`, toPayload(form));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      toast.success('Address updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update address');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete address');
    },
  });

  const defaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/users/addresses/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set default');
    },
  });

  const busy = useMemo(
    () =>
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      defaultMutation.isPending,
    [
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      defaultMutation.isPending,
    ],
  );

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setEditForm({
      label: address.label || '',
      recipientName: address.recipientName || '',
      phone: address.phone || '',
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state || '',
      postalCode: address.postalCode,
      landmark: address.landmark || '',
      isDefault: address.isDefault,
    });
  };

  const validate = (form: AddressForm) => {
    if (!form.line1.trim() || !form.city.trim() || !form.postalCode.trim()) {
      toast.error('Line 1, city, and postal code are required');
      return false;
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Address Book</h1>
          <p className="text-sm text-gray-500 mt-1">Manage delivery addresses</p>
        </div>
        <div className="flex items-center gap-2">
          {fromCart && (
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('qb_reopen_cart', '1');
                navigate(returnTo);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold"
            >
              Back to Cart
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
          >
            {showAddForm ? 'Close' : 'Add Address'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddressFormCard
          title="New Address"
          form={addForm}
          setForm={setAddForm}
          onCancel={() => {
            setShowAddForm(false);
            setAddForm(EMPTY_FORM);
          }}
          onSave={() => {
            if (!validate(addForm)) return;
            createMutation.mutate(addForm);
          }}
          saving={createMutation.isPending}
        />
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl text-gray-400">
          <p className="text-4xl mb-2">📍</p>
          <p className="font-medium">No saved addresses</p>
          <p className="text-sm mt-1">Add one to speed up delivery checkout</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map(address => (
            <div key={address.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              {editingId === address.id ? (
                <AddressFormCard
                  title="Edit Address"
                  form={editForm}
                  setForm={setEditForm}
                  onCancel={() => {
                    setEditingId(null);
                    setEditForm(EMPTY_FORM);
                  }}
                  onSave={() => {
                    if (!validate(editForm)) return;
                    updateMutation.mutate({ id: address.id, form: editForm });
                  }}
                  saving={updateMutation.isPending}
                  compact
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {address.label || 'Saved Address'}
                        {address.isDefault && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''}, {address.city}
                        {address.state ? `, ${address.state}` : ''} {address.postalCode}
                      </p>
                      {(address.recipientName || address.phone || address.landmark) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {address.recipientName ? `Recipient: ${address.recipientName}` : ''}
                          {address.recipientName && address.phone ? ' · ' : ''}
                          {address.phone ? `Phone: ${address.phone}` : ''}
                          {(address.recipientName || address.phone) && address.landmark ? ' · ' : ''}
                          {address.landmark ? `Landmark: ${address.landmark}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {!address.isDefault && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => defaultMutation.mutate(address.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(address)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteMutation.mutate(address.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressFormCard({
  title,
  form,
  setForm,
  onCancel,
  onSave,
  saving,
  compact = false,
}: {
  title: string;
  form: AddressForm;
  setForm: (value: AddressForm | ((prev: AddressForm) => AddressForm)) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? 'p-0' : 'p-4'}`}>
      <h2 className={`font-semibold text-gray-800 ${compact ? 'mb-3' : 'mb-4'}`}>{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Label (Home/Work)"
          value={form.label}
          onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Recipient Name"
          value={form.recipientName}
          onChange={e => setForm(prev => ({ ...prev, recipientName: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Phone"
          value={form.phone}
          onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Line 1*"
          value={form.line1}
          onChange={e => setForm(prev => ({ ...prev, line1: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Line 2"
          value={form.line2}
          onChange={e => setForm(prev => ({ ...prev, line2: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="City*"
          value={form.city}
          onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="State"
          value={form.state}
          onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Postal Code*"
          value={form.postalCode}
          onChange={e => setForm(prev => ({ ...prev, postalCode: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <input
        type="text"
        placeholder="Landmark"
        value={form.landmark}
        onChange={e => setForm(prev => ({ ...prev, landmark: e.target.value }))}
        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
      />

      <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={e => setForm(prev => ({ ...prev, isDefault: e.target.checked }))}
        />
        Set as default
      </label>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}