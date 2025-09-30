import { Bell, X } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { Button } from './ui/button';

export default function NotificationPanel() {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotificationStore();

  return (
    // Este es el contenido que irá dentro del menú desplegable
    <>
      <div className="p-2 border-b">
        <h3 className="font-semibold">Notificaciones</h3>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">No hay notificaciones nuevas</p>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="border-b p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              <p>{notif.message}</p>
              {/* Podrías añadir una marca de tiempo aquí */}
            </div>
          ))
        )}
      </div>
      {notifications.length > 0 && (
         <div className='p-2 flex justify-between'>
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>Marcar como leídas</Button>
            <Button variant="destructive" size="sm" onClick={clearNotifications}>Limpiar</Button>
         </div>
      )}
    </>
  );
}