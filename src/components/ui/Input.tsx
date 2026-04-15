import { forwardRef, InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, rightElement, className = "", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-300">{label}</label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <Icon size={16} />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 
              focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
              transition-all text-sm ${Icon ? "pl-9" : ""} ${rightElement ? "pr-10" : ""} 
              ${error ? "border-red-500/70 focus:border-red-500 focus:ring-red-500" : "border-white/10"} 
              ${className}`}
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;