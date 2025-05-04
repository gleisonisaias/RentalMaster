import React, { useEffect, useState } from "react";
import { Payment, Contract, Tenant, Owner, Property } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Printer, LoaderCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PaymentReceiptDialogProps {
  paymentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentReceiptDialog: React.FC<PaymentReceiptDialogProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<Payment | null>(null);
  const [contractData, setContractData] = useState<Contract | null>(null);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [ownerData, setOwnerData] = useState<Owner | null>(null);
  const [propertyData, setPropertyData] = useState<Property | null>(null);

  // Carregar dados do pagamento
  const { data: payment, isLoading: isLoadingPayment } = useQuery<Payment>({
    queryKey: [`/api/payments/${paymentId}`],
    enabled: isOpen && !!paymentId,
    onSuccess: (data) => {
      console.log("Pagamento carregado:", data);
      // Garantindo que interestAmount e latePaymentFee sempre sejam valores numéricos
      const processedData = {
        ...data,
        interestAmount: data.interestAmount !== null ? data.interestAmount : 0,
        latePaymentFee: data.latePaymentFee !== null ? data.latePaymentFee : 0,
        paymentMethod: data.paymentMethod || "Não informado",
        receiptNumber: data.receiptNumber || `REC-${data.id}`
      };
      setPaymentData(processedData);
    },
    onError: (error) => {
      console.error("Erro ao carregar pagamento:", error);
      toast({
        title: "Erro ao carregar pagamento",
        description: "Não foi possível carregar os dados do pagamento",
        variant: "destructive",
      });
    }
  });

  // Carregar contrato quando o pagamento estiver disponível
  const { data: contract, isLoading: isLoadingContract } = useQuery<Contract>({
    queryKey: ['/api/contracts', paymentData?.contractId],
    enabled: isOpen && !!paymentData?.contractId,
    onSuccess: (data) => {
      console.log("Contrato carregado:", data);
      setContractData(data);
    },
    onError: (error) => {
      console.error("Erro ao carregar contrato:", error);
    }
  });

  // Carregar inquilino quando o contrato estiver disponível
  const { data: tenant, isLoading: isLoadingTenant } = useQuery<Tenant>({
    queryKey: ['/api/tenants', contractData?.tenantId],
    enabled: isOpen && !!contractData?.tenantId,
    onSuccess: (data) => {
      console.log("Inquilino carregado:", data);
      setTenantData(data);
    },
    onError: (error) => {
      console.error("Erro ao carregar inquilino:", error);
    }
  });

  // Carregar proprietário quando o contrato estiver disponível
  const { data: owner, isLoading: isLoadingOwner } = useQuery<Owner>({
    queryKey: ['/api/owners', contractData?.ownerId],
    enabled: isOpen && !!contractData?.ownerId,
    onSuccess: (data) => {
      console.log("Proprietário carregado:", data);
      setOwnerData(data);
    },
    onError: (error) => {
      console.error("Erro ao carregar proprietário:", error);
    }
  });

  // Carregar imóvel quando o contrato estiver disponível
  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: ['/api/properties', contractData?.propertyId],
    enabled: isOpen && !!contractData?.propertyId,
    onSuccess: (data) => {
      console.log("Imóvel carregado:", data);
      setPropertyData(data);
    },
    onError: (error) => {
      console.error("Erro ao carregar imóvel:", error);
    }
  });

  const isLoading = isLoadingPayment || isLoadingContract || isLoadingTenant || isLoadingOwner || isLoadingProperty;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carregando recibo...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!paymentData || !contractData || !tenantData || !ownerData || !propertyData) {
    // Tentar ajustar o problema com a carga de dados
    if (payment && !paymentData) {
      const processedData = {
        ...payment,
        interestAmount: payment.interestAmount !== null ? payment.interestAmount : 0,
        latePaymentFee: payment.latePaymentFee !== null ? payment.latePaymentFee : 0,
        paymentMethod: payment.paymentMethod || "Não informado",
        receiptNumber: payment.receiptNumber || `REC-${payment.id}`
      };
      setPaymentData(processedData);
    }

    if (contract && !contractData) {
      setContractData(contract);
    }

    if (tenant && !tenantData) {
      setTenantData(tenant);
    }

    if (owner && !ownerData) {
      setOwnerData(owner);
    }

    if (property && !propertyData) {
      setPropertyData(property);
    }

    // Se mesmo assim não tiver os dados, mostrar erro
    if (!paymentData && !payment) {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Não foi possível gerar o recibo</DialogTitle>
            </DialogHeader>
            <div className="p-4 text-center">
              <p>Não foi possível carregar os dados necessários para gerar o recibo.</p>
              <p className="text-sm text-muted-foreground mt-2">Detalhes: Pagamento não encontrado</p>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carregando dados do recibo...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const dueDate = new Date(paymentData.dueDate);
    const paymentMonth = monthNames[dueDate.getMonth()];
    const paymentYear = dueDate.getFullYear();

    // Criar o conteúdo HTML para impressão
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Pagamento</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ccc;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .receipt-number {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          .section-content {
            margin-left: 20px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .col {
            flex: 1;
          }
          .values {
            margin-top: 30px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-line {
            border-top: 1px solid #333;
            width: 200px;
            text-align: center;
            padding-top: 5px;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>RECIBO DE ALUGUEL</h1>
            <div class="receipt-number">Recibo Nº: ${paymentData.receiptNumber || contractData.id + '-' + dueDate.getMonth() + dueDate.getFullYear()}</div>
          </div>

          <div class="section">
            <div class="section-title">LOCADOR (PROPRIETÁRIO):</div>
            <div class="section-content">
              <p>Nome: ${ownerData.name}</p>
              <p>CPF: ${ownerData.document}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">LOCATÁRIO (INQUILINO):</div>
            <div class="section-content">
              <p>Nome: ${tenantData.name}</p>
              <p>CPF: ${tenantData.document}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">IMÓVEL:</div>
            <div class="section-content">
              <p>Endereço: ${propertyData.address.street}, ${propertyData.address.number} ${propertyData.address.complement ? '- ' + propertyData.address.complement : ''}</p>
              <p>${propertyData.address.neighborhood}, ${propertyData.address.city} - ${propertyData.address.state}, ${propertyData.address.zipCode}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">INFORMAÇÕES DO PAGAMENTO:</div>
            <div class="section-content">
              <p>Período de referência: ${paymentMonth}/${paymentYear}</p>
              <p>Data do vencimento: ${formatDate(paymentData.dueDate)}</p>
              <p>Data do pagamento: ${paymentData.paymentDate ? formatDate(paymentData.paymentDate) : 'Não informada'}</p>
              <p>Forma de pagamento: ${paymentData.paymentMethod || 'Não informada'}</p>
            </div>
          </div>

          <div class="section values">
            <div class="row">
              <div class="col">Valor do aluguel:</div>
              <div class="col">${formatCurrency(paymentData.value)}</div>
            </div>
            ${Number(paymentData.interestAmount) > 0 ? `
            <div class="row">
              <div class="col">Juros:</div>
              <div class="col">${formatCurrency(paymentData.interestAmount)}</div>
            </div>
            ` : ''}
            ${Number(paymentData.latePaymentFee) > 0 ? `
            <div class="row">
              <div class="col">Multa:</div>
              <div class="col">${formatCurrency(paymentData.latePaymentFee)}</div>
            </div>
            ` : ''}
            <div class="row" style="font-weight: bold; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;">
              <div class="col">TOTAL PAGO:</div>
              <div class="col">${formatCurrency(paymentData.value + (paymentData.interestAmount || 0) + (paymentData.latePaymentFee || 0))}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">OBSERVAÇÕES:</div>
            <div class="section-content">
              <p>${paymentData.observations || 'Nenhuma observação.'}</p>
            </div>
          </div>

          <div class="signatures">
            <div class="signature-line">
              LOCADOR (PROPRIETÁRIO)
            </div>
            <div class="signature-line">
              LOCATÁRIO (INQUILINO)
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptContent);
    printWindow.document.close();

    // Esperar o conteúdo carregar antes de imprimir
    setTimeout(() => {
      printWindow.print();
      // Alguns navegadores fecham automaticamente após imprimir, outros não
      // printWindow.close();
    }, 500);
  };

  // Usar os dados do estado local em vez dos dados da query
  const paymentDate = paymentData?.paymentDate ? new Date(paymentData.paymentDate) : null;
  const dueDate = paymentData ? new Date(paymentData.dueDate) : new Date();
  
  // Calcular valores totais
  const totalValue = paymentData ? 
    paymentData.value + (paymentData.interestAmount || 0) + (paymentData.latePaymentFee || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Recibo de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold border-b pb-1">Informações do Contrato</h3>
              <div className="mt-2">
                <p><span className="font-semibold">Contrato Nº:</span> {contractData.id}</p>
                <p><span className="font-semibold">Proprietário:</span> {ownerData.name}</p>
                <p><span className="font-semibold">Inquilino:</span> {tenantData.name}</p>
                <p><span className="font-semibold">Imóvel:</span> {propertyData.address.street}, {propertyData.address.number}</p>
                <p><span className="font-semibold">Bairro:</span> {propertyData.address.neighborhood}</p>
                <p><span className="font-semibold">Cidade:</span> {propertyData.address.city} - {propertyData.address.state}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold border-b pb-1">Informações do Pagamento</h3>
              <div className="mt-2">
                <p><span className="font-semibold">Recibo Nº:</span> {paymentData.receiptNumber || `${contractData.id}-${dueDate.getMonth()}${dueDate.getFullYear()}`}</p>
                <p><span className="font-semibold">Data de Vencimento:</span> {formatDate(paymentData.dueDate)}</p>
                <p><span className="font-semibold">Data de Pagamento:</span> {paymentData.paymentDate ? formatDate(paymentData.paymentDate) : "Não informada"}</p>
                <p><span className="font-semibold">Forma de Pagamento:</span> {paymentData.paymentMethod || "Não informada"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold border-b pb-1">Valores</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Valor do Aluguel:</span>
                <span>{formatCurrency(paymentData.value)}</span>
              </div>
              
              {Number(paymentData.interestAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Juros:</span>
                  <span>{formatCurrency(paymentData.interestAmount)}</span>
                </div>
              )}
              
              {Number(paymentData.latePaymentFee) > 0 && (
                <div className="flex justify-between">
                  <span>Multa:</span>
                  <span>{formatCurrency(paymentData.latePaymentFee)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          {paymentData.observations && (
            <div>
              <h3 className="font-bold border-b pb-1">Observações</h3>
              <p className="mt-2">{paymentData.observations}</p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer size={16} />
              Imprimir Recibo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};