export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
