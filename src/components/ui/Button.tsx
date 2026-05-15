import * as React from "react"
import { cn } from "../../utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[4px] text-[12px] uppercase tracking-[1px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent text-bg-base hover:opacity-90": variant === "default",
            "bg-red-500 text-white hover:bg-red-600": variant === "destructive",
            "border border-border-subtle bg-transparent text-ink hover:bg-surface-light": variant === "outline",
            "bg-surface-light text-ink hover:bg-border-subtle": variant === "secondary",
            "hover:bg-surface-light text-ink": variant === "ghost",
            "text-accent underline-offset-4 hover:underline": variant === "link",
            "h-[34px] px-4 py-2": size === "default",
            "h-8 px-3": size === "sm",
            "h-10 px-8": size === "lg",
            "h-[34px] w-[34px]": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
