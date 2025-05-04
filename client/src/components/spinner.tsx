import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 24 }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center w-full h-32">
      <Loader2 
        className={cn("animate-spin text-muted-foreground", className)} 
        size={size}
      />
    </div>
  );
}

// Adicionando exportação padrão para compatibilidade com importações existentes
export default Spinner;