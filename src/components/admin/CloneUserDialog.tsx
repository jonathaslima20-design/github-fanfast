import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader as Loader2, Copy, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { cloneUserComplete } from '@/lib/adminApi';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

const cloneUserFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface CloneUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUserId: string;
  onSuccess?: (newUserId: string) => void;
}

export function CloneUserDialog({
  open,
  onOpenChange,
  sourceUserId,
  onSuccess
}: CloneUserDialogProps) {
  const [sourceUser, setSourceUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof cloneUserFormSchema>>({
    resolver: zodResolver(cloneUserFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      slug: '',
    },
  });

  useEffect(() => {
    if (open && sourceUserId) {
      fetchSourceUser();
    }
  }, [open, sourceUserId]);

  const fetchSourceUser = async () => {
    try {
      setLoadingUser(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, role')
        .eq('id', sourceUserId)
        .single();

      if (error) throw error;
      setSourceUser(data);
    } catch (error) {
      console.error('Error fetching source user:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoadingUser(false);
    }
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCloneUser = async (values: z.infer<typeof cloneUserFormSchema>) => {
    if (!sourceUser) return;

    try {
      setCloning(true);

      console.log('Starting user cloning process...');
      
      const { newUserId } = await cloneUserComplete(sourceUser.id, {
        email: values.email,
        password: values.password,
        name: values.name,
        slug: values.slug,
      });

      console.log('User cloned successfully, syncing categories...');
      
      // Sync categories for the new user
      try {
        await syncUserCategoriesWithStorefrontSettings(newUserId);
        console.log('Categories synced successfully');
      } catch (syncError) {
        console.warn('Category sync warning (non-critical):', syncError);
      }

      toast.success('Usuário clonado com sucesso! Todos os dados, configurações e imagens foram copiados.');
      onOpenChange(false);
      form.reset();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(newUserId);
      }
      
    } catch (error: any) {
      console.error('Error cloning user:', error);
      toast.error('Erro ao clonar usuário: ' + error.message);
    } finally {
      setCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Clonar Usuário
          </DialogTitle>
          <DialogDescription>
            Criar uma cópia completa do usuário incluindo perfil, produtos, categorias e imagens
          </DialogDescription>
        </DialogHeader>

        {/* Source User Info */}
        {loadingUser ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sourceUser ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={sourceUser.avatar_url} alt={sourceUser.name} />
                <AvatarFallback>{getInitials(sourceUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Clonando de:</div>
                <div className="text-sm text-muted-foreground">{sourceUser.name}</div>
                <div className="text-xs text-muted-foreground">{sourceUser.email}</div>
              </div>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCloneUser)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome do novo usuário" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Auto-generate slug from name
                        if (!form.getValues('slug')) {
                          const slug = generateSlugFromName(e.target.value);
                          form.setValue('slug', slug);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="email@exemplo.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link da Vitrine</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground mr-2">vitrineturbo.com/</span>
                      <Input placeholder="novo-usuario" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    URL única para a vitrine do novo usuário
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Senha do novo usuário"
                        {...field} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirme a senha"
                        {...field} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>O que será clonado:</strong>
                <br />• Perfil completo (avatar, capas, banners)
                <br />• Todas as categorias
                <br />• Todos os produtos e suas imagens
                <br />• Configurações da vitrine
                <br />• Configurações de rastreamento
                <br /><br />
                <strong>Atenção:</strong> O processo pode levar alguns minutos para ser concluído.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={cloning}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={cloning || loadingUser}>
                {cloning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cloning ? 'Clonando...' : 'Clonar Usuário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}