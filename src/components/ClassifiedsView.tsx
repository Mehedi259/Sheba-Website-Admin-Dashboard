'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import { serviceCategories } from '@/components/Sidebar';

export default function ClassifiedsView({
  type,
  title,
  defaultCategory,
}: {
  type: 'jobs' | 'properties' | 'vehicles' | 'services';
  title: string;
  defaultCategory?: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [allServicesData, setAllServicesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Generic form data for all types
  const [formData, setFormData] = useState<any>({});

  // Reset page when category or type changes
  useEffect(() => {
    setCurrentPage(1);
    setFormData({});
  }, [type, defaultCategory]);

  const isCategoryMatch = (item: any, selectedCategory?: string) => {
    if (!selectedCategory) return true;
    const target = selectedCategory.trim().toLowerCase();

    const candidates = [
      item.service_type,
      typeof item.category === 'string' ? item.category : item.category?.name,
      item.category?.slug,
      item.category_name,
    ];

    for (const c of candidates) {
      if (!c) continue;
      const val = String(c).trim().toLowerCase();
      if (val === target) return true;
      if (val.replace(/[\s_-]+/g, '') === target.replace(/[\s_-]+/g, '')) return true;
    }

    return false;
  };

  const fetchServicesAll = async () => {
    setLoading(true);
    setError('');
    try {
      const firstRes = await api.get('/admin/services/?page=1');
      let allItems: any[] = [];
      if (firstRes.data && Array.isArray(firstRes.data.results)) {
        allItems = [...firstRes.data.results];
        const count = firstRes.data.count || allItems.length;
        const pageSize = allItems.length || 20;
        const pages = Math.ceil(count / pageSize);
        if (pages > 1) {
          const promises = [];
          for (let p = 2; p <= pages; p++) {
            promises.push(
              api.get(`/admin/services/?page=${p}`)
                .then((r) => r.data?.results || [])
                .catch(() => [])
            );
          }
          const rest = await Promise.all(promises);
          rest.forEach((batch) => allItems.push(...batch));
        }
      } else if (Array.isArray(firstRes.data)) {
        allItems = firstRes.data;
      }
      setAllServicesData(allItems);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherData = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/${type}/?page=${page}`);
      if (response.data && response.data.results) {
        setData(response.data.results);
        setTotalCount(response.data.count || 0);
        // Backend DRF default PAGE_SIZE is 20
        setTotalPages(Math.max(1, Math.ceil((response.data.count || 0) / 20)));
      } else {
        const results = Array.isArray(response.data) ? response.data : [];
        setData(results);
        setTotalPages(1);
        setTotalCount(results.length);
      }
    } catch (err: any) {
      setError(err.message || `Failed to fetch ${type}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (type === 'services') {
      fetchServicesAll();
    } else {
      fetchOtherData(currentPage);
    }
  }, [type, currentPage, defaultCategory]);

  // Derived filtered & paginated data for services
  const { displayItems, activeTotalCount, activeTotalPages } = useMemo(() => {
    if (type !== 'services') {
      return {
        displayItems: data,
        activeTotalCount: totalCount,
        activeTotalPages: totalPages,
      };
    }

    const filtered = defaultCategory
      ? allServicesData.filter((item) => isCategoryMatch(item, defaultCategory))
      : allServicesData;

    const pageSize = 10;
    const calcPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, calcPages);
    const startIdx = (safeCurrentPage - 1) * pageSize;
    const currentSlice = filtered.slice(startIdx, startIdx + pageSize);

    return {
      displayItems: currentSlice,
      activeTotalCount: filtered.length,
      activeTotalPages: calcPages,
    };
  }, [type, data, allServicesData, defaultCategory, currentPage, totalCount, totalPages]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete this item?`)) return;
    try {
      await api.delete(`/admin/${type}/${id}/`);
      if (type === 'services') {
        fetchServicesAll();
      } else {
        fetchOtherData(currentPage);
      }
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  const handleOpenModal = () => {
    let initialData: any = { title: '', city: '', contact_phone: '', description: '', status: 'PUBLISHED' };
    if (type === 'jobs') {
      initialData = { ...initialData, type: 'FULL_TIME', company_name_en: '', salary_min: '', salary_max: '', salary_currency: 'OMR' };
    } else if (type === 'properties') {
      initialData = { ...initialData, type: 'RESIDENTIAL', category: 'HOUSE', purpose: 'RENT', price: '' };
    } else if (type === 'vehicles') {
      initialData = { ...initialData, type: 'CAR', make: '', model: '', year: 2020, condition: 'USED_GOOD', transmission: 'AUTOMATIC', fuel_type: 'PETROL', price: '', mileage: '', color: '' };
    } else if (type === 'services') {
      const initialCat = defaultCategory || 'Specialist Doctor';
      initialData = { 
        ...initialData, 
        category: initialCat, 
        category_name: initialCat, 
        service_type: initialCat,
        price: '0' 
      };
    }
    setFormData(initialData);
    setSelectedImage(null);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    const editData = { ...item };
    if (type === 'services') {
      const cat = item.service_type || item.category || defaultCategory || 'Specialist Doctor';
      editData.category_name = cat;
      editData.service_type = item.service_type || cat;
      editData.category = item.category || cat;
    }
    setFormData(editData);
    setEditId(item.id);
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let response: any;
      const payload: any = { ...formData };

      if (type === 'services') {
        const cat = formData.category_name || formData.service_type || defaultCategory || 'Specialist Doctor';
        payload.category = cat;
        payload.service_type = formData.service_type || cat;
        if (!payload.price) payload.price = 0;
      }

      if (editId) {
        response = await api.put(`/admin/${type}/${editId}/`, payload);
      } else {
        response = await api.post(`/admin/${type}/`, payload);
      }

      // Upload image if selected
      if (selectedImage && response.data?.id) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', selectedImage);
          let contentType = '';
          if (type === 'jobs') contentType = 'job';
          if (type === 'properties') contentType = 'property';
          if (type === 'vehicles') contentType = 'vehicle';
          if (type === 'services') contentType = 'service';

          imageFormData.append('content_type', contentType);
          imageFormData.append('content_id', response.data.id.toString());
          imageFormData.append('is_primary', 'true');

          await api.post('/classifieds/images/', imageFormData);
        } catch (imgErr) {
          console.error('Failed to upload image', imgErr);
        }
      }

      if (type === 'services') {
        await fetchServicesAll();
      } else {
        await fetchOtherData(currentPage);
      }

      setIsModalOpen(false);
      setFormData({});
      setSelectedImage(null);
      setEditId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to save ${type.slice(0, -1)}`);
      console.error(err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const currentCategoryLabel = defaultCategory
    ? serviceCategories.find((c) => c.name.toLowerCase() === defaultCategory.toLowerCase())?.label || defaultCategory
    : '';

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {currentCategoryLabel ? `${title}: ${currentCategoryLabel}` : title}
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            ব্যবহারকারীদের পোস্ট করা সব {currentCategoryLabel || title} পরিচালনা করুন।
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenModal}
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center gap-2 capitalize"
          >
            <Plus className="h-4 w-4" />
            নতুন যুক্ত করুন
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
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">শিরোনাম</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ব্যবহারকারী</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">বিস্তারিত / ক্যাটাগরি</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">শহর</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">স্ট্যাটাস</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">অ্যাকশন</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">লোড হচ্ছে...</td></tr>
                  ) : displayItems.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">কোন তথ্য পাওয়া যায়নি।</td></tr>
                  ) : displayItems.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {item.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.user_name || item.owner_name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {type === 'jobs' && (
                          item.type + ' | ' + (item.company?.name || 'Company') + 
                          (item.salary_min || item.salary_max 
                            ? ` | Salary: ${item.salary_min || 0}-${item.salary_max || 'Max'} ${item.salary_currency || 'OMR'}`
                            : item.price ? ` | ${item.price} OMR` : ' | Negotiable')
                        )}
                        {type === 'properties' && (item.type + ' | ' + item.category)}
                        {type === 'vehicles' && (item.make + ' ' + item.model + ' (' + item.year + ')')}
                        {type === 'services' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {item.service_type || item.category || 'Service'}
                            </span>
                            {item.category && item.service_type && item.category !== item.service_type && (
                              <span className="text-xs text-gray-400">({item.category})</span>
                            )}
                            {item.price ? <span className="text-xs font-semibold text-gray-700">{item.price} OMR</span> : null}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.city}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          item.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 px-2 py-1 text-xs bg-indigo-50 rounded">এডিট</button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 px-2 py-1 text-xs bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {activeTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(activeTotalPages, p + 1))}
                    disabled={currentPage === activeTotalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{activeTotalPages}</span>
                      {activeTotalCount > 0 && <span> ({activeTotalCount} total items)</span>}
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        &larr;
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(activeTotalPages, p + 1))}
                        disabled={currentPage === activeTotalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Dynamic Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {editId ? 'এডিট করুন' : 'নতুন তৈরি করুন'}: {type === 'services' ? 'সার্ভিস' : type.slice(0, -1)}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">শিরোনাম <span className="text-red-500">*</span></label>
                  <input type="text" name="title" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.title || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">শহর <span className="text-red-500">*</span></label>
                  <input type="text" name="city" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.city || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">যোগাযোগের নম্বর <span className="text-red-500">*</span></label>
                  <input type="text" name="contact_phone" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.contact_phone || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">স্ট্যাটাস</label>
                  <select name="status" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.status || 'PUBLISHED'} onChange={handleChange}>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">বিস্তারিত <span className="text-red-500">*</span></label>
                <textarea name="description" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.description || ''} onChange={handleChange} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">ছবি (ঐচ্ছিক)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                />
              </div>

              {/* Jobs Specific Fields */}
              {type === 'jobs' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Job Type</label>
                      <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.type || 'FULL_TIME'} onChange={handleChange}>
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="TEMPORARY">Temporary</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name (English)</label>
                      <input type="text" name="company_name_en" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.company_name_en || ''} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">সর্বনিম্ন বেতন</label>
                      <input type="number" name="salary_min" placeholder="e.g. 300" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.salary_min || ''} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">সর্বোচ্চ বেতন</label>
                      <input type="number" name="salary_max" placeholder="e.g. 500" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.salary_max || ''} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মুদ্রা</label>
                      <select name="salary_currency" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.salary_currency || 'OMR'} onChange={handleChange}>
                        <option value="OMR">OMR</option>
                        <option value="USD">USD</option>
                        <option value="BDT">BDT</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Properties Specific Fields */}
              {type === 'properties' && (
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
              {type === 'vehicles' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ধরন</label>
                      <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.type || 'CAR'} onChange={handleChange}>
                        <option value="CAR">Car</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="TRUCK">Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ব্র্যান্ড</label>
                      <input type="text" name="make" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.make || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মডেল</label>
                      <input type="text" name="model" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.model || ''} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">বছর</label>
                      <input type="number" name="year" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.year || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">অবস্থা</label>
                      <select name="condition" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.condition || 'USED_GOOD'} onChange={handleChange}>
                        <option value="NEW">New</option>
                        <option value="USED_LIKE_NEW">Used - Like New</option>
                        <option value="USED_GOOD">Used - Good</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মূল্য (OMR)</label>
                      <input type="number" name="price" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.price || ''} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ট্রান্সমিশন</label>
                      <select name="transmission" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.transmission || 'AUTOMATIC'} onChange={handleChange}>
                        <option value="AUTOMATIC">Automatic</option>
                        <option value="MANUAL">Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">জ্বালানির ধরন</label>
                      <select name="fuel_type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.fuel_type || 'PETROL'} onChange={handleChange}>
                        <option value="PETROL">Petrol</option>
                        <option value="DIESEL">Diesel</option>
                        <option value="ELECTRIC">Electric</option>
                        <option value="HYBRID">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মাইলেজ (KM)</label>
                      <input type="number" name="mileage" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.mileage || ''} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">রং</label>
                      <input type="text" name="color" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900" value={formData.color || ''} onChange={handleChange} />
                    </div>
                  </div>
                </>
              )}

              {/* Services Specific Fields */}
              {type === 'services' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ক্যাটাগরি</label>
                      <select
                        name="category_name"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900"
                        value={formData.category_name || formData.service_type || formData.category || defaultCategory || 'Specialist Doctor'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            category_name: val,
                            category: val,
                            service_type: formData.service_type && formData.service_type !== formData.category_name ? formData.service_type : val,
                          });
                        }}
                        required
                      >
                        {serviceCategories.map((cat) => (
                          <option key={cat.name} value={cat.name}>
                            {cat.label} ({cat.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">সার্ভিসের ধরন / সাব-ক্যাটাগরি</label>
                      <input
                        type="text"
                        name="service_type"
                        placeholder="যেমন: Specialist Doctor / General"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900"
                        value={formData.service_type || ''}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">মূল্য (OMR, ঐচ্ছিক)</label>
                    <input
                      type="number"
                      name="price"
                      placeholder="0"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-gray-900"
                      value={formData.price ?? ''}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[80px] capitalize"
                >
                  {submitting ? 'সেভ হচ্ছে...' : editId ? 'সেভ করুন' : `নতুন ${type === 'services' ? 'সার্ভিস' : type.slice(0, -1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
