'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function JobSeekersPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/job-seekers/');
      setData(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job seekers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this profile?')) return;
    try {
      await api.delete(`/admin/job-seekers/${id}/`);
      setData(data.filter(item => item.id !== id));
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">চাকরিপ্রার্থী</h1>
          <p className="mt-2 text-sm text-gray-700">
            যারা চাকরি খুঁজছেন তাদের প্রোফাইলের তালিকা।
          </p>
        </div>
      </div>
      
      {error && <div className="mt-4 mb-4 text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">প্রোফাইল</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ফোন নম্বর</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">অভিজ্ঞতা (বছর)</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">স্ট্যাটাস</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">অ্যাকশন</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">লোড হচ্ছে...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">কোন তথ্য পাওয়া যায়নি।</td></tr>
                  ) : data.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {item.user_avatar ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={item.user_avatar.startsWith('http') ? item.user_avatar : `https://helloomansheba.com${item.user_avatar}`} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 font-medium text-sm">{item.user_full_name?.charAt(0) || item.user_name?.charAt(0) || 'U'}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{item.professional_title}</div>
                            <div className="text-gray-500">{item.user_full_name || item.user_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.phone || item.user_phone || '---'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.years_of_experience}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.status}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
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
    </div>
  );
}
