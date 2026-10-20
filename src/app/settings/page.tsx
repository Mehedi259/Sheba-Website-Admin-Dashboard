'use client';

import { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [adminProfile, setAdminProfile] = useState<{
    username: string;
    email: string;
  }>({
    username: 'admin',
    email: 'helloshebaofficial@gmail.com',
  });

  useEffect(() => {
    // Attempt to load current user info
    api.get('/users/profile/')
      .then(res => {
        if (res.data) {
          setAdminProfile({
            username: res.data.username || 'admin',
            email: res.data.email || 'helloshebaofficial@gmail.com',
          });
        }
      })
      .catch(() => {
        // Fallback to defaults
      });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('বর্তমান পাসওয়ার্ড দিন।');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/users/change-password/', {
        old_password: currentPassword,
        new_password: newPassword,
      });

      setSuccessMsg(res.data?.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const backendError = err.response?.data?.error || 
                           err.response?.data?.old_password?.[0] || 
                           err.response?.data?.new_password?.[0] || 
                           err.response?.data?.detail || 
                           'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে। অনুগ্রহ করে বর্তমান পাসওয়ার্ড সঠিক কি না পরীক্ষা করুন।';
      setErrorMsg(backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="h-7 w-7 text-indigo-600" />
          অ্যাকাউন্ট সেটিংস ও নিরাপত্তা
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          আপনার অ্যাডমিন ক্রেডেনশিয়াল এবং পাসওয়ার্ড নিরাপদে পরিচালনা করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                AD
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">সুপার অ্যাডমিন</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">ইউজারনেম</label>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{adminProfile.username}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">ইমেইল অ্যাড্রেস</label>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{adminProfile.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-700 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <span>লগইন করার সময় আপনি আপনার ইমেইল অথবা ইউজারনেম যেকোনোটি ব্যবহার করতে পারবেন।</span>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-6">
            <Lock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">পাসওয়ার্ড পরিবর্তন করুন</h2>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                বর্তমান পাসওয়ার্ড <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                  required
                  className="w-full px-3.5 py-2.5 pr-11 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড"
                  required
                  className="w-full px-3.5 py-2.5 pr-11 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                পাসওয়ার্ডটি শক্তিশালী করতে বড়-ছোট অক্ষর, সংখ্যা এবং স্পেশাল ক্যারেক্টার ব্যবহার করুন।
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                নতুন পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  required
                  className="w-full px-3.5 py-2.5 pr-11 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>আপডেট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>পাসওয়ার্ড আপডেট করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
