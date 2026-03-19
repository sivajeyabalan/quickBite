import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import type { User, TableAssignment, TableRequest } from '../../types';
import './TableAssignmentPage.css';

export const TableAssignmentPage = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all users (customers)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data || res.data;
    },
  });

  // Fetch all active table assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['tableAssignments'],
    queryFn: async () => {
      const res = await api.get('/table-assignments');
      return res.data.data || res.data || [];
    },
  });

  // Fetch all pending table requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['tablePendingRequests'],
    queryFn: async () => {
      const res = await api.get('/table-requests/pending');
      return res.data.data || res.data || [];
    },
  });

  // Assign table mutation
  const assignMutation = useMutation({
    mutationFn: async (data: { userId: string; tableNumber: string }) => {
      const res = await api.post('/table-assignments/assign', data);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMessage('Table assigned successfully!');
      setSelectedUserId('');
      setTableNumber('');
      queryClient.invalidateQueries({ queryKey: ['tableAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['tablePendingRequests'] });
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to assign table';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 3000);
    },
  });

  // Release table mutation
  const releaseMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/table-assignments/release`, { userId });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMessage('Table released successfully!');
      queryClient.invalidateQueries({ queryKey: ['tableAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['tablePendingRequests'] });
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to release table';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 3000);
    },
  });

  // Complete table request mutation
  const completeRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.patch(`/table-requests/${requestId}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tablePendingRequests'] });
    },
    onError: (error: any) => {
      console.error('Failed to complete request:', error);
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !tableNumber.trim()) {
      setErrorMessage('Please select a customer and enter a table number');
      return;
    }

    // Find the pending request for this user to complete it
    const request = requestsData?.find((r: TableRequest) => r.userId === selectedUserId);
    
    assignMutation.mutate(
      {
        userId: selectedUserId,
        tableNumber: tableNumber.trim().toUpperCase(),
      },
      {
        onSuccess: () => {
          // Complete the request after successful assignment
          if (request?.id) {
            void completeRequestMutation.mutateAsync(request.id);
          }
        },
      }
    );
  };

  const handleRelease = (userId: string) => {
    releaseMutation.mutate(userId);
  };

  const getCustomerName = (userId: string) => {
    const user = usersData?.find((u: User) => u.id === userId);
    return user?.name || 'Unknown';
  };

  const activeAssignments = (assignmentsData || []).filter(
    (a: TableAssignment) => a.status === 'ACTIVE'
  );

  return (
    <div className="table-assignment-container">
      <div className="table-assignment-card">
        <h1>Table Assignment Management</h1>

        {/* Messages */}
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {/* Assign Form */}
        <form onSubmit={handleAssign} className="assignment-form">
          <div className="form-group">
            <label htmlFor="customer-select">Select Customer:</label>
            <select
              id="customer-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={usersLoading}
            >
              <option value="">-- Choose a customer --</option>
              {usersData?.map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="table-input">Table Number:</label>
            <input
              id="table-input"
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g., T1, T5, VIP1"
              maxLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={assignMutation.isPending || !selectedUserId || !tableNumber}
            className="btn-assign"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Table'}
          </button>
        </form>

        {/* Waiting Customers */}
        <div className="assignments-section">
          <h2>Waiting Customers ({(requestsData || []).length})</h2>
          {requestsLoading ? (
            <p className="loading">Loading requests...</p>
          ) : requestsData && requestsData.length > 0 ? (
            <div className="assignments-list">
              {requestsData.map((request: TableRequest) => (
                <div key={request.id} className="assignment-item waiting-item">
                  <div className="assignment-info">
                    <div className="customer-name">{request.user?.name || 'Unknown'}</div>
                    <div className="customer-contact">{request.user?.phone || request.user?.email || 'N/A'}</div>
                    {request.partySize && (
                      <div className="party-size">Party Size: {request.partySize}</div>
                    )}
                    {request.notes && (
                      <div className="request-notes">Notes: {request.notes}</div>
                    )}
                    <div className="assigned-at">
                      Requested: {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUserId(request.userId)}
                    className="btn-assign"
                    title="Select and assign table"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No waiting customers</p>
          )}
        </div>

        {/* Active Assignments */}
        <div className="assignments-section">
          <h2>Active Assignments</h2>
          {assignmentsLoading ? (
            <p className="loading">Loading assignments...</p>
          ) : activeAssignments.length === 0 ? (
            <p className="no-data">No active table assignments</p>
          ) : (
            <div className="assignments-list">
              {activeAssignments.map((assignment: TableAssignment) => (
                <div key={assignment.id} className="assignment-item">
                  <div className="assignment-info">
                    <div className="customer-name">{getCustomerName(assignment.userId)}</div>
                    <div className="table-number">Table: {assignment.tableNumber}</div>
                    <div className="assigned-at">
                      Assigned: {new Date(assignment.assignedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRelease(assignment.userId)}
                    disabled={releaseMutation.isPending}
                    className="btn-release"
                  >
                    {releaseMutation.isPending ? 'Releasing...' : 'Release'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
