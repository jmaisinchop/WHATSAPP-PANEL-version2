// src/components/chat/CustomerProfileSidebar.jsx

import { useEffect, useState } from 'react';
import { X, User, Phone, Hash } from 'lucide-react';
import apiService from '../../api/apiService';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// Componente para mostrar un campo de información
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || 'No disponible'}</span>
    </div>
  </div>
);

// Componente de "esqueleto" para mostrar mientras carga
const ProfileSkeleton = () => (
  <div className="p-6">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="mt-8 space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

export default function CustomerProfileSidebar({ contactId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiService.get(`/contacts/${contactId}`);
        setProfile(response.data);
      } catch (error) {
        console.error("Error al obtener el perfil del cliente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [contactId]);

  return (
    // Contenedor principal del panel con fondo oscuro y animación
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div 
        className="absolute inset-y-0 right-0 h-full w-full max-w-sm bg-card border-l shadow-lg animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Perfil del Contacto</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido del Panel */}
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <div className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-primary">
                <AvatarImage src={profile?.profilePicUrl} alt={profile?.pushname} />
                <AvatarFallback className="text-3xl">
                  {profile?.pushname?.[0]?.toUpperCase() || '#'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{profile?.pushname}</h2>
            </div>
            <div className="mt-8">
              <InfoRow icon={User} label="Nombre en Contactos" value={profile?.name} />
              <InfoRow icon={Phone} label="Número" value={profile?.number} />
              <InfoRow icon={Hash} label="ID de WhatsApp" value={profile?.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}