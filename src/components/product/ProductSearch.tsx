import { useState } from 'react';
import { useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import { sanitizeCategoryName, categoriesEqual, normalizeCategoryNameForComparison, logCategoryOperation } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';

interface ProductSearchProps {
  onFiltersChange?: (filters: ProductFilters) => void;
  products: Product[];
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
  settings?: {
    showSearch?: boolean;
    showPriceRange?: boolean;
    showCategories?: boolean;
    showBrands?: boolean;
    showGender?: boolean;
    showFilters?: boolean;
    showStatus?: boolean;
    showCondition?: boolean;
    priceRange?: {
      minPrice?: number;
      maxPrice?: number;
    };
  };
}

export interface ProductFilters {
  query: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  category: string;
  brand: string;
  gender: string;
  condition: string;
}

export default function ProductSearch({ onFiltersChange, products, currency = 'BRL', language = 'pt-BR', settings = {} }: ProductSearchProps) {
  const { t } = useTranslation(language);
  
  console.log('🔍 PRODUCT SEARCH CURRENCY/LANGUAGE:', {
    currency,
    language,
    settings
  });
  
  // Provide default function to prevent undefined errors
  const handleFiltersChange = onFiltersChange || (() => {});

  // Use configured price range or default values
  const configuredMinPrice = settings.priceRange?.minPrice || 10;
  const configuredMaxPrice = settings.priceRange?.maxPrice || 5000;

  const initialFilters: ProductFilters = {
    query: '',
    status: 'todos',
    minPrice: configuredMinPrice,
    maxPrice: configuredMaxPrice,
    category: 'todos',
    brand: 'todos',
    gender: 'todos',
    condition: 'todos'
  };

  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [priceRange, setPriceRange] = useState<[number, number]>([configuredMinPrice, configuredMaxPrice]);
  const [isOpen, setIsOpen] = useState(false);

  // Default settings if not provided
  const {
    showSearch = true,
    showPriceRange = true,
    showCategories = true,
    showBrands = true,
    showGender = true,
    showFilters = true,
    showStatus = true,
    showCondition = true
  } = settings;

  // Get unique categories from products
  const categoriesMap = new Map<string, string>(); // normalized -> original
  products
    .map(product => product.category)
    .filter(Boolean)
    .flat()
    .forEach(cat => {
      const sanitized = sanitizeCategoryName(cat);
      if (sanitized) {
        const normalized = normalizeCategoryNameForComparison(sanitized);
        if (!categoriesMap.has(normalized)) {
          categoriesMap.set(normalized, sanitized);
        }
      }
    });
  
  const categories = Array.from(categoriesMap.values()).sort();

  // Get unique brands from products
  const brands = [...new Set(products
    .map(product => product.brand)
    .filter(Boolean)
  )].sort();

  // Get unique genders from products
  const genders = [...new Set(products
    .map(product => product.gender)
    .filter(Boolean)
  )].sort();

  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1]
    };
    handleFiltersChange(updatedFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      ...initialFilters,
      minPrice: configuredMinPrice,
      maxPrice: configuredMaxPrice
    };
    setFilters(resetFilters);
    setPriceRange([configuredMinPrice, configuredMaxPrice]);
    handleFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const handlePriceRangeChange = (newRange: number[]) => {
    setPriceRange([newRange[0], newRange[1]]);
    
    // Update filters immediately for real-time search
    const updatedFilters = {
      ...filters,
      minPrice: newRange[0],
      maxPrice: newRange[1]
    };
    setFilters(updatedFilters);
    handleFiltersChange(updatedFilters);
  };

  // Helper function to handle search with proper filters
  const onSearch = (searchFilters: ProductFilters) => {
    handleFiltersChange(searchFilters);
  };

  // If filters are disabled, don't render the component
  if (!showFilters) return null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('header.search_placeholder')}
              value={filters.query}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, query: e.target.value }));
                onSearch({ ...filters, query: e.target.value, minPrice: priceRange[0], maxPrice: priceRange[1] });
              }}
              className="pl-9"
            />
          </div>
        )}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t('header.filters')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('header.filters')}</SheetTitle>
              <SheetDescription>
                {t('filters.refine_search')}
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              {showStatus && (
                <Tabs 
                  value={filters.status} 
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, status: value }));
                    handleFiltersChange({ ...filters, status: value, minPrice: priceRange[0], maxPrice: priceRange[1] });
                  }}
                  className="w-full"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="todos" className="flex-1">{t('filters.all_status')}</TabsTrigger>
                    <TabsTrigger value="disponivel" className="flex-1">{t('status.available')}</TabsTrigger>
                    <TabsTrigger value="vendido" className="flex-1">{t('status.sold')}</TabsTrigger>
                    <TabsTrigger value="reservado" className="flex-1">{t('status.reserved')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {showGender && genders.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.gender')}</Label>
                  <Select
                    value={filters.gender}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.gender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_genders')}</SelectItem>
                      {genders.map(gender => (
                        <SelectItem key={gender} value={gender}>
                          {gender === 'masculino' ? t('gender.masculine') : 
                           gender === 'feminino' ? t('gender.feminine') : t('gender.unisex')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCategories && categories.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.category')}</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_categories')}</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showBrands && brands.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.brand')}</Label>
                  <Select
                    value={filters.brand}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, brand: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.brand')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_brands')}</SelectItem>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCondition && (
                <div className="space-y-2">
                  <Label>{t('filters.condition')}</Label>
                  <Select
                    value={filters.condition}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.condition')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_conditions')}</SelectItem>
                      <SelectItem value="novo">{t('condition.new')}</SelectItem>
                      <SelectItem value="seminovo">{t('condition.semi_new')}</SelectItem>
                      <SelectItem value="usado">{t('condition.used')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Faixa de Preço - Movido para o final */}
              {showPriceRange && (
                <div className="space-y-4">
                  <Label>{t('filters.price_range')}</Label>
                  <div className="px-2">
                    <Slider
                      min={configuredMinPrice}
                      max={configuredMaxPrice}
                      step={10}
                      value={priceRange}
                      onValueChange={handlePriceRangeChange}
                    />
                    <div className="flex justify-between mt-3 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {formatCurrency(priceRange[0], currency, language)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('filters.minimum')}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {formatCurrency(priceRange[1], currency, language)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('filters.maximum')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={handleReset}>
                {t('filters.clear_filters')}
              </Button>
              <Button onClick={handleSearch}>
                {t('filters.apply_filters')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}