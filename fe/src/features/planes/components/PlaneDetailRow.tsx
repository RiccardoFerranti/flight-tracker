type PlaneDetailRowProps = {
  label: string;
  value: string;
};

export function PlaneDetailRow({ label, value }: PlaneDetailRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-text-secondary text-sm">{label}</dt>
      <dd className="text-text-primary text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
