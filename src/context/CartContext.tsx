import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { Product } from '@/types';
import type { ProductDiscountMatch } from '@/hooks/useActiveDiscounts';

export type CartItem = {
  key: string; // Unique configuration hash
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  selectedSize?: string;
  selectedVariants: Record<string, string>;
  quantity: number;
  baseUnitPrice: number;
  finalUnitPrice: number;
  discountInfo?: {
    discountName: string;
    badgeLabel: string;
    discountAmountPerUnit: number;
  };
  lineTotal: number;
};

export type AddToCartInput = {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedVariants?: Record<string, string>;
  rawUnitPrice: number;
  discountMatch?: ProductDiscountMatch | null;
};

type CartContextType = {
  cartItems: CartItem[];
  cartItemCount: number;
  cartSubtotal: number;
  cartTotalSavings: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (input: AddToCartInput) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'dnc_cart_v1';

function generateCartItemKey(
  productId: string,
  selectedSize?: string,
  selectedVariants?: Record<string, string>
): string {
  const sizePart = selectedSize ? selectedSize.trim().toLowerCase() : 'standard';
  const variantsSorted = selectedVariants
    ? Object.entries(selectedVariants)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|')
    : 'none';
  return `${productId}__${sizePart}__${variantsSorted}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is CartItem =>
              typeof item?.key === 'string' &&
              typeof item?.productId === 'string' &&
              typeof item?.quantity === 'number' &&
              item.quantity > 0
          );
        }
      }
    } catch {
      // Graceful recovery from malformed storage
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Handled silently
    }
  }, [cartItems]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const addItem = useCallback((input: AddToCartInput) => {
    const { product, quantity, selectedSize, selectedVariants = {}, rawUnitPrice, discountMatch } = input;
    if (quantity <= 0) return;

    const key = generateCartItemKey(product.id, selectedSize, selectedVariants);

    let finalUnitPrice = rawUnitPrice;
    let discountInfo: CartItem['discountInfo'] = undefined;

    if (discountMatch) {
      const { finalPrice, discountAmount } = discountMatch.calculate(rawUnitPrice);
      finalUnitPrice = finalPrice;
      discountInfo = {
        discountName: discountMatch.discountName,
        badgeLabel: discountMatch.badgeLabel,
        discountAmountPerUnit: discountAmount,
      };
    }

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.key === key);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const existing = updated[existingIndex];
        const newQty = Math.min(50, existing.quantity + quantity);
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          lineTotal: finalUnitPrice * newQty,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          key,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          category: product.category,
          selectedSize,
          selectedVariants,
          quantity,
          baseUnitPrice: rawUnitPrice,
          finalUnitPrice,
          discountInfo,
          lineTotal: finalUnitPrice * quantity,
        };
        return [...prevItems, newItem];
      }
    });

    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.key !== key));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          const qty = Math.min(50, quantity);
          return {
            ...item,
            quantity: qty,
            lineTotal: item.finalUnitPrice * qty,
          };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const { cartItemCount, cartSubtotal, cartTotalSavings } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let savings = 0;

    for (const item of cartItems) {
      count += item.quantity;
      subtotal += item.lineTotal;
      if (item.discountInfo) {
        savings += item.discountInfo.discountAmountPerUnit * item.quantity;
      }
    }

    return {
      cartItemCount: count,
      cartSubtotal: subtotal,
      cartTotalSavings: savings,
    };
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartItemCount,
        cartSubtotal,
        cartTotalSavings,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
