'use client';

import { useState, useEffect } from 'react';
import { Trash2, Upload } from 'lucide-react';
import api from '@/lib/api';

export default function SlidersPage() {
  const [sliders, setSliders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchSliders = async () => {
    try {
      const response = await api.get('/admin/sliders/');
      setSliders(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sliders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSliders();
  }, []);

  const handleDelete = async (sliderId: number) => {
    if (!window.confirm('Are you sure you want to delete this slider?')) return;
    try {
      await api.delete(`/admin/sliders/${sliderId}/`);
      setSliders(sliders.filter(s => s.id !== sliderId));
    } catch (err: any) {
      alert('Failed to delete slider');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', file.name);
    formData.append('order', '0');

    try {
      await api.post('/admin/sliders/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchSliders(); // refresh list
    } catch (err: any) {
      alert('Failed to upload slider');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Hero Sliders
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage the homepage hero slider images.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      
      {error && <div className="mt-4 text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-500">Loading sliders...</div>
        ) : sliders.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500 bg-white border rounded shadow-sm">No sliders found.</div>
        ) : (
          sliders.map((slider) => (
            <div key={slider.id} className="relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-video w-full bg-gray-100">
                <img src={slider.image ? slider.image.replace(/^https?:\/\/[^\/]+/, '') : ''} alt={slider.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 truncate">{slider.title}</span>
                <button onClick={() => handleDelete(slider.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
