import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Componente Modal reutilizable y controlado.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controla si el modal está visible o no.
 * @param {Function} props.onClose - Función que se llama cuando el modal se intenta cerrar.
 * @param {string} props.title - El título que se mostrará en la cabecera del modal.
 * @param {string} [props.description] - Una descripción opcional que aparece debajo del título.
 * @param {React.ReactNode} props.children - El contenido que se renderizará dentro del modal.
 */
export default function Modal({ isOpen, onClose, title, description, children }) {
  // onOpenChange se dispara cuando el usuario presiona 'Esc' o hace clic fuera del modal.
  // Lo conectamos directamente a la función onClose para un comportamiento controlado.
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Contenedor para el contenido principal del modal */}
        <div className="py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}