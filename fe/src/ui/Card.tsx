import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={clsx('border-border-subtle rounded-xl border', className)} {...props} />;
}
