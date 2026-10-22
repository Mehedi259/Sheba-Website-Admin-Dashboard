'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, X, RotateCw, UserX, Loader2, AlertCircle, CheckCircle2, 
  BadgeCheck, Smartphone, ShieldAlert, ShieldCheck, Ban, Plus, 
  Copy, Check, Users, UserCheck, Trash2
} from 'lucide-react';
import api from '@/lib/api';

const CACHE_KEY = 'sheba_admin_all_users_v2';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  name_bn?: string;
  phone?: string;
  avatar?: string;
  avatar_url?: string;
  is_verified?: boolean;
  status?: string;
  is_active?: boolean;
  role?: string;
  last_device_id?: string | null;
  last_device_name?: string | null;
  created_at?: string;
}

interface BannedDeviceItem {
  id: number;
  device_id: string;
  device_name: string;
  is_banned: boolean;
  reason: string;
  banned_at: string;
  updated_at: string;
  user?: number | null;
  user_email?: string;
}

export default function UsersPage() {
  // Tab State: 'all' | 'active' | 'suspended' | 'banned_devices'
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'suspended' | 'banned_devices'>('all');

  // Regular paginated user state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Universal Indexing state
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState(0);
  const [indexingTotal, setIndexingTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const searchPageSize = 20;

  // Banned Devices state
  const [bannedDevices, setBannedDevices] = useState<BannedDeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Suspend Modal state
  const [userToSuspend, setUserToSuspend] = useState<UserItem | null>(null);
  const [banDeviceChecked, setBanDeviceChecked] = useState(true);
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  // Manual Ban Modal state
  const [showManualBanModal, setShowManualBanModal] = useState(false);
  const [manualDeviceId, setManualDeviceId] = useState('');
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [manualReason, setManualReason] = useState('স্প্যামিং বা নীতিমালা লঙ্ঘনের কারণে ব্যান করা হয়েছে');
  const [isSubmittingManualBan, setIsSubmittingManualBan] = useState(false);

  // Verifying & Toggling action state
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  const indexingAbortRef = useRef<boolean>(false);

  // Initial fetch for Page 1 of users
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
      setError(err.message || 'ব্যবহারকারী লোড করতে সমস্যা হয়েছে');
      return 0;
    } finally {
      setLoading(false);
    }
  };

  // Fetch banned devices
  const fetchBannedDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const response = await api.get('/admin/banned-devices/');
      const data = response.data?.results || response.data || [];
      setBannedDevices(data);
    } catch (err) {
      console.error('Failed to fetch banned devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Background indexing function for all users
  const indexAllUsers = useCallback(async (total: number, forceRefresh: boolean = false) => {
    if (total <= 0) return;
    
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
    const accumulatedUsers: UserItem[] = [];

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

        const seen = new Set();
        const unique = accumulatedUsers.filter((u) => {
          if (!u || !u.id || seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });

        setAllUsers([...unique]);
        setIndexedCount(unique.length);
        await new Promise((r) => setTimeout(r, 40));
      }

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
        // Safe to ignore
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
    fetchBannedDevices();

    return () => {
      isMounted = false;
      indexingAbortRef.current = true;
    };
  }, [indexAllUsers, fetchBannedDevices]);

  // Handle Tab-specific User Data
  const baseUsersList = useMemo(() => {
    const source = allUsers.length > 0 ? allUsers : users;
    if (activeTab === 'suspended') {
      return source.filter((u) => u.status === 'SUSPENDED' || u.is_active === false);
    }
    if (activeTab === 'active') {
      return source.filter((u) => u.status !== 'SUSPENDED' && u.is_active !== false);
    }
    return source;
  }, [allUsers, users, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const source = allUsers.length > 0 ? allUsers : users;
    const suspended = source.filter((u) => u.status === 'SUSPENDED' || u.is_active === false).length;
    const active = source.filter((u) => u.status !== 'SUSPENDED' && u.is_active !== false).length;
    return {
      all: totalCount || source.length,
      active,
      suspended,
      banned_devices: bannedDevices.length,
    };
  }, [allUsers, users, totalCount, bannedDevices]);

  // Search filtering
  const isSearching = searchQuery.trim().length > 0;

  const filteredUsers = useMemo(() => {
    if (activeTab === 'banned_devices') return [];
    if (!isSearching) return baseUsersList;

    const q = searchQuery.toLowerCase().trim();
    return baseUsersList.filter((u) => {
      if (!u) return false;
      const email = (u.email || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const firstName = (u.first_name || '').toLowerCase();
      const lastName = (u.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const name = (u.name || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const deviceId = (u.last_device_id || '').toLowerCase();
      const deviceName = (u.last_device_name || '').toLowerCase();

      return (
        email.includes(q) ||
        username.includes(q) ||
        fullName.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        deviceId.includes(q) ||
        deviceName.includes(q)
      );
    });
  }, [activeTab, isSearching, searchQuery, baseUsersList]);

  // Filtered banned devices
  const filteredBannedDevices = useMemo(() => {
    if (activeTab !== 'banned_devices') return [];
    if (!isSearching) return bannedDevices;

    const q = searchQuery.toLowerCase().trim();
    return bannedDevices.filter((d) => {
      return (
        (d.device_id || '').toLowerCase().includes(q) ||
        (d.device_name || '').toLowerCase().includes(q) ||
        (d.user_email || '').toLowerCase().includes(q) ||
        (d.reason || '').toLowerCase().includes(q)
      );
    });
  }, [activeTab, isSearching, searchQuery, bannedDevices]);

  // Reset pagination on search or tab change
  useEffect(() => {
    setSearchPage(1);
  }, [searchQuery, activeTab]);

  // Displayed users depending on search / pagination
  const displayedUsers = useMemo(() => {
    if (activeTab === 'banned_devices') return [];
    // If not searching and on 'all' tab with allUsers not loaded yet, use paginated users
    if (!isSearching && activeTab === 'all' && allUsers.length === 0) {
      return users;
    }
    const start = (searchPage - 1) * searchPageSize;
    return filteredUsers.slice(start, start + searchPageSize);
  }, [activeTab, isSearching, allUsers.length, users, searchPage, filteredUsers]);

  const searchTotalPages = Math.max(1, Math.ceil(filteredUsers.length / searchPageSize));

  // Toggle Verification
  const handleToggleVerify = async (userId: number, currentStatus: boolean | undefined) => {
    setVerifyingId(userId);
    try {
      const response = await api.post(`/admin/users/${userId}/verify/`);
      const newStatus = response.data.is_verified;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_verified: newStatus } : u))
      );
      setAllUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === userId ? { ...u, is_verified: newStatus } : u
        );
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: updated, timestamp: Date.now() })
          );
        } catch {}
        return updated;
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'ভেরিফাই করতে ব্যর্থ হয়েছে');
    } finally {
      setVerifyingId(null);
    }
  };

  // Open Suspend Confirmation Modal
  const openSuspendModal = (user: UserItem) => {
    setUserToSuspend(user);
    setBanDeviceChecked(Boolean(user.last_device_id));
  };

  // Confirm Suspend User & Optionally Ban Device
  const handleConfirmSuspend = async () => {
    if (!userToSuspend) return;
    setIsSubmittingSuspend(true);
    try {
      const response = await api.post(`/admin/users/${userToSuspend.id}/suspend/`, {
        action: 'suspend',
        ban_device: banDeviceChecked,
      });

      const updatedStatus = response.data.status || 'SUSPENDED';
      const updatedIsActive = response.data.is_active !== undefined ? response.data.is_active : false;

      // Update state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToSuspend.id ? { ...u, status: updatedStatus, is_active: updatedIsActive } : u
        )
      );
      setAllUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === userToSuspend.id ? { ...u, status: updatedStatus, is_active: updatedIsActive } : u
        );
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: updated, timestamp: Date.now() })
          );
        } catch {}
        return updated;
      });

      // Refresh banned devices if banned
      if (banDeviceChecked) {
        fetchBannedDevices();
      }

      alert(response.data.message || 'ব্যবহারকারীকে সফলভাবে স্থগিত (সাসপেন্ড) করা হয়েছে।');
      setUserToSuspend(null);
    } catch (err: any) {
      alert('সাসপেন্ড করতে সমস্যা হয়েছে: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  // Unsuspend User
  const handleUnsuspendUser = async (user: UserItem) => {
    if (!window.confirm(`আপনি কি "${user.email || user.username}" অ্যাকাউন্টটি পুনরায় সক্রিয় (Unsuspend) করতে চান?`)) {
      return;
    }
    setActionInProgressId(user.id);
    try {
      const response = await api.post(`/admin/users/${user.id}/suspend/`, {
        action: 'unsuspend',
        unban_device: true,
      });

      const updatedStatus = response.data.status || 'ACTIVE';
      const updatedIsActive = response.data.is_active !== undefined ? response.data.is_active : true;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: updatedStatus, is_active: updatedIsActive } : u
        )
      );
      setAllUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === user.id ? { ...u, status: updatedStatus, is_active: updatedIsActive } : u
        );
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: updated, timestamp: Date.now() })
          );
        } catch {}
        return updated;
      });

      fetchBannedDevices();
      alert(response.data.message || 'ব্যবহারকারীকে সফলভাবে সক্রিয় করা হয়েছে।');
    } catch (err: any) {
      alert('সক্রিয় করতে ব্যর্থ হয়েছে: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionInProgressId(null);
    }
  };

  // Toggle Banned Device Status (Unban / Re-ban)
  const handleToggleDeviceBan = async (device: BannedDeviceItem) => {
    const newStatus = !device.is_banned;
    const confirmMsg = newStatus 
      ? 'আপনি কি এই ডিভাইসটি পুনরায় ব্যান করতে চান?'
      : 'আপনি কি এই ডিভাইসটি আনব্যান (অনুমোদন) করতে চান?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/banned-devices/${device.id}/`, {
        is_banned: newStatus,
      });
      setBannedDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, is_banned: newStatus } : d))
      );
    } catch (err: any) {
      alert('ডিভাইস স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Delete Banned Device Entry
  const handleDeleteBannedDevice = async (deviceId: number) => {
    if (!window.confirm('আপনি কি এই ডিভাইস এন্ট্রিটি তালিকা থেকে মুছে ফেলতে চান?')) return;
    try {
      await api.delete(`/admin/banned-devices/${deviceId}/`);
      setBannedDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err: any) {
      alert('মুছে ফেলতে সমস্যা হয়েছে: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Create Manual Device Ban
  const handleCreateManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDeviceId.trim()) {
      alert('দয়া করে ডিভাইসের ইউনিক আইডি লিখুন');
      return;
    }
    setIsSubmittingManualBan(true);
    try {
      const response = await api.post('/admin/banned-devices/', {
        device_id: manualDeviceId.trim(),
        device_name: manualDeviceName.trim(),
        reason: manualReason.trim(),
        is_banned: true,
      });
      setBannedDevices((prev) => [response.data, ...prev]);
      setShowManualBanModal(false);
      setManualDeviceId('');
      setManualDeviceName('');
      alert('ডিভাইসটি সফলভাবে ব্যান করা হয়েছে!');
    } catch (err: any) {
      alert('ডিভাইস ব্যান করতে ব্যর্থ হয়েছে: ' + (err.response?.data?.device_id?.[0] || err.message));
    } finally {
      setIsSubmittingManualBan(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleForceRefresh = () => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {}
    fetchUsers().then((count) => {
      if (count > 0) indexAllUsers(count, true);
    });
    fetchBannedDevices();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-2.5">
            <Users className="h-8 w-8 text-indigo-600" />
            ব্যবহারকারী ও ডিভাইস নিয়ন্ত্রণ
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            ব্যবহারকারীদের তালিকা, ভেরিফিকেশন, অ্যাকাউন্ট স্থগিত (সাসপেন্ড) এবং হার্ডওয়্যার ডিভাইস ব্যান নিয়ন্ত্রণ করুন।
          </p>
        </div>

        {activeTab === 'banned_devices' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowManualBanModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all text-sm font-semibold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              নতুন ডিভাইস ব্যান করুন
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>সকল ব্যবহারকারী</span>
            <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`cursor-pointer whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'active'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>সক্রিয় (Active)</span>
            <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.active}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suspended')}
            className={`cursor-pointer whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'suspended'
                ? 'border-rose-600 text-rose-600 bg-rose-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserX className="h-4 w-4 text-rose-600" />
            <span>সাসপেন্ডকৃত (Suspended)</span>
            <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
              tabCounts.suspended > 0
                ? 'bg-rose-100 text-rose-700 font-bold'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.suspended}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('banned_devices')}
            className={`cursor-pointer whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'banned_devices'
                ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smartphone className="h-4 w-4 text-purple-600" />
            <span>ব্যান করা ডিভাইস (Hardware Ban)</span>
            <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
              tabCounts.banned_devices > 0
                ? 'bg-purple-100 text-purple-700 font-bold'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.banned_devices}
            </span>
          </button>
        </nav>
      </div>

      {/* Universal Search & Refresh Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
            placeholder={
              activeTab === 'banned_devices'
                ? 'ডিভাইস আইডি, ফোনের মডেল বা সংশ্লিষ্ট ইমেইল দিয়ে খুঁজুন...'
                : 'ইমেইল (@gmail.com), ইউজারনেম, নাম, ফোন বা ডিভাইস দিয়ে খুঁজুন...'
            }
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

      {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg border border-red-200 text-sm">{error}</div>}

      {/* VIEW: Users Table (All, Active, Suspended) */}
      {activeTab !== 'banned_devices' && (
        <div className="flow-root">
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
                        ইমেইল ও ফোন
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ডিভাইস ট্র্যাক
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        স্ট্যাটাস
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        যোগদান
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        অ্যাকশন
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loading && !isSearching && allUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                            <span>ব্যবহারকারী লোড হচ্ছে...</span>
                          </div>
                        </td>
                      </tr>
                    ) : displayedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="h-8 w-8 text-gray-400" />
                            <p className="font-medium text-gray-700">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                            {isSearching ? (
                              <p className="text-xs text-gray-500">
                                &quot;{searchQuery}&quot; দিয়ে কোনো ফলাফল মেলেনি।
                              </p>
                            ) : activeTab === 'suspended' ? (
                              <p className="text-xs text-gray-500">বর্তমানে কোনো সাসপেন্ডকৃত ব্যবহারকারী নেই।</p>
                            ) : (
                              <p className="text-xs text-gray-500">তালিকায় কোনো ব্যবহারকারী নেই।</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedUsers.map((user) => {
                        const isSuspended = user.status === 'SUSPENDED' || user.is_active === false;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                            {/* User details */}
                            <td className="whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              <div className="flex items-center gap-3">
                                {user.avatar || user.avatar_url ? (
                                  <img
                                    src={user.avatar || user.avatar_url}
                                    alt=""
                                    className="h-9 w-9 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                    {(user.name || user.first_name || user.username || 'U')[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-gray-900">
                                      {user.first_name || user.last_name
                                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                        : (user.name || 'নাম নেই')}
                                    </span>
                                    {user.is_verified && (
                                      <span title="ভেরিফাইড ব্যবহারকারী" className="inline-flex items-center text-blue-600">
                                        <BadgeCheck className="h-4 w-4 fill-blue-600 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">@{user.username || 'unknown'}</div>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600">
                              <div className="font-mono text-xs">{user.email || '—'}</div>
                              {user.phone && <div className="text-xs text-gray-400 mt-0.5">{user.phone}</div>}
                            </td>

                            {/* Device */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600">
                              {user.last_device_id ? (
                                <div className="flex items-center gap-1.5" title={user.last_device_id}>
                                  <Smartphone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {user.last_device_name || 'মোবাইল ডিভাইস'}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(user.last_device_id!)}
                                    title="ডিভাইস আইডি কপি করুন"
                                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                                  >
                                    {copiedId === user.last_device_id ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">ডিভাইস ট্র্যাক হয়নি</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <UserX className="h-3 w-3" />
                                  সাসপেন্ডেড
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  সক্রিয়
                                </span>
                              )}
                            </td>

                            {/* Joined */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-xs text-gray-500">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('bn-BD') : '—'}
                            </td>

                            {/* Actions */}
                            <td className="relative whitespace-nowrap py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex justify-end items-center gap-2">
                                {/* Verify Toggle */}
                                <button
                                  onClick={() => handleToggleVerify(user.id, user.is_verified)}
                                  disabled={verifyingId === user.id}
                                  title={user.is_verified ? "ভেরিফিকেশন প্রত্যাহার করুন" : "ইউজার ভেরিফাই করুন"}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
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

                                {/* Suspend or Unsuspend Button */}
                                {user.email !== 'admin@sheba.om' && (
                                  isSuspended ? (
                                    <button
                                      onClick={() => handleUnsuspendUser(user)}
                                      disabled={actionInProgressId === user.id}
                                      title="অ্যাকাউন্ট পুনরায় সক্রিয় করুন"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {actionInProgressId === user.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      )}
                                      সক্রিয় করুন
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openSuspendModal(user)}
                                      title="ইউজার সাসপেন্ড ও ডিভাইস ব্যান করুন"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 transition-colors cursor-pointer"
                                    >
                                      <UserX className="h-3.5 w-3.5" />
                                      সাসপেন্ড
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-700">
                  {isSearching || activeTab !== 'all' ? (
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

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isSearching || activeTab !== 'all') {
                        setSearchPage((p) => Math.max(1, p - 1));
                      } else {
                        fetchUsers(prevUrl!);
                      }
                    }}
                    disabled={isSearching || activeTab !== 'all' ? searchPage <= 1 : !prevUrl || loading}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পূর্ববর্তী
                  </button>
                  <button
                    onClick={() => {
                      if (isSearching || activeTab !== 'all') {
                        setSearchPage((p) => Math.min(searchTotalPages, p + 1));
                      } else {
                        fetchUsers(nextUrl!);
                      }
                    }}
                    disabled={isSearching || activeTab !== 'all' ? searchPage >= searchTotalPages : !nextUrl || loading}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 shadow-sm cursor-pointer transition-colors"
                  >
                    পরবর্তী
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW: Banned Devices Table */}
      {activeTab === 'banned_devices' && (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sm:pl-6">
                        ডিভাইস তথ্য
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        সংশ্লিষ্ট ব্যবহারকারী
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ব্যানের কারণ
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ব্যান করার তারিখ
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        স্ট্যাটাস
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        অ্যাকশন
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loadingDevices ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                            <span>ব্যান করা ডিভাইস লোড হচ্ছে...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredBannedDevices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ShieldCheck className="h-10 w-10 text-emerald-500" />
                            <p className="font-semibold text-gray-800">কোনো ব্যান করা ডিভাইস নেই</p>
                            <p className="text-xs text-gray-500">
                              স্প্যামারদের ডিভাইস ব্যান করলে তারা নতুন ইমেইল দিয়েও এই ডিভাইস থেকে আর একাউন্ট খুলতে বা পোস্ট করতে পারবে না।
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBannedDevices.map((device) => (
                        <tr key={device.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Device info */}
                          <td className="whitespace-nowrap py-3.5 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {device.device_name || 'স্মার্টফোন / ডিভাইস'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-xs text-gray-500 max-w-[200px] truncate" title={device.device_id}>
                                    {device.device_id}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(device.device_id)}
                                    title="আইডি কপি করুন"
                                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                                  >
                                    {copiedId === device.device_id ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Associated account */}
                          <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600">
                            {device.user_email ? (
                              <span className="font-mono text-xs text-gray-800">{device.user_email}</span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">সরাসরি ব্যান করা হয়েছে</span>
                            )}
                          </td>

                          {/* Reason */}
                          <td className="px-3 py-3.5 text-sm text-gray-600 max-w-xs truncate" title={device.reason}>
                            <span className="text-xs">{device.reason || 'নীতিমালা লঙ্ঘন'}</span>
                          </td>

                          {/* Banned At */}
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-gray-500">
                            {device.banned_at ? new Date(device.banned_at).toLocaleString('bn-BD') : '—'}
                          </td>

                          {/* Status */}
                          <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                            {device.is_banned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <Ban className="h-3 w-3" />
                                ব্যান সক্রিয়
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                আনব্যান করা
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="relative whitespace-nowrap py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end items-center gap-2">
                              {device.is_banned ? (
                                <button
                                  onClick={() => handleToggleDeviceBan(device)}
                                  title="ডিভাইসটি আনব্যান করুন"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  আনব্যান করুন
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleDeviceBan(device)}
                                  title="ডিভাইসটি পুনরায় ব্যান করুন"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  পুনরায় ব্যান
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteBannedDevice(device.id)}
                                title="এন্ট্রি মুছে ফেলুন"
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Suspend User Confirmation & Hardware Ban */}
      {userToSuspend && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  ব্যবহারকারী সাসপেন্ড করুন
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  আপনি কি নিশ্চিত যে এই ব্যবহারকারীকে সাময়িক বা স্থায়ীভাবে স্থগিত করতে চান?
                </p>
              </div>
            </div>

            {/* Target User Info Card */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm space-y-1.5">
              <div className="font-semibold text-gray-900">
                {userToSuspend.first_name || userToSuspend.name || userToSuspend.username}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                ইমেইল: {userToSuspend.email || '—'}
              </div>
              {userToSuspend.last_device_id ? (
                <div className="text-xs text-indigo-700 flex items-center gap-1.5 pt-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>ডিভাইস: {userToSuspend.last_device_name || 'স্মার্টফোন'} ({userToSuspend.last_device_id.slice(0, 16)}...)</span>
                </div>
              ) : (
                <div className="text-xs text-amber-600 pt-1">
                  ⚠️ এই ব্যবহারকারীর কোনো ডিভাইস আইডি এখনো রেকর্ড হয়নি।
                </div>
              )}
            </div>

            {/* Hardware Ban Option */}
            {userToSuspend.last_device_id && (
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 cursor-pointer hover:bg-rose-50 transition-colors">
                <input
                  type="checkbox"
                  checked={banDeviceChecked}
                  onChange={(e) => setBanDeviceChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-rose-900 block">
                    হার্ডওয়্যার ডিভাইস সম্পূর্ণ ব্যান করুন (প্রস্তাবিত)
                  </span>
                  <span className="text-rose-700 leading-relaxed block mt-0.5">
                    এই ডিভাইসটি ব্যান করলে স্প্যামার অন্য কোনো জিমেইল বা অ্যাকাউন্ট ব্যবহার করেও এই ফোন থেকে সেবা অ্যাপ ব্যবহার করতে পারবে না।
                  </span>
                </div>
              </label>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToSuspend(null)}
                disabled={isSubmittingSuspend}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSuspend && <Loader2 className="h-4 w-4 animate-spin" />}
                সাসপেন্ড নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manually Ban Device */}
      {showManualBanModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Ban className="h-5 w-5 text-rose-600" />
                  নতুন ডিভাইস ব্যান করুন
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  স্প্যামিং বা প্রতারণা প্রতিরোধে যে কোনো মোবাইল ডিভাইস আইডি সরাসরি ব্যান তালিকায় যুক্ত করুন।
                </p>
              </div>
              <button
                onClick={() => setShowManualBanModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualBan} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ডিভাইস আইডি (Device ID / Hardware Identifier) *
                </label>
                <input
                  type="text"
                  required
                  value={manualDeviceId}
                  onChange={(e) => setManualDeviceId(e.target.value)}
                  placeholder="যেমন: d41d8cd98f00b204e9800998ecf8427e"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ডিভাইস / ফোনের মডেলের নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={manualDeviceName}
                  onChange={(e) => setManualDeviceName(e.target.value)}
                  placeholder="যেমন: Samsung Galaxy S23, iPhone 14 Pro"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ব্যান করার কারণ
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="ব্যানের কারণ লিখুন..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualBanModal(false)}
                  disabled={isSubmittingManualBan}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManualBan}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingManualBan && <Loader2 className="h-4 w-4 animate-spin" />}
                  ডিভাইস ব্যান করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
