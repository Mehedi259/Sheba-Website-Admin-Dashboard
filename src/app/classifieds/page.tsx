'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export default function ClassifiedsPage() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'properties' | 'vehicles' | 'services'>('jobs');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Generic form data for all types
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/${activeTab}/`);
      setData(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Reset form when tab changes
    setFormData({});
  }, [activeTab]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete this item?`)) return;
    try {
      await api.delete(`/admin/${activeTab}/${id}/`);
      setData(data.filter(item => item.id !== id));
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  const handleOpenModal = () => {
    let initialData: any = { title: '', city: '', contact_phone: '', description: '', status: 'PUBLISHED' };
    if (activeTab === 'jobs') {
      initialData = { ...initialData, type: 'FULL_TIME', company_name_en: '' };
    } else if (activeTab === 'properties') {
      initialData = { ...initialData, type: 'RESIDENTIAL', category: 'HOUSE', purpose: 'RENT', price: '' };
    } else if (activeTab === 'vehicles') {
      initialData = { ...initialData, type: 'CAR', make: '', model: '', year: 2020, condition: 'USED_GOOD', transmission: 'AUTOMATIC', fuel_type: 'PETROL', price: '' };
    } else if (activeTab === 'services') {
      initialData = { ...initialData, category: '', service_type: '' };
    }
    setFormData(initialData);
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post(`/admin/${activeTab}/`, formData);
      
      // Upload image if selected
      if (selectedImage && response.data.id) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', selectedImage);
          let contentType = '';
          if (activeTab === 'jobs') contentType = 'job';
          if (activeTab === 'properties') contentType = 'property';
          if (activeTab === 'vehicles') contentType = 'vehicle';
          if (activeTab === 'services') contentType = 'service';
          
          imageFormData.append('content_type', contentType);
          imageFormData.append('content_id', response.data.id.toString());
          imageFormData.append('is_primary', 'true');
          
          await api.post('/classifieds/images/', imageFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (imgErr) {
          console.error("Failed to upload image", imgErr);
        }
      }

      setData([response.data, ...data]);
      setIsModalOpen(false);
      setFormData({});
      setSelectedImage(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to create ${activeTab.slice(0, -1)}`);
      console.error(err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const tabs = [
    { id: 'jobs', name: 'Jobs' },
    { id: 'properties', name: 'Properties' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'services', name: 'Services' },
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Classifieds
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage all classified ads posted by users.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenModal}
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center gap-2 capitalize"
          >
            <Plus className="h-4 w-4" />
            Add New {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {error && <div className="mt-4 mb-4 text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Title</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">City</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">Loading {activeTab}...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">No {activeTab} found.</td></tr>
                  ) : data.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {item.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {activeTab === 'jobs' && (item.type + ' | ' + (item.company?.name || 'Company'))}
                        {activeTab === 'properties' && (item.type + ' | ' + item.category)}
                        {activeTab === 'vehicles' && (item.make + ' ' + item.model + ' (' + item.year + ')')}
                        {activeTab === 'services' && (item.category + ' | ' + item.service_type)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.city}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.status}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">Create New {activeTab.slice(0, -1)}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input type="text" name="title" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.title || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                  <input type="text" name="city" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.city || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Phone <span className="text-red-500">*</span></label>
                  <input type="text" name="contact_phone" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.contact_phone || ''} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                <textarea name="description" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.description || ''} onChange={handleChange} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                />
              </div>

              {/* Jobs Specific Fields */}
              {activeTab === 'jobs' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Job Type</label>
                      <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.type || 'FULL_TIME'} onChange={handleChange}>
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name (English)</label>
                      <input type="text" name="company_name_en" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.company_name_en || ''} onChange={handleChange} required />
                    </div>
                  </div>
                </>
              )}

              {/* Properties Specific Fields */}
              {activeTab === 'properties' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.type || 'RESIDENTIAL'} onChange={handleChange}>
                        <option value="RESIDENTIAL">Residential</option>
                        <option value="COMMERCIAL">Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select name="category" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.category || 'HOUSE'} onChange={handleChange}>
                        <option value="HOUSE">House</option>
                        <option value="FLAT">Flat</option>
                        <option value="APARTMENT">Apartment</option>
                        <option value="OFFICE">Office</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purpose</label>
                      <select name="purpose" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.purpose || 'RENT'} onChange={handleChange}>
                        <option value="RENT">Rent</option>
                        <option value="SALE">Sale</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (OMR)</label>
                    <input type="number" name="price" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.price || ''} onChange={handleChange} required />
                  </div>
                </>
              )}

              {/* Vehicles Specific Fields */}
              {activeTab === 'vehicles' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.type || 'CAR'} onChange={handleChange}>
                        <option value="CAR">Car</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="TRUCK">Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Make (Brand)</label>
                      <input type="text" name="make" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.make || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Model</label>
                      <input type="text" name="model" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.model || ''} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year</label>
                      <input type="number" name="year" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.year || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Condition</label>
                      <select name="condition" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.condition || 'USED_GOOD'} onChange={handleChange}>
                        <option value="NEW">New</option>
                        <option value="USED_LIKE_NEW">Used - Like New</option>
                        <option value="USED_GOOD">Used - Good</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price (OMR)</label>
                      <input type="number" name="price" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.price || ''} onChange={handleChange} required />
                    </div>
                  </div>
                </>
              )}

              {/* Services Specific Fields */}
              {activeTab === 'services' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <input type="text" name="category" placeholder="e.g. Cleaning" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.category || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Type</label>
                      <input type="text" name="service_type" placeholder="e.g. Deep Cleaning" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.service_type || ''} onChange={handleChange} required />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[80px] capitalize"
                >
                  {submitting ? 'Creating...' : `Create ${activeTab.slice(0, -1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
