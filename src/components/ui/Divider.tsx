export default function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
    </div>
  );
}