interface Props {
  lastUpdated: string;
}

export function DataFreshnessWarning({ lastUpdated }: Props) {
  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="text-amber-400 text-sm">⚠</span>
      <p className="text-xs text-ink-500">
        Prices from <span className="font-semibold text-ink-400">{formatted}</span> — verify at the pump.
      </p>
    </div>
  );
}
