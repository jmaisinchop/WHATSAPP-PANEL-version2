import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Meh, Frown, MessageSquareText } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Sub-componente para las tarjetas de estadísticas ---
const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">respuestas totales</p>
    </CardContent>
  </Card>
);

// --- Componente principal del Dashboard ---
export default function DashboardHomePage() {
  const { stats, loading, fetchSurveyStats } = useDashboardStore();

  // Carga los datos una vez cuando el componente se monta.
  // Las actualizaciones en tiempo real son manejadas por el hook useChatEvents.
  useEffect(() => {
    fetchSurveyStats();
  }, [fetchSurveyStats]);

  // --- Vista de Carga (Skeleton) ---
  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Rendimiento</h1>
          <p className="text-muted-foreground">
            Un resumen de la satisfacción de tus clientes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[126px] w-full" />
          <Skeleton className="h-[126px] w-full" />
          <Skeleton className="h-[126px] w-full" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Rendimiento</h1>
        <p className="text-muted-foreground">
          Un resumen de la satisfacción de tus clientes.
        </p>
      </div>

      {/* --- Tarjetas de Estadísticas --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Excelente" value={stats.counts.EXCELENTE} icon={Smile} color="text-green-500" />
        <StatCard title="Regular" value={stats.counts.REGULAR} icon={Meh} color="text-yellow-500" />
        <StatCard title="Mala" value={stats.counts.MALA} icon={Frown} color="text-red-500" />
      </div>

      {/* --- Tarjeta de Comentarios Recientes --- */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            Comentarios Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.comments.length > 0 ? (
            <div className="space-y-4">
              {stats.comments.map((comment) => (
                <div key={comment.id} className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium italic">"{comment.comment}"</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      De: {comment.chat.customerName || comment.chat.contactNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-8">
              No hay comentarios recientes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}