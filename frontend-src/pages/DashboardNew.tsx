import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { isWithinInterval } from "date-fns";

interface ChartData {
  data: string;
  paletes: number;
  base1: number;
  base2: number;
  base3: number;
}

export default function DashboardNew() {
  const { user } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Query para obter dados consolidados
  const { data: consolidatedData, isLoading: isLoadingData, refetch: refetchData } = trpc.agenda.getConsolidated.useQuery();

  // Mutation para sincronizar dados do Google Sheets
  const syncMutation = trpc.agenda.sync.useMutation({
    onSuccess: (result) => {
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
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

  // Processa dados para o gráfico
  const chartData = useMemo(() => {
    const data = consolidatedData?.data || [];
    
    return data.map((item) => ({
      data: item.dataAgenda,
      paletes: item.totalPaletes || 0,
      base1: item.base1Paletes || 0,
      base2: item.base2Paletes || 0,
      base3: item.base3Paletes || 0,
    })).sort((a, b) => {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      return dateA.getTime() - dateB.getTime();
    });
  }, [consolidatedData]);

  // Filtra dados por período
  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return chartData;

    return chartData.filter((item) => {
      const itemDate = parseDate(item.data);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return isWithinInterval(itemDate, { start, end });
      } else if (startDate) {
        const start = new Date(startDate);
        return itemDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        return itemDate <= end;
      }
      
      return true;
    });
  }, [chartData, startDate, endDate]);

  // Calcula estatísticas
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, media: 0, maxima: 0, minima: 0 };
    }

    const total = filteredData.reduce((sum, item) => sum + item.paletes, 0);
    const media = Math.round(total / filteredData.length);
    const maxima = Math.max(...filteredData.map((item) => item.paletes));
    const minima = Math.min(...filteredData.map((item) => item.paletes));

    return { total, media, maxima, minima };
  }, [filteredData]);

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  function parseDate(dateStr: string): Date {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-blue-900 mb-2">
                Agendamento CAD Uberlândia-MG
              </h1>
              <p className="text-blue-600 text-lg">
                Visualização evolutiva de paletes agendados
              </p>
            </div>
            {user?.role === "admin" && (
              <Button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sincronizar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg animate-slide-down ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white animate-scale-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Total de Paletes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs opacity-75 mt-1">no período selecionado</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-400 to-blue-500 text-white animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Média Diária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.media}</div>
              <p className="text-xs opacity-75 mt-1">paletes por dia</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-300 to-blue-400 text-white animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Máxima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.maxima}</div>
              <p className="text-xs opacity-75 mt-1">maior agendamento</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-200 to-blue-300 text-blue-900 animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Mínima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.minima}</div>
              <p className="text-xs opacity-75 mt-1">menor agendamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-0 shadow-lg mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Filtrar por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={handleResetFilter}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Limpar Filtro
              </Button>
            </div>
            {(startDate || endDate) && (
              <p className="text-sm text-blue-600 mt-3">
                Mostrando {filteredData.length} de {chartData.length} datas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border-0 shadow-lg mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-blue-900">Evolução de Paletes Agendados</CardTitle>
            <CardDescription>Visualização diária do total de paletes aprovados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Nenhum dado encontrado para o período selecionado.
                </p>
              </div>
            ) : (
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorPaletes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis
                      dataKey="data"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e3a8a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value) => [`${value} paletes`, '']}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="paletes"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="Total de Paletes"
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                    <Line
                      type="monotone"
                      dataKey="base1"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={{ fill: '#60a5fa', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Base 1"
                      isAnimationActive={true}
                      animationDuration={800}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="base2"
                      stroke="#93c5fd"
                      strokeWidth={2}
                      dot={{ fill: '#93c5fd', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Base 2"
                      isAnimationActive={true}
                      animationDuration={800}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="base3"
                      stroke="#bfdbfe"
                      strokeWidth={2}
                      dot={{ fill: '#bfdbfe', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Base 3"
                      isAnimationActive={true}
                      animationDuration={800}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-0 shadow-lg animate-fade-in">
          <CardHeader>
            <CardTitle className="text-blue-900">Detalhes dos Agendamentos</CardTitle>
            <CardDescription>
              Tabela com todos os registros do período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Nenhum dado encontrado. Clique em "Sincronizar" para carregar os dados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-blue-200 bg-blue-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">
                        Data Agenda
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-900">
                        Base 1
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-900">
                        Base 2
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-900">
                        Base 3
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-900">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-blue-100 hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.data}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {item.base1}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {item.base2}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {item.base3}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                          {item.paletes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-in-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
