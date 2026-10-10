import clsx from "clsx";

import { Card } from "../../../components/Card";

function SkeletonRow({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="bg-border-subtle h-3 w-20 rounded" />
      <div className={clsx("bg-border-subtle h-3 rounded", valueWidth)} />
    </div>
  );
}

export function PlaneDetailsSkeleton() {
  return (
    <div
      aria-label="Loading flight details"
      className="animate-pulse space-y-7 motion-reduce:animate-none"
      role="status"
    >
      <span className="sr-only">Loading flight details…</span>
      <section aria-label="Loading route">
        <div className="bg-border-subtle h-3 w-14 rounded" />
        <Card className="bg-surface-elevated mt-3 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-2">
              <div className="bg-border-subtle h-6 w-14 rounded" />
              <div className="bg-border-subtle h-3 w-20 rounded" />
            </div>
            <div className="border-border-subtle bg-surface size-10 rounded-full border" />
            <div className="flex flex-col items-end gap-2">
              <div className="bg-border-subtle h-6 w-14 rounded" />
              <div className="bg-border-subtle h-3 w-20 rounded" />
            </div>
          </div>
          <div className="divide-border-subtle border-border-subtle mt-4 divide-y border-t">
            <SkeletonRow valueWidth="w-32" />
            <SkeletonRow valueWidth="w-16" />
          </div>
        </Card>
      </section>

      <section aria-label="Loading aircraft">
        <div className="bg-border-subtle h-3 w-20 rounded" />
        <Card className="mt-3 px-4">
          <div className="divide-border-subtle divide-y">
            <SkeletonRow valueWidth="w-24" />
            <SkeletonRow valueWidth="w-20" />
            <SkeletonRow valueWidth="w-32" />
          </div>
        </Card>
      </section>

      <section aria-label="Loading live data">
        <div className="bg-border-subtle h-3 w-18 rounded" />
        <Card className="mt-3 px-4">
          <div className="divide-border-subtle divide-y">
            <SkeletonRow valueWidth="w-20" />
            <SkeletonRow valueWidth="w-16" />
            <SkeletonRow valueWidth="w-24" />
            <SkeletonRow valueWidth="w-24" />
            <SkeletonRow valueWidth="w-24" />
          </div>
        </Card>
      </section>
    </div>
  );
}
