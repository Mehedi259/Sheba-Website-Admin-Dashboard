'use client';

import { useState, useEffect } from 'react';
import { Trash2, Upload } from 'lucide-react';
import api from '@/lib/api';

export default function SlidersPage() {
  const [sliders, setSliders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    cta_text: '',
    link: '',
    order: 0,
    is_active: true
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

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

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      title: '',
      subtitle: '',
      cta_text: '',
      link: '',
      order: 0,
      is_active: true
    });
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slider: any) => {
    setEditId(slider.id);
    setFormData({
      title: slider.title || '',
      subtitle: slider.subtitle || '',
      cta_text: slider.cta_text || '',
      link: slider.link || '',
      order: slider.order || 0,
      is_active: slider.is_active ?? true,
    });
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId === null && !selectedImage) {
      alert('Please select an image');
      return;
    }
    
    setSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('subtitle', formData.subtitle);
    data.append('cta_text', formData.cta_text);
    data.append('link', formData.link);
    data.append('order', formData.order.toString());
    data.append('is_active', formData.is_active ? 'true' : 'false');
    
    if (selectedImage) {
      data.append('image', selectedImage);
    }

    try {
      if (editId === null) {
        await api.post('/admin/sliders/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.patch(`/admin/sliders/${editId}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchSliders();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save slider');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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
          <button onClick={openAddModal} className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            Add Slide
          </button>
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
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(slider)} className="text-indigo-600 hover:text-indigo-900 px-2 py-1 text-xs bg-indigo-50 rounded">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(slider.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Slider' : 'Add New Slide'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="text-xl">×</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" name="title" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.title} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                <input type="text" name="subtitle" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.subtitle} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">CTA Text</label>
                  <input type="text" name="cta_text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.cta_text} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order</label>
                  <input type="number" name="order" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.order} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Link URL</label>
                <input type="text" name="link" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.link} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{editId ? 'Replace Image (Optional)' : 'Image *'}</label>
                <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} required={editId === null} />
              </div>
              <div className="flex items-center mt-4">
                <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" checked={formData.is_active} onChange={handleChange} />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Active</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 min-w-[80px]">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
