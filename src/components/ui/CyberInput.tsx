import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface CyberInputProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
}

const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-1">
        <div className="cyber-input-wrapper">
          <input
            type={inputType}
            className={cn(
              "cyber-input w-full",
              error && "border-destructive focus:border-destructive",
              isPassword && "pr-10",
              className
            )}
            ref={ref}
            placeholder=" "
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          <label 
            className={cn(
              "cyber-input-label",
              isFocused && "text-[hsl(var(--neon-blue))]"
            )}
          >
            {label}
          </label>
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-[hsl(var(--neon-blue))] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          {/* Glow line on focus */}
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300",
              isFocused 
                ? "bg-gradient-to-r from-transparent via-[hsl(var(--neon-blue))] to-transparent opacity-100" 
                : "opacity-0"
            )}
            style={{
              boxShadow: isFocused ? "0 0 10px hsl(var(--neon-blue) / 0.5)" : "none"
            }}
          />
        </div>
        {error && (
          <p className="text-[10px] text-destructive font-medium">{error}</p>
        )}
      </div>
    );
  }
);

CyberInput.displayName = "CyberInput";

export { CyberInput };
