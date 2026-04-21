import { forwardRef, InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, rightElement, style, ...props }, ref) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label className="hand" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {Icon && (
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }}>
            <Icon size={14} />
          </div>
        )}
        <input
          ref={ref}
          style={{
            width: "100%",
            background: "var(--card)",
            border: `1.5px solid ${error ? "var(--red)" : "var(--border)"}`,
            borderRadius: 4,
            padding: `9px ${rightElement ? "36px" : "12px"} 9px ${Icon ? "32px" : "12px"}`,
            fontSize: 13,
            color: "var(--ink)",
            fontFamily: "var(--font-sans)",
            outline: "none",
            transition: "border-color .15s",
            ...style,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--blue)"; props.onFocus?.(e); }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--border)"; props.onBlur?.(e); }}
          {...props}
        />
        {rightElement && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            {rightElement}
          </div>
        )}
      </div>
      {error && <p style={{  color: "var(--red)", fontFamily: "var(--font-hand)", fontSize: "13px" }}>{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
export default Input;