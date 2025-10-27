import type { Product, CategoryDisplaySetting } from '@/types';
import { sanitizeCategoryName } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage } from '@/lib/i18n';

export interface ProductFilters {
  query?: string;
  status?: string;
  category?: string;
  brand?: string;
  gender?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Utility functions for product display and organization
 */

export interface ProductsByCategory {
  [categoryName: string]: Product[];
}

export interface CategoryInfo {
  name: string;
  count: number;
  enabled: boolean;
  order: number;
}

/**
 * Groups products by their categories
 */
export function groupProductsByCategory(
  products: Product[], 
  categorySettings: CategoryDisplaySetting[] = [],
  language: SupportedLanguage = 'pt-BR'
): ProductsByCategory {
  const grouped: ProductsByCategory = {};
  
  // Create a map of enabled categories for quick lookup
  const enabledCategoriesMap = new Map(
    categorySettings
      .filter(setting => setting.enabled)
      .map(setting => [setting.category, setting])
  );
  
  // Sort category settings by order for consistent display
  const sortedCategorySettings = categorySettings
    .filter(setting => setting.enabled)
    .sort((a, b) => a.order - b.order);
  
  products.forEach(product => {
    if (product.category && Array.isArray(product.category)) {
      product.category.forEach(cat => {
        const sanitized = sanitizeCategoryName(cat);
        if (sanitized && enabledCategoriesMap.has(sanitized)) {
          if (!grouped[sanitized]) {
            grouped[sanitized] = [];
          }
          grouped[sanitized].push(product);
        }
      });
    } else {
      // Products without categories go to "Others" category
      const othersLabel = language === 'en-US' ? 'Others' : 
                         language === 'es-ES' ? 'Otros' : 'Outros';
      if (!grouped[othersLabel]) {
        grouped[othersLabel] = [];
      }
      grouped[othersLabel].push(product);
    }
  });
  
  // Return categories in the order specified by settings
  const orderedGrouped: ProductsByCategory = {};
  
  // First, add categories in their configured order
  sortedCategorySettings.forEach(setting => {
    if (grouped[setting.category]) {
      orderedGrouped[setting.category] = grouped[setting.category];
    }
  });
  
  // Then add "Others" category at the end if it exists
  const othersLabel = language === 'en-US' ? 'Others' : 
                     language === 'es-ES' ? 'Otros' : 'Outros';
  if (grouped[othersLabel]) {
    orderedGrouped[othersLabel] = grouped[othersLabel];
  }
  
  return orderedGrouped;
}

/**
 * Gets category information with counts and settings
 */
export function getCategoryInfo(
  products: Product[], 
  categorySettings: CategoryDisplaySetting[]
): CategoryInfo[] {
  const grouped = groupProductsByCategory(products);
  const categories: CategoryInfo[] = [];
  
  // Create a map of category settings for quick lookup
  const settingsMap = new Map(
    categorySettings.map(setting => [setting.category, setting])
  );
  
  Object.entries(grouped).forEach(([categoryName, categoryProducts]) => {
    const setting = settingsMap.get(categoryName);
    
    categories.push({
      name: categoryName,
      count: categoryProducts.length,
      enabled: setting?.enabled ?? true,
      order: setting?.order ?? 999
    });
  });
  
  // Sort by order, then by name
  return categories.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Enhanced filterProducts function that returns both filtered products and search state
 */
export function filterProducts(
  products: Product[],
  filters: ProductFilters,
  settings: any
): { filteredProducts: Product[]; isSearchActive: boolean } {
  // Check if any filters are active (excluding defaults)
  const isSearchActive = !!(
    filters.query ||
    (filters.status && filters.status !== 'todos') ||
    (filters.category && filters.category !== 'todos') ||
    (filters.brand && filters.brand !== 'todos') ||
    (filters.gender && filters.gender !== 'todos') ||
    (filters.condition && filters.condition !== 'todos') ||
    (filters.minPrice && filters.minPrice !== (settings?.priceRange?.minPrice || 10)) ||
    (filters.maxPrice && filters.maxPrice !== (settings?.priceRange?.maxPrice || 5000))
  );

  const filteredProducts = products.filter(product => {
    // Search filter
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      const searchableText = [
        product.title,
        product.short_description,
        product.brand,
        product.model,
        ...(product.category || [])
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    // Category filter
    if (filters.category && filters.category !== 'todos') {
      if (!product.category || !Array.isArray(product.category)) {
        return filters.category === 'Outros';
      }
      
      const hasCategory = product.category.some(cat => 
        sanitizeCategoryName(cat) === filters.category
      );
      
      if (!hasCategory) {
        return false;
      }
    }
    
    // Price range filter
    const productPrice = product.discounted_price || product.price;
    if (filters.minPrice !== undefined && productPrice < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && productPrice > filters.maxPrice) {
      return false;
    }
    
    // Brand filter
    if (filters.brand && filters.brand !== 'todos') {
      if (product.brand !== filters.brand) {
        return false;
      }
    }
    
    // Gender filter
    if (filters.gender && filters.gender !== 'todos') {
      if (product.gender !== filters.gender) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status !== 'todos') {
      if (product.status !== filters.status) {
        return false;
      }
    }
    
    // Condition filter
    if (filters.condition && filters.condition !== 'todos') {
      if (product.condition !== filters.condition) {
        return false;
      }
    }
    
    return true;
  });

  return { filteredProducts, isSearchActive };
}

/**
 * Sorts products based on specified criteria
 */
export function sortProducts(
  products: Product[],
  sortBy: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'display-order'
): Product[] {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = a.discounted_price || a.price;
        const priceB = b.discounted_price || b.price;
        return priceA - priceB;
      });
      
    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = a.discounted_price || a.price;
        const priceB = b.discounted_price || b.price;
        return priceB - priceA;
      });
      
    case 'name-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
      
    case 'name-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
      
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
    case 'display-order':
      return sorted.sort((a, b) => {
        // Products with display_order come first, sorted by order
        if (a.display_order !== null && b.display_order !== null) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== null) return -1;
        if (b.display_order !== null) return 1;
        
        // Then by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
    default:
      return sorted;
  }
}

/**
 * Gets unique values for filter options
 */
export function getFilterOptions(products: Product[]) {
  const brands = new Set<string>();
  const genders = new Set<string>();
  const conditions = new Set<string>();
  const statuses = new Set<string>();
  
  products.forEach(product => {
    if (product.brand) brands.add(product.brand);
    if (product.gender) genders.add(product.gender);
    if (product.condition) conditions.add(product.condition);
    if (product.status) statuses.add(product.status);
  });
  
  return {
    brands: Array.from(brands).sort(),
    genders: Array.from(genders).sort(),
    conditions: Array.from(conditions).sort(),
    statuses: Array.from(statuses).sort()
  };
}

/**
 * Calculates price statistics for products
 */
export function getPriceStats(products: Product[]) {
  if (products.length === 0) {
    return { min: 0, max: 1000, avg: 0 };
  }
  
  const prices = products.map(p => p.discounted_price || p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  return { min, max, avg };
}

/**
 * Parses URL search parameters into ProductFilters
 */
export function parseUrlFilters(searchParams: URLSearchParams, settings: any): ProductFilters {
  const filters: ProductFilters = {
    query: searchParams.get('query') || '',
    status: searchParams.get('status') || 'todos',
    category: searchParams.get('category') || 'todos',
    brand: searchParams.get('brand') || 'todos',
    gender: searchParams.get('gender') || 'todos',
    condition: searchParams.get('condition') || 'todos'
  };

  // Parse price range with defaults from settings
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  
  filters.minPrice = minPriceParam ? 
    parseInt(minPriceParam, 10) : 
    (settings?.priceRange?.minPrice || 10);
    
  filters.maxPrice = maxPriceParam ? 
    parseInt(maxPriceParam, 10) : 
    (settings?.priceRange?.maxPrice || 5000);

  return filters;
}