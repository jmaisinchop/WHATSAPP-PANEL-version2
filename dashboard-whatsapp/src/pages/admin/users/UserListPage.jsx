import { useEffect, useState, useMemo } from 'react';
import { useUserStore } from '../../../store/userStore';
import { PlusCircle, MoreHorizontal, Search, UserCheck, ChevronLeft, ChevronRight, Users, UserX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Modal from '../../../components/ui/Modal';
import UserForm from '../../../components/admin/UserForm';

// Hook para "debounce"
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function UserListPage() {
  const { 
    users, deactivatedUsers, page, totalPages, loading, 
    fetchUsers, fetchDeactivatedUsers, setPage, setSearchTerm, 
    createUser, updateUser, deleteUser, restoreUser 
  } = useUserStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const debouncedSearch = useDebounce(localSearch, 500);

  // --- Paginación para la lista de INACTIVOS (manejada en el cliente) ---
  const [inactivePage, setInactivePage] = useState(1);
  const INACTIVE_PAGE_SIZE = 5; // Mostrar 5 usuarios inactivos por página

  useEffect(() => {
    fetchUsers();
    fetchDeactivatedUsers();
  }, [fetchUsers, fetchDeactivatedUsers]);

  useEffect(() => {
    setSearchTerm(debouncedSearch);
  }, [debouncedSearch, setSearchTerm]);

  const paginatedInactiveUsers = useMemo(() => {
    return deactivatedUsers.slice(
      (inactivePage - 1) * INACTIVE_PAGE_SIZE,
      inactivePage * INACTIVE_PAGE_SIZE
    );
  }, [deactivatedUsers, inactivePage]);

  const totalInactivePages = Math.ceil(deactivatedUsers.length / INACTIVE_PAGE_SIZE);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (formData) => {
    const result = editingUser ? await updateUser(editingUser.id, formData) : await createUser(formData);
    if (result.success) handleCloseModal();
  };

  const handleDelete = (userId) => {
    if (window.confirm('¿Estás seguro de que quieres DESACTIVAR este usuario?')) {
      deleteUser(userId);
    }
  };

  const handleRestore = (userId) => {
    if (window.confirm('¿Estás seguro de que quieres REACTIVAR este usuario?')) {
      restoreUser(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestionar Usuarios</h1>
          <p className="text-muted-foreground">
            Añade, edita y administra los roles de acceso al sistema.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            <Users className="mr-2 h-4 w-4" />
            Activos
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <UserX className="mr-2 h-4 w-4" />
            Desactivados
          </TabsTrigger>
        </TabsList>
        
        {/* PESTAÑA DE USUARIOS ACTIVOS */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Activos</CardTitle>
              <CardDescription>
                Usuarios con acceso actual al panel de control.
              </CardDescription>
              <div className="relative pt-2">
                <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre, apellido o email..." className="pl-8" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !users.length ? (
                    <TableRow><TableCell colSpan="4" className="h-24 text-center">Cargando...</TableCell></TableRow>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEditModal(user)}>Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-red-600 focus:text-red-600">Desactivar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan="4" className="h-24 text-center">No se encontraron usuarios activos.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end items-center gap-4">
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Siguiente<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* PESTAÑA DE USUARIOS DESACTIVADOS */}
        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Desactivados</CardTitle>
              <CardDescription>
                Estos usuarios no pueden iniciar sesión. Puedes reactivarlos en cualquier momento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha Desactivación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {loading && !deactivatedUsers.length ? (
                    <TableRow><TableCell colSpan="5" className="h-24 text-center">Cargando...</TableCell></TableRow>
                  ) : paginatedInactiveUsers.length > 0 ? (
                    paginatedInactiveUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-muted-foreground/80">{user.firstName} {user.lastName}</TableCell>
                        <TableCell className="text-muted-foreground/80">{user.email}</TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground/80">{new Date(user.deletedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => handleRestore(user.id)}>
                            <UserCheck className="mr-2 h-4 w-4" /> Reactivar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan="5" className="h-24 text-center">No hay usuarios desactivados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end items-center gap-4">
              <span className="text-sm text-muted-foreground">Página {inactivePage} de {totalInactivePages || 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setInactivePage(p => p - 1)} disabled={inactivePage <= 1}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setInactivePage(p => p + 1)} disabled={inactivePage >= totalInactivePages}>Siguiente<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL PARA CREAR/EDITAR */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}>
        <UserForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingUser} />
      </Modal>
    </div>
  );
}