import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TenantRegistrationFormPDFProps {
  tenantId: number;
  onClose: () => void;
}

export function TenantRegistrationFormPDF({ tenantId, onClose }: TenantRegistrationFormPDFProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (tenant) {
      // Criar um URL temporário para o PDF que contém o timestamp para evitar cache
      setPdfUrl(`/api/tenants/${tenantId}/registration-form?t=${Date.now()}`);
    }
  }, [tenant, tenantId]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-5/6" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados do inquilino. Por favor, tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full w-full">
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="w-full h-full border-none"
          title={`Ficha Cadastral - ${tenant.name}`}
        />
      )}
    </div>
  );
}