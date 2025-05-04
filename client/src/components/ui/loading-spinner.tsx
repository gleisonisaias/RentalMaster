import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-8 h-8 border-4 rounded-full border-t-transparent border-primary animate-spin" />
    </div>
  );
}