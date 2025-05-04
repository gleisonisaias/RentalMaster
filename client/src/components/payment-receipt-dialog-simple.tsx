import React from "react";
import { Payment } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  // Carregar dados diretamente em uma única chamada
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/payments/${paymentId}/receipt-data`],
    enabled: isOpen && !!paymentId,
  });

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carregando recibo...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !data) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Erro ao gerar recibo</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <p>Não foi possível carregar os dados necessários para o recibo.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, tente novamente mais tarde.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Verificar se os dados estão disponíveis
  if (!data || !data.payment || !data.contract || !data.tenant || !data.owner || !data.property) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Não foi possível gerar o recibo</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p>Não foi possível carregar os dados necessários para gerar o recibo.</p>
            <p className="text-sm text-muted-foreground mt-2">Verifique se todos os dados estão disponíveis.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { payment, contract, tenant, owner, property } = data;

  // Garantir que os valores numéricos estejam definidos corretamente
  const safePayment = {
    ...payment,
    interestAmount: payment.interestAmount || 0,
    latePaymentFee: payment.latePaymentFee || 0,
    paymentMethod: payment.paymentMethod || "Não informado",
    receiptNumber: payment.receiptNumber || `REC-${payment.id}`
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const dueDate = new Date(safePayment.dueDate);
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
            padding: 0;
            color: #333;
            font-size: 12px;
          }
          .page {
            width: 100%;
            max-width: 21cm; /* Tamanho A4 */
            margin: 0 auto;
          }
          /* Cria duas cópias do recibo por página */
          .receipt-container {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .receipt {
            width: 100%;
            max-width: 18cm; /* Um pouco menor que a largura total */
            margin: 0 auto 1cm auto;
            padding: 10px;
            border: 1px solid #ccc;
            box-sizing: border-box;
            page-break-inside: avoid;
            height: 13.5cm; /* Metade da altura do A4 (29.7cm/2) menos algumas margens */
          }
          .receipt:last-child {
            margin-bottom: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
          }
          .header h1 {
            font-size: 16px;
            margin: 10px 0 5px 0;
          }
          .receipt-number {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .section {
            margin-bottom: 8px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 3px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
          }
          .section-content {
            margin-left: 10px;
          }
          .section-content p {
            margin: 2px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .col {
            flex: 1;
          }
          .values {
            margin-top: 10px;
            padding: 8px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .signatures {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
          }
          .signature-line {
            border-top: 1px solid #333;
            width: 45%;
            text-align: center;
            padding-top: 3px;
            font-size: 11px;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
            .receipt {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="receipt-container">
            <!-- Primeira cópia do recibo -->
            <div class="receipt">
              <div class="header">
                <h1>RECIBO DE ALUGUEL</h1>
                <div class="receipt-number">Recibo Nº: ${safePayment.receiptNumber || contract.id + '-' + dueDate.getMonth() + dueDate.getFullYear()}</div>
              </div>

              <div class="section">
                <div class="section-title">LOCADOR (PROPRIETÁRIO):</div>
                <div class="section-content">
                  <p>Nome: ${owner.name}</p>
                  <p>CPF: ${owner.document}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">LOCATÁRIO (INQUILINO):</div>
                <div class="section-content">
                  <p>Nome: ${tenant.name}</p>
                  <p>CPF: ${tenant.document}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">IMÓVEL:</div>
                <div class="section-content">
                  <p>Endereço: ${property.address.street}, ${property.address.number} ${property.address.complement ? '- ' + property.address.complement : ''}</p>
                  <p>${property.address.neighborhood}, ${property.address.city} - ${property.address.state}, ${property.address.zipCode}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">INFORMAÇÕES DO PAGAMENTO:</div>
                <div class="section-content">
                  <p>Período: ${paymentMonth}/${paymentYear}</p>
                  <p>Vencimento: ${formatDate(safePayment.dueDate)}</p>
                  <p>Pagamento: ${safePayment.paymentDate ? formatDate(safePayment.paymentDate) : 'Não informada'}</p>
                  <p>Forma pagamento: ${safePayment.paymentMethod || 'Não informada'}</p>
                </div>
              </div>

              <div class="section values">
                <div class="row">
                  <div class="col">Valor do aluguel:</div>
                  <div class="col">${formatCurrency(safePayment.value)}</div>
                </div>
                ${Number(safePayment.interestAmount) > 0 ? `
                <div class="row">
                  <div class="col">Juros:</div>
                  <div class="col">${formatCurrency(safePayment.interestAmount)}</div>
                </div>
                ` : ''}
                ${Number(safePayment.latePaymentFee) > 0 ? `
                <div class="row">
                  <div class="col">Multa:</div>
                  <div class="col">${formatCurrency(safePayment.latePaymentFee)}</div>
                </div>
                ` : ''}
                <div class="row" style="font-weight: bold; margin-top: 5px; border-top: 1px solid #ccc; padding-top: 3px;">
                  <div class="col">TOTAL PAGO:</div>
                  <div class="col">${formatCurrency(safePayment.value + (safePayment.interestAmount || 0) + (safePayment.latePaymentFee || 0))}</div>
                </div>
              </div>

              ${safePayment.observations ? `
              <div class="section">
                <div class="section-title">OBSERVAÇÕES:</div>
                <div class="section-content">
                  <p>${safePayment.observations}</p>
                </div>
              </div>
              ` : ''}

              <div class="signatures">
                <div class="signature-line">
                  LOCADOR (PROPRIETÁRIO)
                </div>
                <div class="signature-line">
                  LOCATÁRIO (INQUILINO)
                </div>
              </div>
            </div>

            <!-- Segunda cópia do recibo (idêntica) -->
            <div class="receipt">
              <div class="header">
                <h1>RECIBO DE ALUGUEL</h1>
                <div class="receipt-number">Recibo Nº: ${safePayment.receiptNumber || contract.id + '-' + dueDate.getMonth() + dueDate.getFullYear()}</div>
              </div>

              <div class="section">
                <div class="section-title">LOCADOR (PROPRIETÁRIO):</div>
                <div class="section-content">
                  <p>Nome: ${owner.name}</p>
                  <p>CPF: ${owner.document}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">LOCATÁRIO (INQUILINO):</div>
                <div class="section-content">
                  <p>Nome: ${tenant.name}</p>
                  <p>CPF: ${tenant.document}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">IMÓVEL:</div>
                <div class="section-content">
                  <p>Endereço: ${property.address.street}, ${property.address.number} ${property.address.complement ? '- ' + property.address.complement : ''}</p>
                  <p>${property.address.neighborhood}, ${property.address.city} - ${property.address.state}, ${property.address.zipCode}</p>
                </div>
              </div>

              <div class="section">
                <div class="section-title">INFORMAÇÕES DO PAGAMENTO:</div>
                <div class="section-content">
                  <p>Período: ${paymentMonth}/${paymentYear}</p>
                  <p>Vencimento: ${formatDate(safePayment.dueDate)}</p>
                  <p>Pagamento: ${safePayment.paymentDate ? formatDate(safePayment.paymentDate) : 'Não informada'}</p>
                  <p>Forma pagamento: ${safePayment.paymentMethod || 'Não informada'}</p>
                </div>
              </div>

              <div class="section values">
                <div class="row">
                  <div class="col">Valor do aluguel:</div>
                  <div class="col">${formatCurrency(safePayment.value)}</div>
                </div>
                ${Number(safePayment.interestAmount) > 0 ? `
                <div class="row">
                  <div class="col">Juros:</div>
                  <div class="col">${formatCurrency(safePayment.interestAmount)}</div>
                </div>
                ` : ''}
                ${Number(safePayment.latePaymentFee) > 0 ? `
                <div class="row">
                  <div class="col">Multa:</div>
                  <div class="col">${formatCurrency(safePayment.latePaymentFee)}</div>
                </div>
                ` : ''}
                <div class="row" style="font-weight: bold; margin-top: 5px; border-top: 1px solid #ccc; padding-top: 3px;">
                  <div class="col">TOTAL PAGO:</div>
                  <div class="col">${formatCurrency(safePayment.value + (safePayment.interestAmount || 0) + (safePayment.latePaymentFee || 0))}</div>
                </div>
              </div>

              ${safePayment.observations ? `
              <div class="section">
                <div class="section-title">OBSERVAÇÕES:</div>
                <div class="section-content">
                  <p>${safePayment.observations}</p>
                </div>
              </div>
              ` : ''}

              <div class="signatures">
                <div class="signature-line">
                  LOCADOR (PROPRIETÁRIO)
                </div>
                <div class="signature-line">
                  LOCATÁRIO (INQUILINO)
                </div>
              </div>
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
    }, 500);
  };

  // Calcular valores totais
  const totalValue = safePayment.value + (safePayment.interestAmount || 0) + (safePayment.latePaymentFee || 0);

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
                <p><span className="font-semibold">Contrato Nº:</span> {contract.id}</p>
                <p><span className="font-semibold">Proprietário:</span> {owner.name}</p>
                <p><span className="font-semibold">Inquilino:</span> {tenant.name}</p>
                <p><span className="font-semibold">Imóvel:</span> {property.address.street}, {property.address.number}</p>
                <p><span className="font-semibold">Bairro:</span> {property.address.neighborhood}</p>
                <p><span className="font-semibold">Cidade:</span> {property.address.city} - {property.address.state}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold border-b pb-1">Informações do Pagamento</h3>
              <div className="mt-2">
                <p><span className="font-semibold">Recibo Nº:</span> {safePayment.receiptNumber || `${contract.id}-${new Date(safePayment.dueDate).getMonth()}${new Date(safePayment.dueDate).getFullYear()}`}</p>
                <p><span className="font-semibold">Data de Vencimento:</span> {formatDate(safePayment.dueDate)}</p>
                <p><span className="font-semibold">Data de Pagamento:</span> {safePayment.paymentDate ? formatDate(safePayment.paymentDate) : "Não informada"}</p>
                <p><span className="font-semibold">Forma de Pagamento:</span> {safePayment.paymentMethod || "Não informada"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold border-b pb-1">Valores</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Valor do Aluguel:</span>
                <span>{formatCurrency(safePayment.value)}</span>
              </div>
              
              {Number(safePayment.interestAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Juros:</span>
                  <span>{formatCurrency(safePayment.interestAmount)}</span>
                </div>
              )}
              
              {Number(safePayment.latePaymentFee) > 0 && (
                <div className="flex justify-between">
                  <span>Multa:</span>
                  <span>{formatCurrency(safePayment.latePaymentFee)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          {safePayment.observations && (
            <div>
              <h3 className="font-bold border-b pb-1">Observações</h3>
              <p className="mt-2">{safePayment.observations}</p>
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