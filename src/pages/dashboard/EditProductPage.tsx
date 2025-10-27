import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DiscountPriceInput } from '@/components/ui/discount-price-input';
import { CategorySelector } from '@/components/ui/category-selector';
import { GenderSelector } from '@/components/ui/gender-selector';
import { SizesColorsSelector } from '@/components/ui/sizes-colors-selector';
import { TieredPricingManager } from '@/components/ui/tiered-pricing-manager';
import { PricingModeToggle } from '@/components/ui/pricing-mode-toggle';
import { ProductImageManager } from '@/components/product/ProductImageManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { uploadImage } from '@/lib/image';
import type { PriceTier } from '@/types';

const productSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  short_description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  is_starting_price: z.boolean().default(false),
  featured_offer_price: z.number().optional(),
  featured_offer_installment: z.number().optional(),
  featured_offer_description: z.string().optional(),
  status: z.enum(['disponivel', 'vendido', 'reservado']).default('disponivel'),
  category: z.array(z.string()).default([]),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['novo', 'usado', 'seminovo']).default('novo'),
  external_checkout_url: z.string().optional(),
  is_visible_on_storefront: z.boolean().default(true),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  has_tiered_pricing: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

type ProductImage = {
  id: string;
  url: string;
  is_featured: boolean;
};

export default function EditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [productImages, setProductImages] = useState<Array<{
    id: string;
    url: string;
    file?: File;
    isFeatured: boolean;
    mediaType: 'image' | 'video';
    videoId?: string;
  }>>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<'simple' | 'tiered'>('simple');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [isPriceTiersValid, setIsPriceTiersValid] = useState(true);
  const [isSizesColorsOpen, setIsSizesColorsOpen] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      short_description: '',
      price: 0,
      is_starting_price: false,
      featured_offer_price: undefined,
      featured_offer_installment: undefined,
      featured_offer_description: '',
      status: 'disponivel',
      category: [],
      brand: '',
      model: '',
      condition: 'novo',
      external_checkout_url: '',
      is_visible_on_storefront: true,
      colors: [],
      sizes: [],
      has_tiered_pricing: false,
    },
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user?.id) return;

      try {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          toast.error('Produto não encontrado');
          navigate('/dashboard/listings');
          return;
        }

        form.reset({
          title: product.title,
          description: product.description,
          short_description: product.short_description || '',
          price: product.price || 0,
          is_starting_price: product.is_starting_price || false,
          featured_offer_price: product.discounted_price ?? undefined,
          featured_offer_installment: product.featured_offer_installment ?? undefined,
          featured_offer_description: product.featured_offer_description || '',
          status: product.status,
          category: product.category || [],
          brand: product.brand || '',
          model: product.model || '',
          condition: product.condition,
          external_checkout_url: product.external_checkout_url || '',
          is_visible_on_storefront: product.is_visible_on_storefront,
          colors: product.colors || [],
          sizes: product.sizes || [],
          has_tiered_pricing: product.has_tiered_pricing || false,
        });

        setPricingMode(product.has_tiered_pricing ? 'tiered' : 'simple');

        const allImages: Array<{
          id: string;
          url: string;
          file?: File;
          isFeatured: boolean;
          mediaType: 'image' | 'video';
          videoId?: string;
        }> = [];

        if (product.featured_image_url) {
          allImages.push({
            id: 'featured-existing',
            url: product.featured_image_url,
            isFeatured: true,
            mediaType: 'image'
          });
        }

        const { data: images, error: imagesError } = await supabase
          .from('product_images')
          .select('id, url, is_featured, media_type, display_order')
          .eq('product_id', id)
          .order('display_order', { ascending: true });

        if (imagesError) throw imagesError;
        if (images) {
          images.forEach(img => {
            if (img.media_type === 'video') {
              const videoId = img.url.split('/').pop() || '';
              allImages.push({
                id: img.id,
                url: img.url,
                isFeatured: false,
                mediaType: 'video',
                videoId
              });
            } else {
              allImages.push({
                id: img.id,
                url: img.url,
                isFeatured: false,
                mediaType: 'image'
              });
            }
          });
        }

        setProductImages(allImages);

        if (product.has_tiered_pricing) {
          const { data: tiers, error: tiersError } = await supabase
            .from('product_price_tiers')
            .select('*')
            .eq('product_id', id)
            .order('min_quantity');

          if (tiersError) throw tiersError;
          if (tiers) {
            setPriceTiers(tiers.map(tier => ({
              id: tier.id,
              min_quantity: tier.min_quantity,
              max_quantity: tier.max_quantity,
              unit_price: parseFloat(tier.unit_price),
              discounted_unit_price: tier.discounted_unit_price ? parseFloat(tier.discounted_unit_price) : null,
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Erro ao carregar produto');
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [id, user?.id, navigate, form]);

  const handleImagesChange = (newImages: Array<{
    id: string;
    url: string;
    file?: File;
    isFeatured: boolean;
    mediaType: 'image' | 'video';
    videoId?: string;
  }>) => {
    const currentImageIds = new Set(productImages.map(img => img.id));
    const newImageIds = new Set(newImages.map(img => img.id));

    currentImageIds.forEach(id => {
      if (!newImageIds.has(id) && id !== 'featured-existing' && !id.startsWith('new-') && !id.startsWith('video-')) {
        setImagesToDelete(prev => [...prev, id]);
      }
    });

    setProductImages(newImages);
  };

  const onSubmit = async (data: ProductFormData) => {
    console.log('onSubmit called with data:', data);
    if (!user?.id || !id) {
      console.error('Missing user ID or product ID');
      return;
    }

    if (pricingMode === 'tiered' && priceTiers.length === 0) {
      toast.error('Adicione pelo menos um nível de preço');
      return;
    }

    if (pricingMode === 'tiered' && !isPriceTiersValid) {
      toast.error('Por favor, corrija os erros nos níveis de preço antes de salvar');
      return;
    }

    setLoading(true);
    try {
      const featuredImage = productImages.find(img => img.isFeatured);
      let featuredImageUrl = featuredImage?.url || '';

      if (featuredImage?.file) {
        const uploadResult = await uploadImage(featuredImage.file, user.id, 'product');
        if (uploadResult) {
          featuredImageUrl = uploadResult;
        }
      }

      const productData = {
        title: data.title,
        description: data.description,
        short_description: data.short_description || '',
        price: pricingMode === 'simple' ? data.price : 0,
        discounted_price: data.featured_offer_price || null,
        is_starting_price: data.is_starting_price,
        featured_offer_price: data.featured_offer_price || null,
        featured_offer_installment: data.featured_offer_installment || null,
        featured_offer_description: data.featured_offer_description || '',
        status: data.status,
        category: data.category.length > 0 ? data.category : ['Sem Categoria'],
        brand: data.brand || '',
        model: data.model || '',
        condition: data.condition,
        featured_image_url: featuredImageUrl,
        external_checkout_url: data.external_checkout_url || '',
        is_visible_on_storefront: data.is_visible_on_storefront,
        colors: data.colors,
        sizes: data.sizes,
        has_tiered_pricing: pricingMode === 'tiered',
      };

      const { error: productError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (productError) throw productError;

      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .in('id', imagesToDelete);

        if (deleteError) throw deleteError;
      }

      const newMedia = productImages.filter(img => !img.isFeatured && (img.file || img.mediaType === 'video'));

      if (newMedia.length > 0) {
        const mediaRecords = await Promise.all(
          newMedia.map(async (item, index) => {
            if (item.mediaType === 'video') {
              return {
                product_id: id,
                url: item.url,
                is_featured: false,
                media_type: 'video',
                display_order: index + 1
              };
            } else if (item.file) {
              const url = await uploadImage(item.file, user.id, 'product');
              if (url) {
                return {
                  product_id: id,
                  url: url,
                  is_featured: false,
                  media_type: 'image',
                  display_order: index + 1
                };
              }
            }
            return null;
          })
        );

        const validRecords = mediaRecords.filter(record => record !== null);

        if (validRecords.length > 0) {
          const { error: mediaError } = await supabase
            .from('product_images')
            .insert(validRecords);

          if (mediaError) throw mediaError;
        }
      }

      if (pricingMode === 'tiered') {
        const { error: deleteOldTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteOldTiersError) throw deleteOldTiersError;

        if (priceTiers.length > 0) {
          const sortedTiers = [...priceTiers].sort((a, b) => a.min_quantity - b.min_quantity);

          const tierRecords = sortedTiers.map((tier, index, array) => {
            const isLastTier = index === array.length - 1;
            const nextTier = !isLastTier ? array[index + 1] : null;

            const maxQuantity = isLastTier
              ? null
              : nextTier
                ? nextTier.min_quantity - 1
                : null;

            return {
              product_id: id,
              min_quantity: tier.min_quantity,
              max_quantity: maxQuantity,
              unit_price: tier.unit_price,
              discounted_unit_price: tier.discounted_unit_price,
            };
          });

          const { error: tiersError } = await supabase
            .from('product_price_tiers')
            .insert(tierRecords);

          if (tiersError) throw tiersError;
        }
      } else {
        const { error: deleteAllTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteAllTiersError) throw deleteAllTiersError;
      }

      toast.success('Produto atualizado com sucesso!');
      navigate('/dashboard/listings');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Produto</h1>
          <p className="text-muted-foreground">Atualize as informações do produto</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
          console.log('Form submit event triggered');
          console.log('Current form values:', form.getValues());
          console.log('Form errors:', form.formState.errors);
          form.handleSubmit(onSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            toast.error('Por favor, corrija os erros no formulário');
          })(e);
        }} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tênis Nike Air Max 90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <CategorySelector
                        value={field.value}
                        onChange={field.onChange}
                        userId={user?.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Nike" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <FormControl>
                        <GenderSelector
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Collapsible open={isSizesColorsOpen} onOpenChange={setIsSizesColorsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle>Tamanhos e Cores</CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isSizesColorsOpen ? 'transform rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <SizesColorsSelector
                    colors={form.watch('colors')}
                    onColorsChange={(colors) => form.setValue('colors', colors)}
                    sizes={form.watch('sizes')}
                    onSizesChange={(sizes) => form.setValue('sizes', sizes)}
                    userId={user?.id}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PricingModeToggle
                isTieredPricing={pricingMode === 'tiered'}
                onModeChange={(useTieredPricing) => {
                  setPricingMode(useTieredPricing ? 'tiered' : 'simple');
                  form.setValue('has_tiered_pricing', useTieredPricing);
                }}
                hasSinglePriceData={form.watch('price') > 0}
                hasTieredPriceData={priceTiers.length > 0}
              />

              {pricingMode === 'simple' ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço original do produto *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormDescription>
                          Preço de venda do produto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured_offer_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço promocional (deve ser menor que o preço original)</FormLabel>
                        <FormControl>
                          <DiscountPriceInput
                            value={field.value}
                            onChange={field.onChange}
                            originalPrice={form.watch('price')}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Preço promocional opcional. Se preenchido, será exibido como oferta especial.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_starting_price"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Preço inicial</FormLabel>
                          <FormDescription>
                            Marque esta opção se o preço informado é um valor inicial ("A partir de")
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <TieredPricingManager
                  tiers={priceTiers}
                  onChange={setPriceTiers}
                  onValidationChange={setIsPriceTiersValid}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frase Promocional e Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frase Promocional (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Em até 4x nos cartões ou 10%OFF no Pix" {...field} />
                    </FormControl>
                    <FormDescription>
                      Uma frase curta para destacar promoções ou condições especiais
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Completa *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                        placeholder="Descreva seu produto em detalhes..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductImageManager
                images={productImages}
                onChange={handleImagesChange}
                maxImages={10}
                maxFileSize={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="external_checkout_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Externo de Compra</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Se preenchido, o botão de compra redirecionará para este link externo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_visible_on_storefront"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visível na Vitrine</FormLabel>
                      <FormDescription>
                        Mostrar este produto na sua vitrine pública
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('Button clicked', { loading, formValid: form.formState.isValid });
              }}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
