import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import type { Role, User } from '../../../types';
import Spinner from '../../../components/ui/Spinner';

const ROLES: Role[] = ['CUSTOMER', 'STAFF', 'ADMIN'];

const fetchUsers = async (): Promise<User[]> => {
  const res = await api.get('/users');
  return res.data.data ?? res.data;
};

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch(`/users/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user');
    },
  });

  const getSelectedRole = (user: User): Role => draftRoles[user.id] ?? user.role;

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map((header) => (
              <th
                key={header}
                className="text-left px-4 py-3 label-text text-gray-500 uppercase tracking-wide"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((user) => {
            const selectedRole = getSelectedRole(user);
            const roleChanged = selectedRole !== user.role;

            return (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-gray-500">{user.phone || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      setDraftRoles((prev) => ({ ...prev, [user.id]: role }));
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={!roleChanged || updateRoleMutation.isPending}
                    onClick={() => updateRoleMutation.mutate({ id: user.id, role: selectedRole })}
                    className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Save Role
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
      )}
    </div>
  );
}
