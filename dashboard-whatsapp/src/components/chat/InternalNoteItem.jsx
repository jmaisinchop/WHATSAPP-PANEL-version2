import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { StickyNote } from 'lucide-react';

export default function InternalNoteItem({ note }) {
  // Aseguramos que el autor exista y tenga nombre
  const authorName = note.author 
    ? `${note.author.firstName || ''} ${note.author.lastName || ''}`.trim() 
    : 'Agente';
  
  const fallback = authorName ? authorName.charAt(0).toUpperCase() : 'A';

  return (
    <div className="flex gap-3 my-4">
      <Avatar className="h-9 w-9">
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="p-3 rounded-lg rounded-tl-none bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="font-bold text-sm text-yellow-800 dark:text-yellow-200">{authorName}</p>
            </div>
            <time className="text-xs text-yellow-600 dark:text-yellow-500">
              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
            </time>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {note.content}
          </p>
        </div>
      </div>
    </div>
  );
}