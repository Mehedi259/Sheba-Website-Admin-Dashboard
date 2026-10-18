'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Headphones, 
  Search, 
  RotateCw, 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  MessageSquare, 
  AlertCircle, 
  Loader2, 
  Check, 
  ShieldCheck, 
  Inbox,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import api from '@/lib/api';

interface UserDetails {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  avatar?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
}

interface SupportMessageItem {
  id: number;
  conversation: number;
  sender: number | null;
  sender_name: string;
  sender_avatar?: string | null;
  is_admin: boolean;
  text: string;
  is_read: boolean;
  created_at: string;
}

interface SupportConversationItem {
  id: number;
  user: number;
  user_details?: UserDetails;
  subject: string;
  status: 'OPEN' | 'RESOLVED';
  last_message: string;
  last_message_at: string;
  unread_by_admin: number;
  unread_by_user: number;
  created_at: string;
  updated_at: string;
  messages?: SupportMessageItem[];
}

export default function SupportAdminPage() {
  const [conversations, setConversations] = useState<SupportConversationItem[]>([]);
  const [stats, setStats] = useState({
    total_threads: 0,
    open_threads: 0,
    unread_threads: 0,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversationItem | null>(null);
  
  // UI States
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'OPEN' | 'RESOLVED'>('ALL');
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (selectedConversation?.messages && selectedConversation.messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [selectedConversation?.id, selectedConversation?.messages?.length]);

  // Fetch list of conversations
  const fetchConversations = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setLoadingList(true);
    try {
      const params: Record<string, string> = {};
      if (filterTab === 'UNREAD') params.unread = 'true';
      if (filterTab === 'OPEN') params.status = 'OPEN';
      if (filterTab === 'RESOLVED') params.status = 'RESOLVED';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/admin/support/', { params });
      if (response.data) {
        const results: SupportConversationItem[] = response.data.results || [];
        setConversations(results);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching support conversations:', err);
      if (!quiet) setError(err.message || 'কথোপকথন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      if (!quiet) setLoadingList(false);
    }
  }, [filterTab, searchQuery]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Polling every 12 seconds for live updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchConversations(true);
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchConversations]);

  // Auto select first conversation on desktop if none selected
  useEffect(() => {
    if (conversations.length > 0 && selectedId === null) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        const first = conversations[0];
        setSelectedId(first.id);
        setSelectedConversation(first);
        fetchConversationDetail(first.id);
      }
    }
  }, [conversations]);

  // Fetch detail for selected conversation
  const fetchConversationDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const response = await api.get(`/admin/support/${id}/`);
      if (response.data) {
        setSelectedConversation(response.data);
      }
      // Mark as read in local list
      setConversations(prev => prev.map(conv => conv.id === id ? { ...conv, unread_by_admin: 0 } : conv));
      setStats(prev => ({
        ...prev,
        unread_threads: Math.max(0, prev.unread_threads - 1)
      }));
    } catch (err: any) {
      console.error('Error fetching conversation detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectConversation = (conv: SupportConversationItem) => {
    setSelectedId(conv.id);
    setSelectedConversation(conv); // INSTANT response on click
    fetchConversationDetail(conv.id);
  };

  // Send Admin Reply
  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const response = await api.post(`/admin/support/${selectedId}/reply/`, {
        text: replyText.trim()
      });

      const newMsg = response.data;
      setSelectedConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          last_message: newMsg.text,
          last_message_at: newMsg.created_at,
          messages: [...(prev.messages || []), newMsg]
        };
      });

      // Update in main list
      setConversations(prev => prev.map(c => {
        if (c.id === selectedId) {
          return {
            ...c,
            last_message: newMsg.text,
            last_message_at: newMsg.created_at
          };
        }
        return c;
      }));

      setReplyText('');
      setTimeout(() => scrollToBottom(), 100);
    } catch (err: any) {
      alert(err.response?.data?.error || 'রিপ্লাই পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setSendingReply(false);
      textareaRef.current?.focus();
    }
  };

  // Toggle Status (OPEN <-> RESOLVED)
  const handleToggleStatus = async () => {
    if (!selectedConversation || togglingStatus) return;

    const newStatus = selectedConversation.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    setTogglingStatus(true);
    try {
      await api.post(`/admin/support/${selectedConversation.id}/status/`, {
        status: newStatus
      });

      setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, status: newStatus } : c));
      setStats(prev => ({
        ...prev,
        open_threads: newStatus === 'OPEN' ? prev.open_threads + 1 : Math.max(0, prev.open_threads - 1)
      }));
    } catch (err: any) {
      alert('স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    } finally {
      setTogglingStatus(false);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getUserDisplayName = (u?: UserDetails) => {
    if (!u) return 'ব্যবহারকারী';
    if (u.name && u.name.trim()) return u.name.trim();
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    if (full) return full;
    if (u.username && u.username.trim()) return u.username.trim();
    return 'ব্যবহারকারী';
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">লাইভ কাস্টমার সাপোর্ট</h1>
              <p className="text-sm text-gray-500">অ্যাপ ব্যবহারকারীদের সমস্যা সরাসরি সমাধান করুন ও নোটিফিকেশন পাঠান</p>
            </div>
          </div>
        </div>

        {/* Stats Counters */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm text-center">
            <span className="block text-xs font-semibold text-gray-500 uppercase">মোট চ্যাট</span>
            <span className="text-xl font-bold text-gray-900">{stats.total_threads}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm text-center">
            <span className="block text-xs font-semibold text-amber-700 uppercase">ওপেন টিকিট</span>
            <span className="text-xl font-bold text-amber-900">{stats.open_threads}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 shadow-sm text-center">
            <span className="block text-xs font-semibold text-rose-700 uppercase">নতুন / অপঠিত</span>
            <span className="text-xl font-bold text-rose-900">{stats.unread_threads}</span>
          </div>
          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="p-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl shadow-sm transition-colors"
            title="রিফ্রেশ"
          >
            <RotateCw className={`w-5 h-5 ${loadingList ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px] h-[calc(100vh-220px)] max-h-[850px]">
        
        {/* Left Side: Threads Inbox */}
        <div className={`lg:col-span-5 border-r border-gray-200 flex flex-col h-full bg-gray-50/50 min-h-0 ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Tabs */}
          <div className="p-4 border-b border-gray-200 bg-white space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="ইউজার নাম, ফোন নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-medium">
              {[
                { key: 'ALL', label: 'সব' },
                { key: 'UNREAD', label: `অপঠিত (${stats.unread_threads})` },
                { key: 'OPEN', label: 'ওপেন' },
                { key: 'RESOLVED', label: 'সমাধানকৃত' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key as any)}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                    filterTab === tab.key
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-600" />
                <span className="text-xs">লোড হচ্ছে...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6 text-center">
                <Inbox className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium text-gray-600">কোনো সাপোর্ট বার্তা পাওয়া যায়নি</p>
                <p className="text-xs text-gray-400 mt-1">ব্যবহারকারী মেসেজ পাঠালে এখানে দেখা যাবে</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedId === conv.id;
                const hasUnread = conv.unread_by_admin > 0;
                const user = conv.user_details;
                const name = getUserDisplayName(user);
                const displayMessage = conv.last_message || 
                  (conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].text : 'কোনো বার্তা নেই');

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-4 cursor-pointer transition-colors relative flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-l-4 border-indigo-600' 
                        : hasUnread 
                          ? 'bg-rose-50/30 hover:bg-gray-100/80 font-medium' 
                          : 'hover:bg-gray-100/60'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {user?.avatar || user?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.avatar || user.avatar_url || ''}
                          alt={name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {(name.charAt(0) || 'U').toUpperCase()}
                        </div>
                      )}
                      {user?.is_verified && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 shadow-xs" title="ভেরিফাইড ইউজার">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                            {name}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatTime(conv.last_message_at || conv.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{user?.phone || 'ফোন নম্বর নেই'}</span>
                      </div>

                      <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                        {displayMessage}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          conv.status === 'OPEN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {conv.status === 'OPEN' ? 'ওপেন' : 'সমাধানকৃত'}
                        </span>

                        {hasUnread && (
                          <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {conv.unread_by_admin} নতুন
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Conversation View */}
        <div className={`lg:col-span-7 flex flex-col h-full bg-white min-h-0 ${!selectedId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => { setSelectedId(null); setSelectedConversation(null); }}
                    className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="সব মেসেজ"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {selectedConversation.user_details?.avatar || selectedConversation.user_details?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedConversation.user_details.avatar || selectedConversation.user_details.avatar_url || ''}
                        alt="User"
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {(getUserDisplayName(selectedConversation.user_details).charAt(0) || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                        {getUserDisplayName(selectedConversation.user_details)}
                      </h3>
                      {selectedConversation.user_details?.is_verified && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                          <Check className="w-2.5 h-2.5" /> ভেরিফাইড
                        </span>
                      )}
                      {loadingDetail && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{selectedConversation.user_details?.phone || 'ফোন নেই'}</span>
                      <span>•</span>
                      <span className={`font-semibold ${selectedConversation.status === 'OPEN' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {selectedConversation.status === 'OPEN' ? 'ওপেন' : 'সমাধানকৃত'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Action */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                      selectedConversation.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {togglingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : selectedConversation.status === 'OPEN' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        সমাধান সম্পন্ন
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                        পুনরায় ওপেন
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/40 min-h-0">
                {!selectedConversation.messages || selectedConversation.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">এখনো কোনো বার্তা আসেনি</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      ব্যবহারকারী কোনো বার্তা পাঠাননি। আপনি নিচের ইনপুট বক্স থেকে ব্যবহারকারীকে সরাসরি রিপ্লাই বা সাহায্য বার্তা পাঠাতে পারেন।
                    </p>
                  </div>
                ) : (
                  selectedConversation.messages.map((msg) => {
                    const isAdmin = msg.is_admin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400">
                          {isAdmin ? (
                            <span className="font-semibold text-indigo-600 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> টিম হ্যালো সেবা (অ্যাডমিন)
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-600">
                              {msg.sender_name || 'ব্যবহারকারী'}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                            isAdmin
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1">
                          {formatDate(msg.created_at)}
                          {isAdmin && (
                            <span className="ml-1 text-gray-400">
                              {msg.is_read ? '✓✓ পঠিত' : '✓ প্রেরিত'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="space-y-2"
                >
                  <div className="relative flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder="ব্যবহারকারীকে রিপ্লাই লিখুন... (পাঠালে ব্যবহারকারীর ফোনে সাথে সাথে পুশ নোটিফিকেশন যাবে)"
                      className="flex-1 p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendingReply}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl font-medium shadow-xs transition-colors flex items-center justify-center shrink-0"
                    >
                      {sendingReply ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                    <span>Enter চাপলে মেসেজ যাবে, Shift + Enter এ নতুন লাইন তৈরি হবে</span>
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> ইনস্ট্যান্ট ফায়ারবেস পুশ নোটিফিকেশন সক্রিয়
                    </span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* Empty Placeholder when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                <Headphones className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">একটি সাপোর্ট চ্যাট নির্বাচন করুন</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                বাম পাশের তালিকা থেকে যেকোনো ব্যবহারকারীর সাথে কথা বলতে বা তাদের সমস্যা সমাধান করতে ক্লিক করুন।
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
