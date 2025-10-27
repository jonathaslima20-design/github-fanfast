import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCorretorData } from '@/hooks/useCorretorData';
import { useProductData } from '@/hooks/useProductData';
import { useProductSearch } from '@/hooks/useProductSearch';
import CorretorHeader from '@/components/corretor/CorretorHeader';
import PromotionalBanner from '@/components/corretor/PromotionalBanner';
import ProductSearch from '@/components/product/ProductSearch';
import { ProductCard } from '@/components/product/ProductCard';
import { groupProductsByCategory } from '@/utils/productDisplayUtils';
import ShareCategoryButton from '@/components/corretor/ShareCategoryButton';
import { logCategoryOperation } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { updateMetaTags, getCorretorMetaTags } from '@/utils/metaTags';

export default function CorretorPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  
  // Load corretor data and apply theme/tracking
  const { corretor, loading: corretorLoading, error: corretorError } = useCorretorData({ slug });
  
  // Set language and currency from corretor settings
  const language: SupportedLanguage = corretor?.language || 'pt-BR';
  const currency: SupportedCurrency = corretor?.currency || 'BRL';
  
  const { t } = useTranslation(language);

  // Load product data with pagination
  const {
    allProducts,
    categorySettings,
    settings,
    loading: productsLoading,
    error: productsError,
  } = useProductData({ 
    userId: corretor?.id || '', 
    language
  });

  // Handle product search and filtering
  const {
    filteredProducts,
    isSearchActive,
    filters,
    handleSearch,
  } = useProductSearch({
    allProducts,
    settings
  });

  // Organize products by category
  const organizedProducts = groupProductsByCategory(
    isSearchActive ? filteredProducts : allProducts,
    categorySettings,
    language
  );

  // CRITICAL: Force meta tags update when component renders
  // This ensures WhatsApp preview shows the correct user info
  useEffect(() => {
    if (corretor) {
      const metaConfig = getCorretorMetaTags(corretor, language);
      updateMetaTags(metaConfig);
    }
  }, [corretor, language]);

  // Loading state
  if (corretorLoading || productsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('messages.loading_storefront')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (corretorError || !corretor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">{t('messages.user_not_found')}</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {t('messages.user_not_exists')}
        </p>
        <Button asChild>
          <a href="/">{t('messages.back_to_home')}</a>
        </Button>
      </div>
    );
  }

  logCategoryOperation('CORRETOR_PAGE_RENDER', {
    corretorId: corretor.id,
    corretorName: corretor.name,
    totalProducts: allProducts.length,
    organizedCategories: Object.keys(organizedProducts).length,
    isSearchActive,
    language,
    currency
  });

  return (
    <div className="flex-1">
      {/* Corretor Header with profile info */}
      <CorretorHeader 
        corretor={corretor} 
        language={language}
        currency={currency}
      />

      {/* Promotional Banner */}
      {/* Product Search */}
      <div className="container mx-auto px-4 py-1">
        <ProductSearch
          onFiltersChange={handleSearch}
          products={allProducts}
          currency={currency}
          language={language}
          settings={settings}
        />
      </div>

      {/* Promotional Banner */}
      <div className="mt-6 mb-8">
        <PromotionalBanner corretor={corretor} />
      </div>

      {/* Products Section */}
      <section className="py-2">
        <div className="container mx-auto px-4">
          {productsError ? (
            <Card className="text-center py-12">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('messages.error_loading')}</h2>
                <p className="text-muted-foreground">{productsError}</p>
              </CardContent>
            </Card>
          ) : Object.keys(organizedProducts).length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">
                  {isSearchActive ? t('messages.no_results') : t('messages.no_products')}
                </h2>
                <p className="text-muted-foreground">
                  {isSearchActive 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Este vendedor ainda não possui produtos cadastrados'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-12">
              {Object.entries(organizedProducts).map(([categoryName, products]) => (
                <motion.div
                  key={categoryName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{categoryName}</h2>
                    <div className="flex items-center gap-2">
                      {categoryName !== t('categories.others') && (
                        <ShareCategoryButton
                          corretorSlug={corretor.slug || ''}
                          categoryName={categoryName}
                          language={language}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        corretorSlug={corretor.slug || ''}
                        currency={currency}
                        language={language}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}