import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../api/apiService';
import { usePanelStore } from '../../store/panelStore';

// --- Formulario para cambiar la Foto de Perfil ---
const ProfilePictureForm = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { botProfilePicUrl, fetchBotProfile } = usePanelStore();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreview(null);
      toast.error('Por favor, selecciona un archivo de imagen válido.');
    }
  };

  const handleSavePicture = async () => {
    if (!selectedFile) {
      toast.error('No has seleccionado ninguna imagen.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Actualizando foto de perfil...');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiService.post('/admin/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(response.data.message || 'Foto de perfil actualizada.', { id: toastId });
      
      // Refresca la foto en el panel para que se actualice el logo
      fetchBotProfile();
      
      setPreview(null);
      setSelectedFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar la foto.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto de Perfil del Bot</CardTitle>
        <CardDescription>Esta es la imagen que los usuarios ven en WhatsApp y que se usa como logo en el panel.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 md:flex-row">
        <div className="relative w-40 h-40 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
          <img 
            src={preview || botProfilePicUrl || ''} 
            alt="Vista previa" 
            className="h-full w-full object-cover"
            // Manejo de errores si la imagen no carga
            onError={(e) => { e.target.style.display = 'none'; }}
            onLoad={(e) => { e.target.style.display = 'block'; }}
          />
          <UploadCloud 
            className="h-16 w-16 text-muted-foreground" 
            // Muestra el icono solo si no hay ninguna imagen que mostrar
            style={{ display: (preview || botProfilePicUrl) ? 'none' : 'block' }} 
          />
        </div>
        <div className="flex-1 space-y-4 text-center md:text-left">
          <p className="text-sm text-muted-foreground">Selecciona una imagen cuadrada (JPG, PNG) para obtener los mejores resultados.</p>
          <div className="flex gap-4">
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
            <Button onClick={handleSavePicture} disabled={!selectedFile || loading}>
              {loading ? 'Guardando...' : 'Guardar Foto'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


// --- Formulario para cambiar el Estado/Info ---
const BotStatusForm = () => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveStatus = async (e) => {
        e.preventDefault();
        if (!status) return toast.error('El estado no puede estar vacío.');
        if (status.length > 139) return toast.error('El estado no puede tener más de 139 caracteres.');

        setLoading(true);
        const toastId = toast.loading('Actualizando estado...');
        try {
            const res = await apiService.patch('/admin/bot-status', { status });
            toast.success(res.data.message || 'Estado actualizado.', { id: toastId });
            setStatus(''); // Limpia el campo después de guardar
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar el estado.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estado/Info del Perfil del Bot</CardTitle>
                <CardDescription>Este es el texto que aparece en la sección "Info." de WhatsApp (máx. 139 caracteres).</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSaveStatus} className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="statusText">Nuevo Estado/Info</Label>
                        <Input id="statusText" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Ej: Disponible para ayudarte" maxLength={139} />
                    </div>
                    <Button type="submit" disabled={!status || loading}>
                        {loading ? 'Guardando...' : 'Guardar Info'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};


// --- Componente principal de la página que une los dos formularios ---
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajustes del Bot</h1>
        <p className="text-muted-foreground">Gestiona la identidad pública de tu cuenta de WhatsApp.</p>
      </div>
      <ProfilePictureForm />
      <BotStatusForm />
    </div>
  );
}