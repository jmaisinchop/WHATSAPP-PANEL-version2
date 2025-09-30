import { useState, useEffect } from 'react';

export default function UserForm({ onSubmit, onCancel, initialData = null }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'agent',
  });

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        email: initialData.email || '',
        password: '', // La contraseña siempre empieza vacía por seguridad
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        role: initialData.role || 'agent',
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    // En modo edición, si la contraseña está vacía, la eliminamos para no enviarla
    if (isEditMode && !dataToSend.password) {
      delete dataToSend.password;
    }
    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium">Nombre</label>
          <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className="w-full rounded-md border p-2"/>
        </div>
        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium">Apellido</label>
          <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className="w-full rounded-md border p-2"/>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="w-full rounded-md border p-2"/>
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
          <input type="password" name="password" id="password" onChange={handleChange} placeholder={isEditMode ? "Dejar en blanco para no cambiar" : ""} required={!isEditMode} minLength={isEditMode ? undefined : 8} className="w-full rounded-md border p-2"/>
        </div>
        <div>
          <label htmlFor="role" className="mb-2 block text-sm font-medium">Rol</label>
          <select name="role" id="role" value={formData.role} onChange={handleChange} className="w-full rounded-md border bg-white p-2">
            <option value="agent">Agente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>
      <div className="mt-8 flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300">Cancelar</button>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}</button>
      </div>
    </form>
  );
}