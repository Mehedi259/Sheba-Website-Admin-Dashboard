'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, Newspaper, MessageSquare, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Link from 'next/link';
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
    { 
      title: 'CLASSIFIEDS', 
      value: stats.total_classifieds, 
      subtext: 'Total listings', 
      icon: Briefcase, 
      gradient: 'bg-gradient-to-br from-pink-400 to-rose-500',
      href: '/classifieds'
    },
    { 
      title: 'NEWS', 
      value: stats.news_count, 
      subtext: 'Articles', 
      icon: Newspaper, 
      gradient: 'bg-gradient-to-br from-cyan-400 to-blue-500',
      href: '/news'
    },
    { 
      title: 'POSTS', 
      value: stats.post_count, 
      subtext: 'Community', 
      icon: MessageSquare, 
      gradient: 'bg-gradient-to-br from-emerald-400 to-teal-400',
      href: '/community'
    },
    { 
      title: 'USERS', 
      value: stats.user_count, 
      subtext: 'Registered', 
      icon: Users, 
      gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      href: '/users'
    },
  ];

  const barData = [
    { name: 'Jobs', value: stats.job_count, fill: '#818cf8' }, // indigo-400
    { name: 'Properties', value: stats.property_count, fill: '#f472b6' }, // pink-400
    { name: 'Vehicles', value: stats.vehicle_count, fill: '#7dd3fc' }, // sky-300
    { name: 'Services', value: stats.service_count, fill: '#6ee7b7' }, // emerald-300
    { name: 'News', value: stats.news_count, fill: '#94a3b8' }, // slate-400
    { name: 'Posts', value: stats.post_count, fill: '#a78bfa' }, // purple-400
  ];

  const donutData = [
    { name: 'Jobs', value: stats.job_count, fill: '#818cf8' },
    { name: 'Properties', value: stats.property_count, fill: '#f472b6' },
    { name: 'Vehicles', value: stats.vehicle_count, fill: '#7dd3fc' },
    { name: 'Services', value: stats.service_count, fill: '#6ee7b7' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold leading-7 text-gray-800 sm:truncate sm:text-3xl sm:tracking-tight mb-6">
        Site administration
      </h2>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Link href={stat.href} key={stat.title} className="block group">
            <div className={`relative overflow-hidden rounded-xl ${stat.gradient} p-6 shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg`}>
              <div className="relative z-10 flex flex-col h-full text-white">
                <span className="text-xs font-semibold tracking-wider text-white/80 mb-1">{stat.title}</span>
                <span className="text-4xl font-bold mb-1">{stat.value.toLocaleString()}</span>
                <span className="text-sm text-white/90">{stat.subtext}</span>
              </div>
              <div className="absolute top-4 right-4 z-0">
                <stat.icon className="h-12 w-12 text-white/20 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Content Overview</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-gray-800">Classifieds Breakdown</h3>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="rect"
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
