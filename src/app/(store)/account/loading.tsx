export default function Loading() {
  return (
    <div className="container-lux py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-6 h-14 w-2/3 max-w-xl" />
      <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[3/4]" />
            <div className="skeleton mt-4 h-3 w-1/3" />
            <div className="skeleton mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
