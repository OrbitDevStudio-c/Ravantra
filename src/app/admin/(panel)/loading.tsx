export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-3 h-3 w-40" />
      <div className="skeleton mb-8 h-10 w-80" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="skeleton h-80 xl:col-span-2" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
