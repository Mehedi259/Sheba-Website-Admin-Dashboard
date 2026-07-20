'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function ClassifiedsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    try {
      const response = await api.get('/admin/jobs/');
      setJobs(response.data.results || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this job post?')) return;
    try {
      await api.delete(`/admin/jobs/${id}/`);
      setJobs(jobs.filter(j => j.id !== id));
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Classifieds (Jobs)
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage Jobs posted by users.
          </p>
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
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Title</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Company</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">Loading jobs...</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No jobs found.</td></tr>
                  ) : jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {job.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{job.company_name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {job.status}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2">
                        <button onClick={() => handleDelete(job.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
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
