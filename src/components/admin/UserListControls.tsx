import { Search, Filter, Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface UserListControlsProps {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  blockedFilter: string;
  onSearchChange: (query: string) => void;
  onRoleFilterChange: (role: string) => void;
  onStatusFilterChange: (status: string) => void;
  onBlockedFilterChange: (blocked: string) => void;
  onClearFilters: () => void;
  totalUsers: number;
  filteredUsers: number;
}

export function UserListControls({
  searchQuery,
  roleFilter,
  statusFilter,
  blockedFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onBlockedFilterChange,
  onClearFilters,
  totalUsers,
  filteredUsers
}: UserListControlsProps) {
  const hasActiveFilters = searchQuery || roleFilter !== 'todos' || statusFilter !== 'todos' || blockedFilter !== 'todos';

  return (
    <div className="space-y-4">
      {/* Header with Title and New User Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, planos e permissões da plataforma
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Link>
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, slug, telefone, WhatsApp ou Instagram..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      !
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros de Usuários</SheetTitle>
                  <SheetDescription>
                    Refine a lista de usuários usando os filtros abaixo
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Role Filter */}
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <Select value={roleFilter} onValueChange={onRoleFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as funções</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="parceiro">Parceiro</SelectItem>
                        <SelectItem value="corretor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plan Status Filter */}
                  <div className="space-y-2">
                    <Label>Status do Plano</Label>
                    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status do Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os status</SelectItem>
                        <SelectItem value="active">Plano Ativo</SelectItem>
                        <SelectItem value="inactive">Plano Inativo</SelectItem>
                        <SelectItem value="suspended">Plano Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Blocked Filter */}
                  <div className="space-y-2">
                    <Label>Status de Acesso</Label>
                    <Select value={blockedFilter} onValueChange={onBlockedFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status de Acesso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="false">Desbloqueados</SelectItem>
                        <SelectItem value="true">Bloqueados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={onClearFilters}
                      className="w-full"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
            <div className="flex items-center gap-4">
              <span>
                Exibindo {filteredUsers} de {totalUsers} usuários
              </span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  Filtros ativos
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}