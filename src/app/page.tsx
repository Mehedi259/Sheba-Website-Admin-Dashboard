'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, Newspaper, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    user_count: 0,
    job_count: 0,
    property_count: 0,
    vehicle_count: 0,
    service_count: 0,
    news_count: 0,
    post_count: 0,
    total_classifieds: 0,
    growth_data: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard-stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Users', value: stats.user_count, icon: Users, color: 'bg-blue-500' },
    { name: 'Total Classifieds', value: stats.total_classifieds, icon: Briefcase, color: 'bg-indigo-500' },
    { name: 'News Articles', value: stats.news_count, icon: Newspaper, color: 'bg-emerald-500' },
    { name: 'Community Posts', value: stats.post_count, icon: MessageSquare, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight mb-8">
        Dashboard Overview
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stat.value.toLocaleString()}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow border border-gray-100">
        <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Growth Overview</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.growth_data || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Users" />
              <Bar dataKey="jobs" fill="#6366f1" radius={[4, 4, 0, 0]} name="Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
