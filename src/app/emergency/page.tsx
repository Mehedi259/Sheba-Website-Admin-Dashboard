'use client';

export default function EmergencyPage() {
  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Emergency
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage emergency contacts and services.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6 text-center text-gray-500">
        Emergency services management UI will be implemented here.
      </div>
    </div>
  );
}
