import clsx from 'clsx';

type PlaneDetailsSkeletonRowProps = {
  valueWidth: string;
};

export function PlaneDetailsSkeletonRow({ valueWidth }: PlaneDetailsSkeletonRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="bg-border-subtle h-3 w-20 rounded" />
      <div className={clsx('bg-border-subtle h-3 rounded', valueWidth)} />
    </div>
  );
}
