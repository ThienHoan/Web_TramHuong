'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
      <p className="mb-4 text-gray-700">
        {error_description || 'An error occurred during authentication.'}
      </p>
      {error && (
        <p className="mb-6 text-sm text-gray-500 font-mono bg-gray-100 p-2 rounded">
          Code: {error}
        </p>
      )}
      <div className="space-y-3">
        <Link
          href="/vi/login"
          className="block w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors"
        >
          Return to Login
        </Link>
        <Link
          href="/vi"
          className="block w-full border border-gray-300 py-2 rounded hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
