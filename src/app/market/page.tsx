'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export default function MarketPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/market/`);
      setData(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch Market items`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete this item?`)) return;
    try {
      await api.delete(`/admin/market/${id}/`);
      setData(data.filter(item => item.id !== id));
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  const handleOpenModal = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      currency: 'OMR',
      condition: 'GOOD',
      city: '',
      contact_name: '',
      contact_phone: '',
      status: 'PUBLISHED',
      category: 'electronics'
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setFormData({ ...item });
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let response: any;
      if (editId) {
        response = await api.put(`/admin/market/${editId}/`, formData);
        setData(data.map(item => item.id === editId ? response.data : item));
      } else {
        response = await api.post(`/admin/market/`, formData);
        setData([response.data, ...data]);
      }
      setIsModalOpen(false);
      setFormData({});
      setEditId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to save market item`);
      console.error(err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            মার্কেটপ্লেস
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            ব্যবহারকারীদের পোস্ট করা সব মার্কেটপ্লেস আইটেম (বিক্রয় পোস্ট) পরিচালনা করুন।
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenModal}
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            নতুন আইটেম যুক্ত করুন
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 mb-4 text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">শিরোনাম</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ক্যাটাগরি</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">মূল্য</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">শহর</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">স্ট্যাটাস</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">অ্যাকশন</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">মার্কেট আইটেম লোড হচ্ছে...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">কোন মার্কেট আইটেম পাওয়া যায়নি।</td></tr>
                  ) : data.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{item.title}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.category_name || item.category}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.price} {item.currency}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.city}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.status}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 px-2 py-1 text-xs bg-indigo-50 rounded">এডিট</button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 px-2 py-1 text-xs bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold">{editId ? 'আইটেম এডিট করুন' : 'নতুন আইটেম তৈরি করুন'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">শিরোনাম *</label>
                  <input type="text" name="title" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.title || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ক্যাটাগরি *</label>
                  <select name="category" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.category || 'electronics'} onChange={handleChange} required>
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="books">Books</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">মূল্য *</label>
                  <input type="number" name="price" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.price || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">অবস্থা *</label>
                  <select name="condition" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.condition || 'GOOD'} onChange={handleChange} required>
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">শহর *</label>
                  <input type="text" name="city" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.city || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">স্ট্যাটাস *</label>
                  <select name="status" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.status || 'PUBLISHED'} onChange={handleChange} required>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SOLD">Sold</option>
                    <option value="REMOVED">Removed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">যোগাযোগের নাম *</label>
                  <input type="text" name="contact_name" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.contact_name || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">যোগাযোগের নম্বর *</label>
                  <input type="text" name="contact_phone" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.contact_phone || ''} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">বিস্তারিত *</label>
                <textarea name="description" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" value={formData.description || ''} onChange={handleChange} required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">বাতিল</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md">{submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
