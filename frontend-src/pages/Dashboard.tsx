import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Query para obter dados consolidados
  const { data: consolidatedData, isLoading: isLoadingData, refetch: refetchData } = trpc.agenda.getConsolidated.useQuery();

  // Mutation para sincronizar dados do Google Sheets
  const syncMutation = trpc.agenda.sync.useMutation({
    onSuccess: (result) => {
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
      // Recarrega os dados após sincronização
      refetchData();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || "Falha ao sincronizar dados" });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  // Auto-sincroniza ao carregar a página (apenas para admin)
  useEffect(() => {
    if (user?.role === "admin") {
      syncMutation.mutate();
    }
  }, []);

  const handleSync = () => {
    syncMutation.mutate();
  };

  const data = consolidatedData?.data || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Sistema de Visualização de Agendamentos
          </h1>
          <p className="text-muted-foreground">
            Consolidação de dados de duas bases de agendamento com status "Aprovado"
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Datas Agendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {data.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Paletes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {data.reduce((sum, item) => sum + (item.totalPaletes || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Última Atualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-foreground">
                {data.length > 0 && data[0].ultimaAtualizacao
                  ? new Date(data[0].ultimaAtualizacao).toLocaleString("pt-BR")
                  : "Nunca"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Sync Button */}
        {user?.role === "admin" && (
          <div className="mb-6">
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar do Google Sheets
                </>
              )}
            </Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agenda Consolidada</CardTitle>
            <CardDescription>
              Paletes agendados por data (apenas registros com status "Aprovado")
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum dado encontrado. Clique em "Sincronizar" para carregar os dados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Data Agenda</TableHead>
                      <TableHead className="text-right">Base 1 (Paletes)</TableHead>
                      <TableHead className="text-right">Base 2 (Paletes)</TableHead>
                      <TableHead className="text-right font-bold">Total (Paletes)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.dataAgenda}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.base1Paletes || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.base2Paletes || 0}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {item.totalPaletes || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        {user?.role !== "admin" && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem sincronizar dados do Google Sheets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
