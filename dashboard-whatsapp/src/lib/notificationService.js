class NotificationService {
    permission = 'default';
    audio = null;

    constructor() {
        // Verificamos si el navegador soporta notificaciones al iniciar
        if ('Notification' in window) {
            this.permission = Notification.permission;
            // Creamos el objeto de audio, apuntando al archivo en la carpeta /public
            this.audio = new Audio('/notification.mp3');
        }
    }

    /**
     * Solicita permiso al usuario para mostrar notificaciones si aún no se ha concedido o denegado.
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio.');
            return;
        }
        // Solo pedimos permiso si aún no nos han respondido (estado 'default')
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
    }

    /**
     * Reproduce el sonido de notificación.
     */
    playSound() {
        if (this.audio) {
            this.audio.play().catch(error => {
                // La reproducción automática a veces es bloqueada por el navegador hasta que el usuario interactúa.
                console.warn("No se pudo reproducir el sonido de notificación:", error);
            });
        }
    }

    /**
     * Muestra una notificación de escritorio.
     * @param {string} title - El título de la notificación.
     * @param {object} options - Las opciones de la notificación (ej. body, icon).
     */
    showNotification(title, options) {
        // No hacer nada si no hay soporte o el permiso fue denegado.
        if (!('Notification' in window) || this.permission !== 'granted') {
            return;
        }

        // Lógica clave: No mostrar la notificación si el usuario ya está viendo la página.
        if (document.hasFocus()) {
            console.log('La pestaña ya está activa, no se muestra la notificación para evitar redundancia.');
            // Aún así, reproducimos el sonido si la pestaña está activa pero el chat no.
            this.playSound();
            return;
        }

        // Si la pestaña no está activa, reproducimos el sonido y mostramos la notificación.
        this.playSound();
        const notification = new Notification(title, options);

        // Opcional: Al hacer clic en la notificación, enfocar la ventana y cerrar la notificación.
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

// Exportamos una única instancia para usar en toda la aplicación
export const notificationService = new NotificationService();