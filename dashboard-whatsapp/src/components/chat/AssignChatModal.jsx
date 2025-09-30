import { useEffect, useState, useMemo } from 'react';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import Modal from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Users, Search } from 'lucide-react';

export default function AssignChatModal({ isOpen, onClose, chatId }) {
  const { agentList, fetchAgentList } = useUserStore();
  const { assignChatToAgent } = useChatStore();
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchAgentList();
      // Reseteamos los estados cuando el modal se abre
      setSearchTerm("");
      setSelectedAgentId(null);
    }
  }, [isOpen, fetchAgentList]);

  // Filtramos la lista de agentes en tiempo real basado en la búsqueda
  const filteredAgents = useMemo(() => {
    if (!searchTerm) {
      return agentList;
    }
    return agentList.filter(agent =>
      `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agentList, searchTerm]);

  const handleAssign = async () => {
    if (!selectedAgentId) return;
    const result = await assignChatToAgent(chatId, parseInt(selectedAgentId));
    if (result.success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar o Reasignar Chat">
      <div className="space-y-4 flex flex-col">
        {/* --- Campo de Búsqueda --- */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agente por nombre..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* --- Lista de Agentes con Scroll --- */}
        {/* ✅ Se añadió la clase 'bg-background' para corregir el fondo en modo oscuro */}
        <ScrollArea className="h-48 w-full rounded-md border bg-background">
          <div className="p-2">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id.toString())}
                  className={`w-full text-left p-2 rounded-md transition-colors text-sm ${
                    selectedAgentId === agent.id.toString()
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {agent.firstName} {agent.lastName}
                </button>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No se encontraron agentes.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* --- Botones de Acción --- */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!selectedAgentId}>
            <Users className="mr-2 h-4 w-4" />
            Confirmar Asignación
          </Button>
        </div>
      </div>
    </Modal>
  );
}