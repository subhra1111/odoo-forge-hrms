'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { verifyEmailAPI } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No verification token was provided.');
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmailAPI(token);
        if (response.data && response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(response.data?.error || 'Verification failed. The token may have expired or is invalid.');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage(err.response?.data?.error || 'An unexpected error occurred during email verification.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-gray-100 shadow-2xl relative overflow-hidden">
      {/* Background aesthetic decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-6 animate-pulse">
          <div className="relative">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white animate-bounce" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 font-['Outfit']">Verifying Your Email</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-sans">{message}</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center justify-center py-4 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center scale-up shadow-inner border border-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 font-['Outfit']">Verification Successful!</h3>
            <p className="text-sm text-gray-500 leading-relaxed px-2 font-sans">{message}</p>
          </div>
          <Link
            href="/login"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm font-['Outfit']"
          >
            Go to Sign In
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-4 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center scale-up shadow-inner border border-rose-100">
            <XCircle className="w-10 h-10 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 font-['Outfit']">Verification Failed</h3>
            <p className="text-sm text-gray-500 leading-relaxed px-2 font-sans">{message}</p>
          </div>
          <div className="w-full flex gap-3">
            <Link
              href="/login"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-all text-sm flex items-center justify-center font-['Outfit']"
            >
              Back to Login
            </Link>
            <Link
              href="/signup"
              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 rounded-lg transition-all shadow-md text-sm flex items-center justify-center font-['Outfit']"
            >
              Sign Up Again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] text-gray-800 p-6">
      <Suspense fallback={
        <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-gray-100 shadow-2xl flex flex-col items-center justify-center py-6 text-center space-y-6">
          <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          <h3 className="text-xl font-bold text-gray-900 font-['Outfit']">Loading page...</h3>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
