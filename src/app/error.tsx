'use client';
export default function GlobalError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Error</title>
      </head>
      <body className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong:</h1>
          <pre className="mb-4">{error.message}</pre>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-500 text-white underline rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
