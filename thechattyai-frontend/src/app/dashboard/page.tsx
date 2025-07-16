import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AnalyticsData {
  total_calls: number;
  unique_customers: number;
}

interface Call {
  id: string;
  customer_name?: string;
  caller_phone?: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const DashboardPage = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({ total_calls: 0, unique_customers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Please log in to view your dashboard');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const callsResponse = await axios.get(`${API_URL}/api/calls`, {
          params: { page: 1, limit: 10 },
          headers: { Authorization: `Bearer ${token}` }
        });
        setCalls(callsResponse.data);

        const analyticsResponse = await axios.get(`${API_URL}/api/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalytics(analyticsResponse.data);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err?.response?.data?.error || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Analytics</h2>
      <p>Total Calls: {analytics.total_calls}</p>
      <p>Unique Customers: {analytics.unique_customers}</p>

      <h2>Recent Calls</h2>
      <ul>
        {calls.map(call => (
          <li key={call.id}>
            {call.customer_name || 'Unknown'} - {call.caller_phone || 'N/A'} - {new Date(call.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardPage; 