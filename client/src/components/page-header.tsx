import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}

// Adicionando exportação padrão para compatibilidade com importações existentes
export default PageHeader;