'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, X, RotateCw, UserX, Loader2, AlertCircle, CheckCircle2, BadgeCheck } from 'lucide-react';
import api from '@/lib/api';

const CACHE_KEY = 'sheba_admin_all_users_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export default function UsersPage() {
  // Regular paginated state
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Universal Indexing state
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState(0);
  const [indexingTotal, setIndexingTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const searchPageSize = 20;

  const indexingAbortRef = useRef<boolean>(false);

  // Initial fetch for Page 1
  const fetchUsers = async (url: string = '/admin/users/') => {
    setLoading(true);
    try {
      let endpoint = url;
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        endpoint = `/admin/users/${urlObj.search}`;
      }

      const response = await api.get(endpoint);
      if (response.data && response.data.results) {
        setUsers(response.data.results);
        setNextUrl(response.data.next);
        setPrevUrl(response.data.previous);
        const count = response.data.count || 0;
        setTotalCount(count);
        return count;
      } else {
        const data = response.data || [];
        setUsers(data);
        setTotalCount(data.length);
        return data.length;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      return 0;
    } finally {
      setLoading(false);
    }
  };

  // Background indexing function to fetch all users in parallel batches
  const indexAllUsers = useCallback(async (total: number, forceRefresh: boolean = false) => {
    if (total <= 0) return;
    
    // Check session cache first if not forced
    if (!forceRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Array.isArray(cached.data) && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setAllUsers(cached.data);
            setIndexedCount(cached.data.length);
            setIndexingTotal(cached.data.length);
            return;
          }
        }
      } catch (e) {
        // Ignore cache parse error
      }
    }

    indexingAbortRef.current = false;
    setIsIndexing(true);
    setIndexingTotal(total);
    setIndexedCount(0);

    const totalPages = Math.ceil(total / 20);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const concurrency = 10;
    const accumulatedUsers: any[] = [];

    try {
      for (let i = 0; i < pages.length; i += concurrency) {
        if (indexingAbortRef.current) break;

        const batch = pages.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async (pageNum) => {
            try {
              const res = await api.get(`/admin/users/?page=${pageNum}`);
              return res.data?.results || [];
            } catch {
              return [];
            }
          })
        );

        for (const res of batchResults) {
          accumulatedUsers.push(...res);
        }

        // Deduplicate by ID
        const seen = new Set();
        const unique = accumulatedUsers.filter((u) => {
          if (!u || !u.id || seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });

        setAllUsers([...unique]);
        setIndexedCount(unique.length);

        // Tiny delay between chunks to keep server thread pool smooth
        await new Promise((r) => setTimeout(r, 40));
      }

      // Final deduplicate & cache
      const finalSeen = new Set();
      const finalUnique = accumulatedUsers.filter((u) => {
        if (!u || !u.id || finalSeen.has(u.id)) return false;
        finalSeen.add(u.id);
        return true;
      });

      setAllUsers(finalUnique);
      setIndexedCount(finalUnique.length);

      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: finalUnique, timestamp: Date.now() })
        );
      } catch {
        // Quota exceeded or private browsing, safe to ignore
      }
    } catch (err: any) {
      console.error('Failed indexing users:', err);
    } finally {
      setIsIndexing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const count = await fetchUsers();
      if (isMounted && count > 0) {
        indexAllUsers(count);
      }
    })();

    return () => {
      isMounted = false;
      indexingAbortRef.current = true;
    };
  }, [indexAllUsers]);

  // Handle Search Filtering
  const isSearching = searchQuery.trim().length > 0;

  const filteredUsers = useMemo(() => {
    if (!isSearching) return [];

    const q = searchQuery.toLowerCase().trim();
    // Search across allUsers (or current page users if indexing hasn't loaded yet)
    const dataset = allUsers.length > 0 ? allUsers : users;

    return dataset.filter((u: any) => {
      if (!u) return false;
      const email = (u.email || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const firstName = (u.first_name || '').toLowerCase();
      const lastName = (u.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const name = (u.name || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();

      return (
        email.includes(q) ||
        username.includes(q) ||
        fullName.includes(q) ||
        name.includes(q) ||
        phone.includes(q)
      );
    });
  }, [isSearching, searchQuery, allUsers, users]);

  // Reset search page on new search query
  useEffect(() => {
    setSearchPage(1);
  }, [searchQuery]);

  // Displayed users depending on search mode
  const displayedUsers = useMemo(() => {
    if (!isSearching) {
      return users;
    }
    const start = (searchPage - 1) * searchPageSize;
    return filteredUsers.slice(start, start + searchPageSize);
  }, [isSearching, users, filteredUsers, searchPage]);

  const searchTotalPages = Math.max(1, Math.ceil(filteredUsers.length / searchPageSize));

  // User Verification Toggle
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const handleToggleVerify = async (userId: number, currentStatus: boolean) => {
    setVerifyingId(userId);
    try {
      const response = await api.post(`/admin/users/${userId}/verify/`);
      const newStatus = response.data.is_verified;

      // Update regular user list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_verified: newStatus } : u))
      );

      // Update indexed users list
      setAllUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === userId ? { ...u, is_verified: newStatus } : u
        );
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: updated, timestamp: Date.now() })
          );
        } catch {
          // Ignore
        }
        return updated;
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'ভেরিফাই করতে ব্যর্থ হয়েছে');
    } finally {
      setVerifyingId(null);
    }
  };

  // User Suspension / Deletion
  const handleDelete = async (userId: number) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ব্যবহারকারীকে সাসপেন্ড/ডিলিট করতে চান?')) return;
    try {
      await api.delete(`/admin/users/${userId}/`);
      
      // Update local regular list
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      
      // Update indexed users list
      setAllUsers((prev) => {
        const updated = prev.filter((u) => u.id !== userId);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: updated, timestamp: Date.now() })
          );
        } catch {
          // Ignore
        }
        return updated;
      });

      setTotalCount((prev) => Math.max(0, prev - 1));
      setIndexedCount((prev) => Math.max(0, prev - 1));
      alert('ব্যবহারকারী সফলভাবে সাসপেন্ড করা হয়েছে!');
    } catch (err: any) {
      alert('সাসপেন্ড করতে ব্যর্থ হয়েছে: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleForceRefresh = () => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {}
    fetchUsers().then((count) => {
      if (count > 0) indexAllUsers(count, true);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            ব্যবহারকারী
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            আপনার প্ল্যাটফর্মের সব ব্যবহারকারীর নাম, ইমেইল এবং স্ট্যাটাস সহ তালিকা।
          </p>
        </div>
      </div>

      {/* Universal Search Bar */}
      <div className="mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            {isIndexing && !allUsers.length ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইমেইল (যেমন: @gmail.com), ইউজারনেম (@username) বা নাম দিয়ে খুঁজুন..."
            className="block w-full pl-11 pr-10 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="সার্চ মুছুন"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Status badges & Refresh */}
        <div className="flex items-center gap-3 self-end md:self-auto text-xs">
          {isIndexing ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>
                ইনডেক্সিং হচ্ছে... ({indexedCount} / {indexingTotal || totalCount})
              </span>
            </div>
          ) : allUsers.length > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>সার্চ প্রস্তুত: মোট {allUsers.length} জন</span>
            </div>
          ) : null}

          <button
            onClick={handleForceRefresh}
            disabled={isIndexing}
            title="ইউজার তালিকা এবং ক্যাশ রিফ্রেশ করুন"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Search results banner if searching */}
      {isSearching && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-gray-600">
          <div>
            অনুসন্ধান: <span className="font-semibold text-gray-900">&quot;{searchQuery}&quot;</span> এর জন্য{' '}
            <span className="font-bold text-indigo-600">{filteredUsers.length}</span> জন ব্যবহারকারী পাওয়া গেছে
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
          >
            সকল ব্যবহারকারী দেখুন
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
                      ব্যবহারকারী
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ইমেইল
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      যোগদান করেছেন
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading && !isSearching ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span>ব্যবহারকারী লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-8 w-8 text-gray-400" />
                          <p className="font-medium text-gray-700">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                          {isSearching ? (
                            <p className="text-xs text-gray-500">
                              &quot;{searchQuery}&quot; দিয়ে কোনো ফলাফল মেলেনি। সঠিক বানান লিখুন অথবা সার্চ ক্লিয়ার করুন।
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">তালিকায় কোনো ব্যবহারকারী নেই।</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900">
                                {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (user.name || 'নাম নেই')}
                              </span>
                              {user.is_verified && (
                                <span title="ভেরিফাইড ব্যবহারকারী" className="inline-flex items-center text-blue-600">
                                  <BadgeCheck className="h-4 w-4 fill-blue-600 text-white" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">@{user.username || 'unknown'}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm font-mono text-gray-600">
                          {user.email || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="relative whitespace-nowrap py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleVerify(user.id, user.is_verified)}
                              disabled={verifyingId === user.id}
                              title={user.is_verified ? "ভেরিফিকেশন প্রত্যাহার করুন" : "ইউজার ভেরিফাই করুন"}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                                user.is_verified
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                              }`}
                            >
                              {verifyingId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <BadgeCheck className={`h-3.5 w-3.5 ${user.is_verified ? 'text-blue-600 fill-blue-100' : 'text-gray-400'}`} />
                              )}
                              {user.is_verified ? 'ভেরিফাইড' : 'ভেরিফাই'}
                            </button>

                            {user.email !== 'admin@sheba.om' && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                title="ইউজার সাসপেন্ড / ডিলিট করুন"
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 border border-red-200 transition-colors cursor-pointer"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                সাসপেন্ড
                              </button>
                            )}
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
                {isSearching ? (
                  <>
                    ফলাফল: মোট <span className="font-semibold text-indigo-600">{filteredUsers.length}</span> জন ব্যবহারকারী{' '}
                    {filteredUsers.length > 0 && (
                      <span className="text-gray-500 text-xs ml-1">
                        (পৃষ্ঠা {searchPage} / {searchTotalPages})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    মোট <span className="font-semibold text-gray-900">{totalCount}</span> জন ব্যবহারকারী
                  </>
                )}
              </div>

              {/* Pagination buttons */}
              {isSearching ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                    disabled={searchPage <= 1}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পূর্ববর্তী
                  </button>
                  <button
                    onClick={() => setSearchPage((p) => Math.min(searchTotalPages, p + 1))}
                    disabled={searchPage >= searchTotalPages}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পরবর্তী
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchUsers(prevUrl!)}
                    disabled={!prevUrl || loading}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পূর্ববর্তী
                  </button>
                  <button
                    onClick={() => fetchUsers(nextUrl!)}
                    disabled={!nextUrl || loading}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পরবর্তী
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
