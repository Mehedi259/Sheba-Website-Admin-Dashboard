'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Briefcase, 
  ShoppingCart, 
  Car, 
  FileText, 
  Search, 
  RotateCw, 
  Trash2, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Building2,
  Filter
} from 'lucide-react';
import api from '@/lib/api';

interface FeedbackStats {
  total_sheba_success: number;
  job_success: number;
  market_success: number;
  vehicle_success: number;
  total_records: number;
}

interface ListingFeedback {
  id: number;
  user_name: string;
  user_phone: string;
  category: string;
  listing_id: number | null;
  title: string;
  reason: string;
  is_successful_via_sheba: boolean;
  note: string;
  created_at: string;
}

export default function SuccessfulListingsPage() {
  const [feedbacks, setFeedbacks] = useState<ListingFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total_sheba_success: 0,
    job_success: 0,
    market_success: 0,
    vehicle_success: 0,
    total_records: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlySuccess, setOnlySuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (onlySuccess) {
        params.append('only_success', 'true');
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const response = await api.get(`/admin/successful-listings/?${params.toString()}`);
      if (response.data) {
        setFeedbacks(response.data.results || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'ডাটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, onlySuccess, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchFeedbacks]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('আপনি কি সত্যিই এই রেকর্ডটি মুছে ফেলতে চান?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/successful-listings/${id}/`);
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
      // Refresh stats
      fetchFeedbacks();
    } catch (err: any) {
      alert('মুছে ফেলা সম্ভব হয়নি: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'job':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Briefcase className="w-3 h-3" /> চাকরি
          </span>
        );
      case 'market':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShoppingCart className="w-3 h-3" /> মার্কেট
          </span>
        );
      case 'vehicle':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Car className="w-3 h-3" /> যানবাহন
          </span>
        );
      case 'property':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Building2 className="w-3 h-3" /> প্রপার্টি
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {cat}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            সফল লিস্টিং রিপোর্ট ও ডিল ট্র্যাকিং
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            সেবা প্ল্যাটফর্ম ব্যবহার করে ব্যবহারকারীরা কর্মী নিয়োগ, পণ্য বিক্রি বা গাড়ি চুক্তি সম্পন্ন করার পর পোস্ট ডিলিটের রিয়েল-টাইম তথ্য
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          রিফ্রেশ করুন
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sheba Success */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-emerald-100 text-xs font-medium uppercase tracking-wider">সেবার মাধ্যমে সফল</span>
              <div className="p-2 bg-white/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-extrabold">{stats.total_sheba_success}</h3>
              <p className="text-xs text-emerald-100 mt-1">মোট সফল চুক্তি সম্পন্ন</p>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 2: Jobs */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">কর্মী নিয়োগ সম্পন্ন</span>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-gray-900">{stats.job_success}</h3>
            <p className="text-xs text-blue-600 mt-1 font-medium">চাকরি পোস্ট সফল</p>
          </div>
        </div>

        {/* Card 3: Market */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">পণ্য বিক্রি সম্পন্ন</span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-gray-900">{stats.market_success}</h3>
            <p className="text-xs text-amber-600 mt-1 font-medium">মার্কেট পণ্য বিক্রয়</p>
          </div>
        </div>

        {/* Card 4: Vehicle */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">গাড়ি চুক্তি সম্পন্ন</span>
            <div className="p-2 bg-purple-50 rounded-xl">
              <Car className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-gray-900">{stats.vehicle_success}</h3>
            <p className="text-xs text-purple-600 mt-1 font-medium">গাড়ি বিক্রি/ভাড়া সফল</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: 'all', label: 'সব লিস্টিং', count: stats.total_records },
              { id: 'job', label: 'চাকরি', icon: Briefcase },
              { id: 'market', label: 'মার্কেট', icon: ShoppingCart },
              { id: 'vehicle', label: 'যানবাহন', icon: Car },
              { id: 'property', label: 'প্রপার্টি', icon: Building2 },
            ].map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full ${active ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Only Sheba Success Checkbox */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlySuccess}
              onChange={(e) => setOnlySuccess(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">
              শুধুমাত্র সেবা থেকে সফল চুক্তি
            </span>
          </label>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="পোস্টের নাম, ব্যবহারকারীর নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">ব্যবহারকারী</th>
                <th className="px-4 py-3.5">পোস্টের নাম</th>
                <th className="px-4 py-3.5">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">মুছে ফেলার কারণ</th>
                <th className="px-4 py-3.5 text-center">ফলাফল</th>
                <th className="px-4 py-3.5">অতিরিক্ত মন্তব্য</th>
                <th className="px-4 py-3.5">তারিখ ও সময়</th>
                <th className="px-4 py-3.5 text-center w-16">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    তথ্য লোড হচ্ছে...
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    কোনো রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                feedbacks.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900">{item.user_name || 'বেনামী ব্যবহারকারী'}</div>
                      {item.user_phone && (
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{item.user_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-semibold text-gray-800 line-clamp-1">{item.title}</div>
                      {item.listing_id && (
                        <div className="text-xs text-gray-400">আইডি: #{item.listing_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getCategoryBadge(item.category)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-800 text-xs font-medium leading-relaxed">
                        {item.reason}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {item.is_successful_via_sheba ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> সেবায় সফল
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          অন্যান্য কারণ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                      {item.note || '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        title="মুছে ফেলুন"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
