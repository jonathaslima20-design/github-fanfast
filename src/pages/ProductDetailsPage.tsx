import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Share2, ArrowLeft, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation, formatCurrencyI18n, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { updateMetaTags, updateFavicon, getProductMetaTags, resetMetaTags } from '@/utils/metaTags';
import { loadTrackingSettings, injectMetaPixel, injectGoogleAnalytics, trackView } from '@/lib/tracking';
import { useTieredPricing } from '@/hooks/useTieredPricing';
import ImageGallery from '@/components/details/ImageGallery';
import ItemDescription from '@/components/details/ItemDescription';
import ContactSidebar from '@/components/details/ContactSidebar';
import TieredPricingTable from '@/components/details/TieredPricingTable';
import QuickPurchasePanel from '@/components/details/QuickPurchasePanel';
import type { Product } from '@/types';

export default function ProductDetailsPage() {
  const { slug, productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [corretor, setCorretor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');

  const { theme } = useTheme();
  const { t } = useTranslation(language);
  const { addToCart, getItemQuantity } = useCart();

  const { tiers: priceTiers, loading: loadingTiers } = useTieredPricing(
    product?.id,
    product?.price || 0,
    product?.discounted_price,
    product?.has_tiered_pricing
  );

  useEffect(() => {
    setShareSupported(!!navigator.share && window.isSecureContext);

    const fetchProductDetails = async () => {
      try {
        if (!productId) {
          setError("ID do produto não encontrado");
          return;
        }

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            product_images (
              id,
              url,
              is_featured,
              media_type,
              display_order
            )
          `)
          .eq('id', productId)
          .order('is_featured', { referencedTable: 'product_images', ascending: false })
          .order('display_order', { referencedTable: 'product_images', ascending: true })
          .single();

        if (productError) throw productError;
        if (!productData) {
          setError("Produto não encontrado");
          return;
        }

        setProduct(productData);

        const { data: corretorData, error: corretorError } = await supabase
          .from('users')
          .select('*')
          .eq('id', productData.user_id)
          .single();

        if (corretorError) throw corretorError;
        setCorretor(corretorData);

        const currentLanguage = corretorData.language || 'pt-BR';
        const metaConfig = getProductMetaTags(productData, corretorData, currentLanguage);
        updateMetaTags(metaConfig);

        const faviconUrl = productData.featured_image_url || corretorData.avatar_url || 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';
        updateFavicon(faviconUrl);

        setLanguage(currentLanguage);
        setCurrency(corretorData.currency || 'BRL');

        if (corretorData) {
          if (corretorData.theme) {
            document.documentElement.className = corretorData.theme;
          }

          const trackingSettings = await loadTrackingSettings(corretorData.id);

          if (trackingSettings?.meta_pixel_id) {
            injectMetaPixel(trackingSettings.meta_pixel_id);
          }

          if (trackingSettings?.ga_measurement_id) {
            injectGoogleAnalytics(trackingSettings.ga_measurement_id);
          }
        }

        await trackView(productId, 'product');

      } catch (err) {
        console.error('Error fetching product details:', err);
        setError("Erro ao carregar os dados do produto");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();

    return () => {
      try {
        resetMetaTags();
        document.documentElement.classList.remove('light', 'dark');
      } catch (e) {
        console.error('Error cleaning up styles:', e);
      }
    };
  }, [productId]);

  const handleShareClick = async () => {
    const shareUrl = window.location.href;
    const shareTitle = product?.title || 'Produto';
    const shareText = `Confira este produto: ${product?.title}`;

    try {
      if (shareSupported) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Compartilhado com sucesso!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado para a área de transferência');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(t('messages.link_copied'));
        } catch (err) {
          toast.error(t('messages.share_failed'));
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vendido':
        return <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-sm">{t('status.sold')}</Badge>;
      case 'reservado':
        return <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-sm">{t('status.reserved')}</Badge>;
      default:
        return null;
    }
  };

  const handleAddToCart = (
    quantity: number,
    distributionItems: Array<{ id: string; color?: string; size?: string; quantity: number }>
  ) => {
    if (!product) return;

    let unitPrice: number | undefined = undefined;

    if (product.has_tiered_pricing && priceTiers.length > 0) {
      const sortedTiers = [...priceTiers].sort((a, b) => a.min_quantity - b.min_quantity);
      const applicableTier = sortedTiers
        .filter(tier => quantity >= tier.min_quantity && (!tier.max_quantity || quantity <= tier.max_quantity))
        .pop();

      if (applicableTier) {
        unitPrice = applicableTier.discounted_unit_price || applicableTier.unit_price;
      }
    }

    if (distributionItems.length > 0) {
      distributionItems.forEach(item => {
        addToCart(product, item.color, item.size, item.quantity, unitPrice);
      });
      toast.success(`${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho`);
    } else {
      addToCart(product, undefined, undefined, quantity, unitPrice);
      toast.success(`${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product || !corretor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">
          {error || "Erro ao carregar os dados do produto"}
        </p>
        <Button asChild>
         <Link to={slug ? `/${slug}` : "/"}>{t('header.back_to_storefront')}</Link>
        </Button>
      </div>
    );
  }

  const galleryMedia = product.product_images?.length
    ? product.product_images.map((img: any) => ({
        id: img.id,
        url: img.url,
        is_featured: img.is_featured,
        media_type: img.media_type || 'image'
      }))
    : [{
        id: 'default',
        url: product.featured_image_url || "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg",
        is_featured: true,
        media_type: 'image' as const
      }];

  const hasDiscount = product.discounted_price && product.discounted_price < product.price;

  const minimumTieredPrice = priceTiers.length > 0 && product.has_tiered_pricing
    ? Math.min(...priceTiers.map(tier => tier.discounted_unit_price || tier.unit_price))
    : null;

  const isTieredPricing = product.has_tiered_pricing && minimumTieredPrice && minimumTieredPrice > 0;
  const displayPrice = isTieredPricing ? minimumTieredPrice : (hasDiscount ? product.discounted_price : product.price);
  const originalPrice = hasDiscount ? product.price : null;
  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.discounted_price) / product.price) * 100)
    : null;

  const totalInCart = getItemQuantity(product.id);
  const isAvailable = product.status === 'disponivel';
  const hasPrice = product.price && product.price > 0;

  return (
    <div className="flex-1">
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" asChild className="pl-0 hover:pl-1 transition-all">
          <Link to={`/${slug}`} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('header.back_to_storefront')}
          </Link>
        </Button>
      </div>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            <motion.div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-3">
                    {product.category && product.category.length > 0 && (
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-primary/20">
                        {product.category[0]}
                      </Badge>
                    )}
                    {hasDiscount && discountPercentage && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">
                        -{discountPercentage}% OFF
                      </Badge>
                    )}
                    {product.status !== 'disponivel' && getStatusBadge(product.status)}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShareClick}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-6 mb-8">
                {loadingTiers && product.has_tiered_pricing ? (
                  <div className="text-lg font-bold text-muted-foreground animate-pulse">
                    Carregando preços...
                  </div>
                ) : isTieredPricing ? (
                  <div className="space-y-2">
                    {hasDiscount && originalPrice && originalPrice > 0 && (
                      <div className="text-lg text-muted-foreground line-through">
                        {formatCurrencyI18n(originalPrice, currency, language)}
                      </div>
                    )}
                    <div className="text-3xl font-bold text-primary">
                      {t('product.starting_from')} {formatCurrencyI18n(minimumTieredPrice!, currency, language)}
                    </div>
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                ) : hasDiscount ? (
                  <div className="space-y-2">
                    <div className="text-lg text-muted-foreground line-through">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(originalPrice!, currency, language)}
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(displayPrice!, currency, language)}
                    </div>
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(displayPrice!, currency, language)}
                    </div>
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                )}

                {product.featured_offer_price && product.featured_offer_installment && (
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      {t('product.special_offer')}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg">
                        {t('product.down_payment')} {formatCurrencyI18n(product.featured_offer_price, currency, language)}
                      </p>
                      <p className="text-lg">
                        {t('product.installments')} {formatCurrencyI18n(product.featured_offer_installment, currency, language)}
                      </p>
                      {product.featured_offer_description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {product.featured_offer_description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ImageGallery
                media={galleryMedia}
                title={product.title}
              />

              {isAvailable && hasPrice && (
                <div className="mt-8">
                  <QuickPurchasePanel
                    product={product}
                    priceTiers={priceTiers}
                    currency={currency}
                    language={language}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              )}

              {isAvailable && hasPrice && product.has_tiered_pricing && priceTiers.length > 0 && (
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <TieredPricingTable
                    tiers={priceTiers}
                    basePrice={product.price}
                    baseDiscountedPrice={product.discounted_price}
                    currency={currency}
                    language={language}
                  />
                </motion.div>
              )}

              {isAvailable && product.external_checkout_url && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={product.external_checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Comprar
                    </a>
                  </Button>
                </div>
              )}

              {totalInCart > 0 && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 text-center">
                    {totalInCart} {totalInCart === 1 ? 'item' : 'itens'} no carrinho
                  </p>
                </div>
              )}

              <div className="mt-8">
                <ItemDescription description={product.description} isRichText={true} />
              </div>
            </motion.div>

            <motion.div
              className="w-full md:w-80 lg:w-96"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ContactSidebar
                corretor={corretor}
                itemId={product.id}
                itemTitle={product.title}
                itemType="produto"
                createdAt={product.created_at}
                itemImageUrl={product.featured_image_url}
                language={language}
              />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
