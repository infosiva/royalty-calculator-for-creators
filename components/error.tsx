import React from 'react';
export default function ErrorFallback({ error }: { error: Error }) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '1rem', textAlign: 'center' }}
    >
      <h2>Error: {error.message}</h2>
      <p>An unexpected error occurred.</p>
    </div>
  );
}