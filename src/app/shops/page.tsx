'use client';

import { useState, useEffect } from 'react';
import { 
  Store, Search, BadgeCheck, CheckCircle2, XCircle, 
  Trash2, Plus, X, Phone, MapPin, Eye, Package, RotateCw, ExternalLink
} from 'lucide-react';
import api from '@/lib/api';

interface ShopItem {
  id: number;
  name: string;
  name_bn?: string;
  slug: string;
  description: string;
  category: string;
  logo: string | null;
  banner: string | null;
  city: string;
  area: string;
  address: string;
  phone: string;
  whatsapp: string;
  is_verified: boolean;
  is_active: boolean;
  country: string;
  views: number;
  products_count: number;
  owner: number;
  owner_name: string;
  owner_phone: string;
  created_at: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal State for adding/editing shop
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    category: 'general',
    city: 'Muscat',
    area: '',
    address: '',
    phone: '',
    whatsapp: '',
    description: '',
    country: 'oman'
  });

  const fetchShops = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/shops/');
      const results = response.data.results || response.data || [];
      setShops(results);
    } catch (err: any) {
      setError(err.message || 'দোকানসমূহের তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleToggleVerify = async (shop: ShopItem) => {
    try {
      const res = await api.post(`/admin/shops/${shop.id}/verify/`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, is_verified: res.data.is_verified } : s));
    } catch (err: any) {
      alert(err.response?.data?.error || 'ভেরিফিকেশন স্ট্যাটাস পরিবর্তন করা যায়নি');
    }
  };

  const handleToggleStatus = async (shop: ShopItem) => {
    try {
      const res = await api.post(`/admin/shops/${shop.id}/status/`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, is_active: res.data.is_active } : s));
    } catch (err: any) {
      alert(err.response?.data?.error || 'স্ট্যাটাস পরিবর্তন করা যায়নি');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে '${name}' দোকানটি মুছে ফেলতে চান?`)) return;
    try {
      await api.delete(`/admin/shops/${id}/`);
      setShops(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert('দোকানটি ডিলিট করা যায়নি');
    }
  };

  const handleOpenAddModal = () => {
    setEditId(null);
    setFormData({
      name: '',
      name_bn: '',
      category: 'general',
      city: 'Muscat',
      area: '',
      address: '',
      phone: '',
      whatsapp: '',
      description: '',
      country: 'oman'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        const res = await api.patch(`/admin/shops/${editId}/`, formData);
        setShops(prev => prev.map(s => s.id === editId ? { ...s, ...res.data } : s));
      } else {
        const res = await api.post('/admin/shops/', formData);
        setShops(prev => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Shops
  const filteredShops = shops.filter(shop => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      shop.name.toLowerCase().includes(q) ||
      (shop.name_bn && shop.name_bn.toLowerCase().includes(q)) ||
      shop.city.toLowerCase().includes(q) ||
      shop.phone.toLowerCase().includes(q) ||
      (shop.owner_name && shop.owner_name.toLowerCase().includes(q));

    const matchesVerify = 
      filterVerified === 'all' ? true :
      filterVerified === 'verified' ? shop.is_verified :
      !shop.is_verified;

    const matchesActive = 
      filterActive === 'all' ? true :
      filterActive === 'active' ? shop.is_active :
      !shop.is_active;

    return matchesSearch && matchesVerify && matchesActive;
  });

  const totalShops = shops.length;
  const verifiedCount = shops.filter(s => s.is_verified).length;
  const activeCount = shops.filter(s => s.is_active).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-7 w-7 text-indigo-600" />
            দোকানসমূহ (Business Stores)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            প্রবাসী ব্যবসায়ীদের ডিজিটাল দোকান, ভেরিফিকেশন ও পণ্য তালিকা ব্যবস্থাপনা
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchShops} 
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RotateCw className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            নতুন দোকান যোগ করুন
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">মোট দোকান</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalShops}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Store className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ভেরিফাইড দোকান</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{verifiedCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BadgeCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">সক্রিয় দোকান</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="দোকানের নাম, মালিক বা ফোন নম্বর..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterVerified} 
            onChange={(e: any) => setFilterVerified(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="all">ভেরিফিকেশন: সব</option>
            <option value="verified">শুধুমাত্র ভেরিফাইড (Blue Tick)</option>
            <option value="unverified">আন-ভেরিফাইড</option>
          </select>

          <select 
            value={filterActive} 
            onChange={(e: any) => setFilterActive(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="all">স্ট্যাটাস: সব</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="suspended">স্থগিত (Suspended)</option>
          </select>
        </div>
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Shops Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            দোকানসমূহ লোড হচ্ছে...
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Store className="h-10 w-10 mx-auto mb-2 text-gray-400" />
            কোনো দোকান পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">দোকানের বিবরণ</th>
                  <th className="py-3 px-4">মালিক / বিক্রেতা</th>
                  <th className="py-3 px-4">ঠিকানা ও শহর</th>
                  <th className="py-3 px-4">পণ্য সংখ্যা</th>
                  <th className="py-3 px-4">ভেরিফিকেশন</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Shop details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                          {shop.logo ? (
                            <img 
                              src={shop.logo.startsWith('http') ? shop.logo : `http://188.245.212.240${shop.logo}`} 
                              alt={shop.name}
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <Store className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {shop.name}
                            {shop.is_verified && (
                              <span title="ভেরিফাইড দোকান">
                                <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-50" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] font-medium">
                              {shop.category}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-gray-400" />
                              {shop.views}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{shop.owner_name || 'ইউজার'}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {shop.phone}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {shop.city}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{shop.area || shop.address || shop.country}</div>
                    </td>

                    {/* Products count */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                        <Package className="h-3.5 w-3.5" />
                        {shop.products_count} টি পণ্য
                      </span>
                    </td>

                    {/* Verified Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleVerify(shop)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          shop.is_verified 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <BadgeCheck className={`h-3.5 w-3.5 ${shop.is_verified ? 'text-blue-600' : 'text-gray-400'}`} />
                        {shop.is_verified ? 'ভেরিফাইড' : 'ভেরিফাই করুন'}
                      </button>
                    </td>

                    {/* Active/Suspend Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(shop)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          shop.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {shop.is_active ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            সক্রিয়
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            স্থগিত
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(shop.id, shop.name)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="দোকান মুছুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-600" />
                {editId ? 'দোকানের তথ্য এডিট করুন' : 'নতুন দোকান তৈরি করুন'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">দোকানের নাম *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  placeholder="যেমন: মদিনা ইলেকট্রনিক্স অ্যান্ড মোবাইল"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ক্যাটাগরি *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                  >
                    <option value="general">সাধারণ (General)</option>
                    <option value="electronics">ইলেকট্রনিক্স (Electronics)</option>
                    <option value="grocery">মুদি দোকান (Grocery)</option>
                    <option value="clothing">পোশাক ও ফ্যাশন (Clothing)</option>
                    <option value="restaurant">রেস্টুরেন্ট ও খাবার (Food)</option>
                    <option value="tools">যন্ত্রপাতি ও পার্টস (Tools)</option>
                    <option value="mobile">মোবাইল ও গ্যাজেট (Mobile)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">শহর *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                    placeholder="Muscat / Salalah"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">যোগাযোগের ফোন *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                    placeholder="+968 12345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">হোয়াটসঅ্যাপ নম্বর</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                    placeholder="+968 12345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">দোকানের ঠিকানা</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  placeholder="শপ নং ১২, আল খুওয়ের মার্কেট"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">দোকানের বিবরণ</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  placeholder="আমাদের এখানে সকল প্রকার নতুন ও পুরাতন মোবাইল ক্রয়-বিক্রয় করা হয়..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
