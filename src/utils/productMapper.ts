import type { Product, PriceOption, ProductVariant } from '@/types';
import type { RawDatabaseProductWithRelations } from '@/services/productService';

/**
 * Transforms a Supabase database product record with joined tables
 * into the exact frontend Product interface required by ProductCard & ProductModal.
 */
export function mapDatabaseProductToProduct(
  dbProduct: RawDatabaseProductWithRelations
): Product {
  // 1. Sort & filter price options
  const activePriceOptions = (dbProduct.product_price_options || [])
    .filter((opt) => opt.is_active !== false)
    .sort((a, b) => a.display_order - b.display_order);

  let price: number | null = null;
  let priceOptions: PriceOption[] | undefined = undefined;

  if (activePriceOptions.length === 1) {
    const single = activePriceOptions[0];
    const isGenericLabel = ['base', 'regular', 'fixed', 'standard', 'default'].includes(
      single.label.trim().toLowerCase()
    );

    if (isGenericLabel) {
      price = Number(single.price);
      priceOptions = undefined;
    } else {
      price = Number(single.price);
      priceOptions = [
        {
          label: single.label,
          price: Number(single.price),
        },
      ];
    }
  } else if (activePriceOptions.length > 1) {
    price = null;
    priceOptions = activePriceOptions.map((opt) => ({
      label: opt.label,
      price: Number(opt.price),
    }));
  }

  // 2. Sort & filter variants and their options
  const activeVariants = (dbProduct.product_variants || [])
    .filter((v) => v.is_active !== false)
    .sort((a, b) => a.display_order - b.display_order);

  let variants: ProductVariant[] | undefined = undefined;

  if (activeVariants.length > 0) {
    variants = activeVariants.map((v) => {
      const activeOptions = (v.product_variant_options || [])
        .filter((opt) => opt.is_active !== false)
        .sort((a, b) => a.display_order - b.display_order)
        .map((opt) => opt.name);

      return {
        name: v.name,
        options: activeOptions,
      };
    });
  }

  return {
    id: dbProduct.slug || dbProduct.id,
    name: dbProduct.name,
    category: dbProduct.categories?.name || 'Pizzas',
    description: dbProduct.description || '',
    image: dbProduct.image_url || '',
    price,
    priceOptions,
    variants,
    popular: Boolean(dbProduct.is_popular),
  };
}

/**
 * Maps an array of database products to frontend Product[]
 */
export function mapDatabaseProductsToProducts(
  dbProducts: RawDatabaseProductWithRelations[]
): Product[] {
  return dbProducts.map(mapDatabaseProductToProduct);
}
