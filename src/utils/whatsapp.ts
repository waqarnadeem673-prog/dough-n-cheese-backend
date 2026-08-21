import type { Product, Branch } from '@/types';

export type OrderSelection = {
  quantity: number;
  priceLabel?: string;
  price: number; // Final unit price charged
  variantSelections?: Record<string, string>;
  discountInfo?: {
    discountName: string;
    originalTotal: number;
    discountAmount: number;
    finalTotal: number;
  };
};

export function formatPrice(price: number): string {
  return `Rs. ${price.toLocaleString('en-PK')}`;
}

export function generateWhatsAppOrder(
  product: Product,
  selection: OrderSelection,
  branch: Branch,
): string {
  const itemDescriptor = selection.priceLabel
    ? `${product.name} (${selection.priceLabel})`
    : product.name;

  const lines: string[] = [
    `Hi Dough N Cheese!`,
    `I would like to order:`,
    `Product: ${itemDescriptor} × ${selection.quantity}`,
  ];

  if (selection.variantSelections) {
    Object.entries(selection.variantSelections).forEach(([key, val]) => {
      lines.push(`${key}: ${val}`);
    });
  }

  if (selection.discountInfo && selection.discountInfo.discountAmount > 0) {
    lines.push(`Original Total: ${formatPrice(selection.discountInfo.originalTotal)}`);
    lines.push(
      `Promo Discount (${selection.discountInfo.discountName}): -${formatPrice(
        selection.discountInfo.discountAmount
      )}`
    );
    lines.push(`Final Total: ${formatPrice(selection.discountInfo.finalTotal)}`);
  } else {
    lines.push(`Total: ${formatPrice(selection.price * selection.quantity)}`);
  }

  lines.push(`Branch: ${branch.name}`);
  lines.push(``);
  lines.push(`Please confirm my order.`);

  const message = lines.join('\n');
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${branch.whatsapp}?text=${encoded}`;
}

export function openWhatsApp(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
