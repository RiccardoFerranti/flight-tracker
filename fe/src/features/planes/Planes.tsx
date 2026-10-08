import { usePlanesSocket } from '@/data/planes/usePlanesSocket';

export function Planes() {
  const { planes, status, error } = usePlanesSocket();

  return (
    <section aria-labelledby="planes-heading" className="w-full max-w-2xl rounded-lg bg-slate-900 p-6 shadow-lg">
      <div className="flex items-baseline justify-between gap-4">
        <h1 id="planes-heading" className="text-2xl font-semibold">
          Planes
        </h1>
        <p className="text-sm text-slate-400">{status}</p>
      </div>

      <p className="mt-4 text-slate-300">{planes.length} aircraft in the latest realtime snapshot.</p>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {planes.map((plane) => (
          <li key={plane.id}>
            {plane.id}: {plane.latitude.toFixed(4)}, {plane.longitude.toFixed(4)} at {plane.altitude} m
          </li>
        ))}
      </ul>
    </section>
  );
}
