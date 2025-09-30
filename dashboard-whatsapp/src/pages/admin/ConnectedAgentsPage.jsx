// src/pages/admin/ConnectedAgentsPage.jsx
import { useEffect } from 'react';
import { usePresenceStore } from '../../store/presenceStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ConnectedAgentsPage() {
  const { connectedAgents, fetchConnectedAgents, loading } = usePresenceStore();

  useEffect(() => {
    fetchConnectedAgents();
  }, [fetchConnectedAgents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agentes Conectados en Tiempo Real ({connectedAgents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p>Cargando...</p>}
        {!loading && connectedAgents.length === 0 && (
          <p className="text-muted-foreground">No hay agentes conectados en este momento.</p>
        )}
        <div className="space-y-4">
          {connectedAgents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{agent.firstName?.[0] || 'A'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{agent.firstName} {agent.lastName}</p>
                  <p className="text-sm text-muted-foreground">{agent.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500">
                Conectado
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}