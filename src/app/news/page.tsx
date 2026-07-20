'use client';

export default function NewsPage() {
  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            News
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage news articles and announcements.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6 text-center text-gray-500">
        News management UI will be implemented here.
      </div>
    </div>
  );
}
