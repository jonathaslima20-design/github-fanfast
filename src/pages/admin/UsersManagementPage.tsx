import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UserTable } from '@/components/admin/UserTable';
import { UserListControls } from '@/components/admin/UserListControls';
import { UserSummaryCards } from '@/components/admin/UserSummaryCards';
import { FloatingUserBulkActions } from '@/components/admin/FloatingUserBulkActions';
import { CloneUserDialog } from '@/components/admin/CloneUserDialog';
import { SimpleCopyProductsDialog } from '@/components/admin/SimpleCopyProductsDialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { User } from '@/types';

export default function UsersManagementPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceUserId, setCloneSourceUserId] = useState<string>('');
  const [copyProductsDialogOpen, setCopyProductsDialogOpen] = useState(false);
  const [copyProductsSourceUserId, setCopyProductsSourceUserId] = useState<string>('');

  // Fetch users data
  useEffect(() => {
    fetchUsers();
  }, []);

  // Listen for clone user dialog events
  useEffect(() => {
    const handleOpenCloneDialog = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUserId: string }>;
      setCloneSourceUserId(customEvent.detail.targetUserId);
      setCloneDialogOpen(true);
    };

    const handleOpenCopyProducts = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUserId: string }>;
      setCopyProductsSourceUserId(customEvent.detail.targetUserId);
      setCopyProductsDialogOpen(true);
    };

    window.addEventListener('openCloneUserDialog', handleOpenCloneDialog);
    window.addEventListener('openCopyProducts', handleOpenCopyProducts);

    return () => {
      window.removeEventListener('openCloneUserDialog', handleOpenCloneDialog);
      window.removeEventListener('openCopyProducts', handleOpenCopyProducts);
    };
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.slug && user.slug.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => !user.is_blocked);
      } else if (statusFilter === 'blocked') {
        filtered = filtered.filter(user => user.is_blocked);
      }
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(user => user.plan_status === planFilter);
    }

    setDisplayedUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter, planFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(displayedUsers.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: !currentBlocked })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_blocked: !currentBlocked }
          : user
      ));

      toast.success(
        currentBlocked 
          ? 'Usuário desbloqueado com sucesso' 
          : 'Usuário bloqueado com sucesso'
      );
    } catch (error) {
      console.error('Error toggling user block status:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      setSelectedUsers(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(userId);
        return newSelected;
      });

      toast.success('Usuário excluído com sucesso');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleBulkAction = async (action: string, userIds: string[]) => {
    try {
      switch (action) {
        case 'block':
          await supabase
            .from('users')
            .update({ is_blocked: true })
            .in('id', userIds);
          break;
        case 'unblock':
          await supabase
            .from('users')
            .update({ is_blocked: false })
            .in('id', userIds);
          break;
        case 'delete':
          await supabase
            .from('users')
            .delete()
            .in('id', userIds);
          break;
      }

      // Refresh data
      await fetchUsers();
      setSelectedUsers(new Set());
      
      toast.success('Ação executada com sucesso');
    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast.error('Erro ao executar ação em lote');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os usuários do sistema</p>
        </div>
        <Button onClick={() => navigate('/admin/users/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <UserSummaryCards users={users} />

      <UserListControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        onRefresh={fetchUsers}
      />

      <UserTable
        users={displayedUsers}
        selectedUsers={selectedUsers}
        onSelectUser={handleSelectUser}
        onSelectAll={handleSelectAll}
        onToggleBlock={handleToggleBlock}
        onDeleteUser={handleDeleteUser}
        loading={loading}
        currentUserRole={currentUser?.role || 'user'}
      />

      {selectedUsers.size > 0 && (
        <FloatingUserBulkActions
          selectedCount={selectedUsers.size}
          selectedUsers={users.filter(user => selectedUsers.has(user.id))}
          onClearSelection={() => setSelectedUsers(new Set())}
          onBulkActivatePlan={async (planId: string) => {
            // TODO: Implement bulk plan activation
            console.log('Bulk activate plan:', planId);
          }}
          onBulkBlockUsers={async () => {
            await handleBulkAction('block', Array.from(selectedUsers));
          }}
          onBulkUnblockUsers={async () => {
            await handleBulkAction('unblock', Array.from(selectedUsers));
          }}
          onBulkChangeRole={async (newRole: string) => {
            // TODO: Implement bulk role change
            console.log('Bulk change role:', newRole);
          }}
          loading={loading}
          subscriptionPlans={[]}
          currentUserRole={currentUser?.role || 'user'}
        />
      )}

      <CloneUserDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        sourceUserId={cloneSourceUserId}
        onSuccess={() => {
          fetchUsers();
        }}
      />

      <SimpleCopyProductsDialog
        open={copyProductsDialogOpen}
        onOpenChange={setCopyProductsDialogOpen}
        sourceUserId={copyProductsSourceUserId}
      />
    </div>
  );
}