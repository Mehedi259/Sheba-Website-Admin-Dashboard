'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export default function EmergencyPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    service_type: 'ambulance',
    phone_number: '',
    address: '',
    location: '',
    is_24_7: false
  });

  const fetchServices = async () => {
    try {
      const response = await api.get('/admin/emergency-services/');
      setServices(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emergency services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this emergency service?')) return;
    try {
      await api.delete(`/admin/emergency-services/${id}/`);
      setServices(services.filter(s => s.id !== id));
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  const handleOpenModal = () => {
    setFormData({ name: '', service_type: 'ambulance', phone_number: '', address: '', location: '', is_24_7: false });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (service: any) => {
    setFormData({ ...service });
    setEditId(service.id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone_number) return;
    
    setSubmitting(true);
    try {
      if (editId) {
        const response = await api.put(`/admin/emergency-services/${editId}/`, formData);
        setServices(services.map(s => s.id === editId ? response.data : s));
      } else {
        const response = await api.post('/admin/emergency-services/', formData);
        setServices([response.data, ...services]);
      }
      setIsModalOpen(false);
      setFormData({ name: '', service_type: 'ambulance', phone_number: '', address: '', location: '', is_24_7: false });
      setEditId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save emergency service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Emergency Services
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage emergency service providers (Ambulance, Fire, Police, etc.)
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenModal}
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Service
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">24/7</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">Loading services...</td></tr>
                  ) : services.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">No emergency services found.</td></tr>
                  ) : services.map((service) => (
                    <tr key={service.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {service.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{service.service_type?.replace('_', ' ')}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{service.phone_number}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {service.is_24_7 ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
                        <button onClick={() => handleEdit(service)} className="text-indigo-600 hover:text-indigo-900 px-2 py-1 text-xs bg-indigo-50 rounded">Edit</button>
                        <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900 px-2 py-1 text-xs bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Emergency Service' : 'Create Emergency Service'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Name</label>
                <input
                  type="text"
                  name="name"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., City General Hospital"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <select
                  name="service_type"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={formData.service_type}
                  onChange={handleChange}
                >
                  <option value="ambulance">Ambulance</option>
                  <option value="fire">Fire</option>
                  <option value="police">Police</option>
                  <option value="hospital">Hospital</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="blood_bank">Blood Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="e.g., +968 1234 5678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., Al Khuwair, Muscat"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Muscat"
                  required
                />
              </div>

              <div className="flex items-center mt-4">
                <input
                  id="is_24_7"
                  name="is_24_7"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  checked={formData.is_24_7}
                  onChange={handleChange}
                />
                <label htmlFor="is_24_7" className="ml-2 block text-sm text-gray-900">
                  Available 24/7
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name || !formData.phone_number}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                >
                  {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
