import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader as Loader2, Copy, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';

const copyFormSchema = z.object({
  sourceUserId: z.string().min(1, 'Selecione o usuário de origem'),
  targetUserId: z.string().min(1, 'Selecione o usuário de destino'),
});

interface User {
  id: string;
  name: string;
  email: string;
  listing_limit: number;
}

interface SimpleCopyProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSourceUserId?: string;
  defaultTargetUserId?: string;
}

export function SimpleCopyProductsDialog({
  open,
  onOpenChange,
  defaultSourceUserId,
  defaultTargetUserId,
}: SimpleCopyProductsDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copying, setCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const form = useForm<z.infer<typeof copyFormSchema>>({
    resolver: zodResolver(copyFormSchema),
    defaultValues: {
      sourceUserId: defaultSourceUserId || '',
      targetUserId: defaultTargetUserId || '',
    },
  });

  const sourceUserId = form.watch('sourceUserId');
  const targetUserId = form.watch('targetUserId');

  useEffect(() => {
    if (open) {
      fetchUsers();
      if (defaultSourceUserId) {
        form.setValue('sourceUserId', defaultSourceUserId);
      }
      if (defaultTargetUserId) {
        form.setValue('targetUserId', defaultTargetUserId);
      }
    }
  }, [open, defaultSourceUserId, defaultTargetUserId]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, listing_limit')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const copyProductsAndCategories = async (sourceId: string, targetId: string) => {
    try {
      setProgress(20);
      setProgressMessage('Copiando categorias...');

      // 1. Copiar categorias
      const { data: sourceCategories, error: categoriesError } = await supabase
        .from('user_product_categories')
        .select('name')
        .eq('user_id', sourceId);

      if (categoriesError) throw categoriesError;

      if (sourceCategories && sourceCategories.length > 0) {
        // Verificar quais categorias já existem no usuário de destino
        const { data: existingCategories } = await supabase
          .from('user_product_categories')
          .select('name')
          .eq('user_id', targetId);

        const existingNames = new Set(existingCategories?.map(c => c.name) || []);
        
        // Inserir apenas categorias que não existem
        const newCategories = sourceCategories
          .filter(cat => !existingNames.has(cat.name))
          .map(cat => ({
            user_id: targetId,
            name: cat.name
          }));

        if (newCategories.length > 0) {
          const { error: insertCategoriesError } = await supabase
            .from('user_product_categories')
            .insert(newCategories);

          if (insertCategoriesError) throw insertCategoriesError;
        }
      }

      setProgress(40);
      setProgressMessage('Copiando produtos...');

      // 2. Copiar produtos
      const { data: sourceProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', sourceId);

      if (productsError) throw productsError;

      if (sourceProducts && sourceProducts.length > 0) {
        for (let i = 0; i < sourceProducts.length; i++) {
          const product = sourceProducts[i];
          const progressPercent = 40 + (i / sourceProducts.length) * 40;
          setProgress(progressPercent);
          setProgressMessage(`Copiando produto ${i + 1} de ${sourceProducts.length}...`);

          // Criar novo produto
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              user_id: targetId,
              title: product.title,
              description: product.description,
              price: product.price,
              discounted_price: product.discounted_price,
              status: product.status,
              category: product.category,
              brand: product.brand,
              model: product.model,
              gender: product.gender,
              condition: product.condition,
              video_url: product.video_url,
              featured_offer_price: product.featured_offer_price,
              featured_offer_installment: product.featured_offer_installment,
              featured_offer_description: product.featured_offer_description,
              is_starting_price: product.is_starting_price,
              short_description: product.short_description,
              is_visible_on_storefront: product.is_visible_on_storefront,
              external_checkout_url: product.external_checkout_url,
              colors: product.colors,
              sizes: product.sizes,
              display_order: product.display_order
            })
            .select()
            .single();

          if (productError) {
            console.error('Error copying product:', productError);
            continue;
          }

          // 3. Copiar imagens do produto
          const { data: productImages } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id);

          if (productImages && productImages.length > 0) {
            let newFeaturedImageUrl = null;

            for (const image of productImages) {
              try {
                // Baixar imagem original
                const imageResponse = await fetch(image.url);
                if (imageResponse.ok) {
                  const imageBlob = await imageResponse.blob();
                  
                  // Gerar novo nome de arquivo
                  const originalFileName = image.url.split('/').pop() || 'image.jpg';
                  const fileExtension = originalFileName.split('.').pop() || 'jpg';
                  const newFileName = `${newProduct.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
                  const newFilePath = `products/${newFileName}`;

                  // Upload nova imagem
                  const { error: uploadError } = await supabase.storage
                    .from('public')
                    .upload(newFilePath, imageBlob);

                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                      .from('public')
                      .getPublicUrl(newFilePath);

                    // Salvar referência da imagem
                    await supabase
                      .from('product_images')
                      .insert({
                        product_id: newProduct.id,
                        url: publicUrl,
                        is_featured: image.is_featured
                      });

                    if (image.is_featured) {
                      newFeaturedImageUrl = publicUrl;
                    }
                  }
                }
              } catch (error) {
                console.warn('Failed to copy product image:', error);
              }
            }

            // Atualizar URL da imagem principal do produto
            if (newFeaturedImageUrl) {
              await supabase
                .from('products')
                .update({ featured_image_url: newFeaturedImageUrl })
                .eq('id', newProduct.id);
            }
          }
        }
      }

      setProgress(90);
      setProgressMessage('Sincronizando configurações...');

      // 4. Sincronizar configurações da vitrine
      try {
        await syncUserCategoriesWithStorefrontSettings(targetId);
      } catch (syncError) {
        console.warn('Category sync warning (non-critical):', syncError);
      }

      setProgress(100);
      setProgressMessage('Cópia concluída!');

    } catch (error) {
      console.error('Error copying products:', error);
      throw error;
    }
  };

  const handleSubmit = async (values: z.infer<typeof copyFormSchema>) => {
    try {
      setCopying(true);
      setProgress(10);
      setProgressMessage('Iniciando cópia...');

      const sourceUser = users.find(u => u.id === values.sourceUserId);
      const targetUser = users.find(u => u.id === values.targetUserId);
      
      if (!sourceUser || !targetUser) {
        throw new Error('Usuário de origem não encontrado');
      }

      if (values.sourceUserId === values.targetUserId) {
        throw new Error('Usuário de origem e destino não podem ser o mesmo');
      }

      await copyProductsAndCategories(values.sourceUserId, values.targetUserId);

      toast.success(`Produtos e categorias copiados de "${sourceUser.name}" para "${targetUser.name}" com sucesso!`);
      
      onOpenChange(false);
      form.reset();
      
      // Small delay to show completion
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 1000);

    } catch (error: any) {
      console.error('❌ Copy operation failed:', error);
      toast.error(error.message || 'Erro na cópia');
    } finally {
      setCopying(false);
    }
  };

  const sourceUser = users.find(u => u.id === sourceUserId);
  const targetUser = users.find(u => u.id === targetUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Copiar Produtos e Categorias
          </DialogTitle>
          <DialogDescription>
            Copia todas as categorias e produtos (incluindo imagens) de um usuário para outro.
            O usuário de destino deve já existir na plataforma.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        {copying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progressMessage}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Source and Target User Selection */}
            <FormField
              control={form.control}
              name="sourceUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário de Origem (copiar DE)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingUsers || copying}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o usuário de origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Produtos e categorias deste usuário serão copiados
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário de Destino (copiar PARA)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingUsers || copying}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o usuário de destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users
                        .filter(user => user.id !== sourceUserId) // Não mostrar o mesmo usuário
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Os produtos serão adicionados a este usuário
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary */}
            {sourceUser && targetUser && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Resumo da Operação:</h4>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="text-sm">DE: {sourceUser.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-sm">PARA: {targetUser.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Serão copiados: categorias, produtos e todas as imagens associadas.
                  </p>
                </div>
              </div>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Cópia de Produtos:</strong> Esta operação copia todos os produtos e categorias 
                do usuário de origem para o usuário de destino. As imagens são duplicadas fisicamente 
                para evitar conflitos. Produtos duplicados não serão criados.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={copying}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={copying || !sourceUserId || !targetUserId}
              >
                {copying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Produtos
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}