import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';
import { productService } from '@/services/productService';
import { mapDatabaseProductsToProducts } from '@/utils/productMapper';
import { menu as fallbackMenu, categories as fallbackCategories } from '@/data/menu';

export type CategoryFilterItem = {
  id: string;
  label: string;
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryFilterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch categories & products concurrently from Supabase
      const [catsResponse, prodsResponse] = await Promise.all([
        productService.getActiveCategories(),
        productService.getActiveProducts(),
      ]);

      if (catsResponse.error || prodsResponse.error) {
        const errMsg =
          catsResponse.error?.message ||
          prodsResponse.error?.message ||
          'Failed to load products from database.';
        console.warn('Supabase product fetch issue, falling back to static menu:', errMsg);
        // Fallback gracefully to static menu if Supabase query encountered an issue
        setProducts(fallbackMenu);
        setCategories(fallbackCategories);
        setError(errMsg);
        return;
      }

      const dbProducts = prodsResponse.data || [];
      const dbCategories = catsResponse.data || [];

      // If database has records, use the Supabase data
      if (dbProducts.length > 0) {
        const mappedProducts = mapDatabaseProductsToProducts(dbProducts);
        setProducts(mappedProducts);

        // Build category items from DB categories
        if (dbCategories.length > 0) {
          const mappedCats: CategoryFilterItem[] = [
            { id: 'ALL', label: 'All' },
            ...dbCategories.map((c) => ({
              id: c.name,
              label: c.name,
            })),
          ];
          setCategories(mappedCats);
        } else {
          // Extract unique categories from products if categories table is unpopulated
          const uniqueCats = Array.from(new Set(mappedProducts.map((p) => p.category)));
          setCategories([
            { id: 'ALL', label: 'All' },
            ...uniqueCats.map((cat) => ({ id: cat, label: cat })),
          ]);
        }
      } else {
        // If database is currently empty (prior to data migration step), use fallback
        setProducts(fallbackMenu);
        setCategories(fallbackCategories);
      }
    } catch (err) {
      console.error('Error in useProducts hook:', err);
      setProducts(fallbackMenu);
      setCategories(fallbackCategories);
      setError('Unable to load latest menu. Displaying default menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    categories,
    loading,
    error,
    refresh: fetchProducts,
  };
}
