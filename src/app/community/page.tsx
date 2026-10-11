'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Plus, X, UserX, Search, RotateCw, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const USERS_CACHE_KEY = 'sheba_admin_all_users_v1';

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // In-memory cache for author emails so we never fetch the same author twice
  const authorEmailCacheRef = useRef<Map<number | string, string>>(new Map());

  // Helper to resolve author emails fast without fetching 120+ pages
  const resolveAuthorEmails = async (postsList: any[]) => {
    // 1. Check if users are in sessionStorage from the users page
    try {
      const cachedUsersRaw = sessionStorage.getItem(USERS_CACHE_KEY);
      if (cachedUsersRaw) {
        const parsed = JSON.parse(cachedUsersRaw);
        if (parsed && Array.isArray(parsed.data)) {
          parsed.data.forEach((u: any) => {
            if (u && u.id && u.email) {
              authorEmailCacheRef.current.set(String(u.id), u.email);
              authorEmailCacheRef.current.set(Number(u.id), u.email);
            }
          });
        }
      }
    } catch {
      // Ignore cache parse error
    }

    // 2. Identify missing unique author IDs on this page only
    const missingAuthorIds: (number | string)[] = [];
    postsList.forEach((post) => {
      const authorId = post.author || post.user || post.author_id || post.user_id;
      if (authorId && !authorEmailCacheRef.current.has(authorId)) {
        if (!missingAuthorIds.includes(authorId)) {
          missingAuthorIds.push(authorId);
        }
      }
    });

    // 3. Fetch missing author IDs in parallel (at most 10-20 requests in one quick batch)
    if (missingAuthorIds.length > 0) {
      await Promise.all(
        missingAuthorIds.map(async (authorId) => {
          try {
            const res = await api.get(`/admin/users/${authorId}/`);
            if (res.data && res.data.email) {
              authorEmailCacheRef.current.set(authorId, res.data.email);
              authorEmailCacheRef.current.set(String(authorId), res.data.email);
            }
          } catch {
            authorEmailCacheRef.current.set(authorId, 'N/A');
          }
        })
      );
    }

    // 4. Map emails back to the posts
    return postsList.map((post) => {
      const authorId = post.author || post.user || post.author_id || post.user_id;
      return {
        ...post,
        mapped_author_email: authorId ? (authorEmailCacheRef.current.get(authorId) || 'N/A') : 'N/A',
        author_user_id: authorId
      };
    });
  };

  const fetchPosts = useCallback(async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError('');
    try {
      let endpoint = `/community/forum/posts/?page=${page}`;
      if (search.trim()) {
        endpoint += `&search=${encodeURIComponent(search.trim())}`;
      }

      const postsResponse = await api.get(endpoint);
      const data = postsResponse.data;
      const rawPosts = data.results || (Array.isArray(data) ? data : []);

      setTotalCount(data.count !== undefined ? data.count : rawPosts.length);
      setNextUrl(data.next || null);
      setPrevUrl(data.previous || null);
      setCurrentPage(page);

      // Fast email resolution (under 100ms)
      const postsWithEmail = await resolveAuthorEmails(rawPosts);
      setPosts(postsWithEmail);
    } catch (err: any) {
      setError(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, appliedSearch);
  }, [fetchPosts, appliedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    setCurrentPage(1);
    fetchPosts(1, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setCurrentPage(1);
    fetchPosts(1, '');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই পোস্টটি ডিলিট করতে চান?')) return;
    try {
      await api.delete(`/community/forum/posts/${id}/`);
      setPosts(posts.filter((p) => p.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert('পোস্ট ডিলিট করতে ব্যর্থ হয়েছে: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSuspendUser = async (post: any) => {
    const authorId = post.author_user_id || post.author || post.user || post.author_id || post.user_id;
    const authorEmail = post.mapped_author_email;

    if (!authorId) {
      alert('ব্যবহারকারীর আইডি পাওয়া যায়নি।');
      return;
    }

    const emailDisplay = authorEmail && authorEmail !== 'N/A' ? authorEmail : `ID: ${authorId}`;
    const confirmMsg = `আপনি কি নিশ্চিতভাবে এই ইউজার (${emailDisplay})-কে সাসপেন্ড করতে চান?\n\nএর ফলে এই ইউজারের অ্যাকাউন্ট এবং তার করা সব পোস্ট মুছে ফেলা হবে।`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Delete user account from backend
      await api.delete(`/admin/users/${authorId}/`);

      // 2. Also ensure this specific post is removed
      try {
        await api.delete(`/community/forum/posts/${post.id}/`);
      } catch {
        // Ignored if already cascade-deleted
      }

      alert(`ব্যবহারকারী (${emailDisplay}) সফলভাবে সাসপেন্ড করা হয়েছে এবং তার সব পোস্ট মুছে দেওয়া হয়েছে!`);
      fetchPosts(currentPage, appliedSearch);
    } catch (err: any) {
      alert('সাসপেন্ড করতে সমস্যা হয়েছে: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenModal = () => {
    setNewTitle('');
    setNewContent('');
    setSelectedImage(null);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (post: any) => {
    setNewTitle(post.title || '');
    setNewContent(post.content || '');
    setEditId(post.id);
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      alert('কনটেন্ট খালি রাখা যাবে না');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle || 'Untitled');
      formData.append('content', newContent);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      if (editId) {
        const response = await api.put(`/community/forum/posts/${editId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setPosts(posts.map((p) => (p.id === editId ? response.data : p)));
      } else {
        const response = await api.post('/community/forum/posts/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setPosts([response.data, ...posts]);
        setTotalCount((prev) => prev + 1);
      }
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setSelectedImage(null);
      setEditId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'পোস্ট সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            কমিউনিটি পোস্ট
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            কমিউনিটি ফোরাম পোস্ট এবং আলোচনা পরিচালনা করুন।
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenModal}
            type="button"
            className="rounded-lg bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            নতুন পোস্ট যুক্ত করুন
          </button>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="টাইটেল বা কনটেন্ট দিয়ে পোস্ট খুঁজুন..."
            className="block w-full pl-11 pr-20 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              title="সার্চ মুছুন"
              className="absolute inset-y-0 right-12 pr-2 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-500 cursor-pointer transition-colors flex items-center"
          >
            সার্চ
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            <span>মোট {totalCount} টি পোস্ট</span>
          </div>

          <button
            onClick={() => fetchPosts(currentPage, appliedSearch)}
            disabled={loading}
            title="পোস্ট তালিকা রিফ্রেশ করুন"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {appliedSearch && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-gray-600">
          <div>
            অনুসন্ধান: <span className="font-semibold text-gray-900">&quot;{appliedSearch}&quot;</span> এর জন্য{' '}
            <span className="font-bold text-indigo-600">{totalCount}</span> টি পোস্ট পাওয়া গেছে
          </div>
          <button
            onClick={handleClearSearch}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
          >
            সকল পোস্ট দেখুন
          </button>
        </div>
      )}

      {error && <div className="mt-4 text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

      {/* Table */}
      <div className="mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sm:pl-6">
                      টাইটেল
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      কনটেন্ট
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      লেখক
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ইমেইল
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      লাইক
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span>পোস্ট লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : posts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-8 w-8 text-gray-400" />
                          <p className="font-medium text-gray-700">কোনো পোস্ট পাওয়া যায়নি</p>
                          {appliedSearch ? (
                            <p className="text-xs text-gray-500">
                              &quot;{appliedSearch}&quot; এর সাথে মিলে এমন কোনো পোস্ট পাওয়া যায়নি।
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">তালিকায় কোনো পোস্ট নেই।</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-xs truncate">
                          {post.title ? (post.title.length > 35 ? post.title.substring(0, 35) + '...' : post.title) : 'কোন টাইটেল নেই'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-500 max-w-sm truncate">
                          {post.content ? (post.content.length > 55 ? post.content.substring(0, 55) + '...' : post.content) : 'কোন কনটেন্ট নেই'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm font-medium text-gray-800">
                          {post.author_name || post.user_name || 'নাম নেই'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm font-mono text-gray-600">
                          {post.mapped_author_email || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            ❤️ {post.likes_count || post.likes || 0}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSuspendUser(post)}
                              title="এই ইউজারকে সাসপেন্ড ও তার সব পোস্ট ডিলিট করুন"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 border border-red-200 transition-colors cursor-pointer"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              সাসপেন্ড
                            </button>
                            <button
                              onClick={() => handleEdit(post)}
                              className="text-indigo-600 hover:text-indigo-900 px-2.5 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            >
                              এডিট
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              title="পোস্ট মুছুন"
                              className="text-red-600 hover:text-red-900 p-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 px-4">
              <div className="text-sm text-gray-700">
                মোট <span className="font-semibold text-gray-900">{totalCount}</span> টি পোস্ট{' '}
                {totalCount > 0 && (
                  <span className="text-gray-500 text-xs ml-1">
                    (পৃষ্ঠা {currentPage} / {totalPages})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPosts(currentPage - 1, appliedSearch)}
                  disabled={!prevUrl || currentPage <= 1 || loading}
                  className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                >
                  পূর্ববর্তী
                </button>
                <button
                  onClick={() => fetchPosts(currentPage + 1, appliedSearch)}
                  disabled={!nextUrl || currentPage >= totalPages || loading}
                  className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                >
                  পরবর্তী
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">{editId ? 'পোস্ট এডিট করুন' : 'নতুন পোস্ট তৈরি করুন'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePost} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">টাইটেল</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="পোস্টের টাইটেল"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">কনটেন্ট</label>
                <textarea
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="আপনি কি ভাবছেন?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ছবি (ঐচ্ছিক)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newContent.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[80px] cursor-pointer"
                >
                  {submitting ? 'সেভ হচ্ছে...' : editId ? 'সেভ করুন' : 'পোস্ট তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
