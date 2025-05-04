import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/ui/stat-card";
import ActionCard from "@/components/ui/action-card";
import { Plus, AlertCircle, Clock, FileText, Wallet, AlertTriangle } from "lucide-react";
import {
  Users,
  UserRound,
  Home,
  FileText as FileTextIcon,
  BanknoteIcon,
  LayoutDashboard,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ContractForm } from "@/components/contract-form";

interface DashboardStats {
  expiredContracts: number;
  expiringContracts: number;
  totalContracts: number;
  pendingPayments: number;
  overduePayments: number;
}

const Dashboard = () => {
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: 1,
    onError: () => {
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas do dashboard",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Início</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600 mt-1">Visão geral do sistema de gerenciamento de contratos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {isLoading ? (
          Array(5).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-9 w-16 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Contratos Vencidos"
              value={stats?.expiredContracts || 0}
              description="Contratos que precisam ser renovados"
              icon={<AlertCircle />}
              iconBgColor="bg-red-100"
              iconColor="text-red-500"
              bgColor="bg-gradient-to-br from-white to-red-50"
              href="/contratos"
            />
            <StatCard
              title="Contratos a Vencer"
              value={stats?.expiringContracts || 0}
              description="Vencem nos próximos 30 dias"
              icon={<Clock />}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-500"
              bgColor="bg-gradient-to-br from-white to-amber-50"
              href="/contratos"
            />
            <StatCard
              title="Total de Contratos"
              value={stats?.totalContracts || 0}
              description="Contratos ativos no sistema"
              icon={<FileText />}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-500"
              bgColor="bg-gradient-to-br from-white to-blue-50"
              href="/contratos"
            />
            <StatCard
              title="Pagamentos Agendados"
              value={stats?.pendingPayments || 0}
              description="Pagamentos futuros"
              icon={<Wallet />}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-500"
              bgColor="bg-gradient-to-br from-white to-purple-50"
              href="/pagamentos?status=agendado"
            />
            <StatCard
              title="Pagamentos Vencidos"
              value={stats?.overduePayments || 0}
              description="Pagamentos em atraso"
              icon={<AlertTriangle />}
              iconBgColor="bg-orange-100"
              iconColor="text-orange-500"
              bgColor="bg-gradient-to-br from-white to-orange-50"
              href="/pagamentos?status=vencido"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Button 
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-md flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow"
          onClick={() => setIsNewContractOpen(true)}
        >
          <div className="bg-white/20 rounded-full p-1 mr-2">
            <Plus className="h-4 w-4" />
          </div>
          Novo Contrato
        </Button>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <ActionCard
          title="Proprietários"
          description="Gerencie cadastros de proprietários"
          icon={<Users className="h-10 w-10" />}
          href="/proprietarios"
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          iconColor="text-blue-500"
        />
        <ActionCard
          title="Inquilinos"
          description="Gerencie cadastros de inquilinos"
          icon={<UserRound className="h-10 w-10" />}
          href="/inquilinos"
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          iconColor="text-green-500"
        />
        <ActionCard
          title="Imóveis"
          description="Gerencie seus imóveis disponíveis"
          icon={<Home className="h-10 w-10" />}
          href="/imoveis"
          bgColor="bg-gradient-to-br from-amber-50 to-amber-100"
          iconColor="text-amber-500"
        />
        <ActionCard
          title="Pagamentos"
          description="Gerencie pagamentos e cobranças"
          icon={<BanknoteIcon className="h-10 w-10" />}
          href="/pagamentos"
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          iconColor="text-purple-500"
        />
      </div>

      {/* Feature Highlight */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-blue-900 mb-4 text-center">
            Sistema completo para gerenciar contratos de aluguel e relacionamentos com inquilinos e proprietários
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 transition-all duration-300 hover:shadow-md hover:border-blue-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-3">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-blue-900 mb-2">Cadastro Completo</h3>
                <p className="text-xs text-blue-700">Gerencie imóveis, inquilinos e proprietários em um só lugar</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transition-all duration-300 hover:shadow-md hover:border-green-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-3">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600">
                    <FileTextIcon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-green-900 mb-2">Contratos Profissionais</h3>
                <p className="text-xs text-green-700">Gere PDFs de contratos residenciais e comerciais automaticamente</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100 transition-all duration-300 hover:shadow-md hover:border-purple-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-3">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 text-purple-600">
                    <LayoutDashboard className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-purple-900 mb-2">Gestão Financeira</h3>
                <p className="text-xs text-purple-700">Acompanhe recebimentos e gere comprovantes de pagamento</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Contract Dialog */}
      <Dialog open={isNewContractOpen} onOpenChange={setIsNewContractOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Cadastre um novo contrato de aluguel
            </DialogDescription>
          </DialogHeader>
          <ContractForm onSuccess={() => setIsNewContractOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
