'use client';
export default function GlobalError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
      <div className="text-center flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong:</h1>
        <div className="mb-4 whitespace-pre-wrap break-words max-w-3/4 overflow-hidden">
          {error.message}
        </div>
        <button
          onClick={() => reset()}
          className="px-4 py-2 text-blue-500 underline rounded cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
