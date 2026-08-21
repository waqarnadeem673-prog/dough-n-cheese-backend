export type PriceOption = {
  label: string;
  price: number;
};

export type ProductVariant = {
  name: string;
  options: string[];
};

export type Product = {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  image: string;
  price: number | null;
  priceOptions?: PriceOption[];
  variants?: ProductVariant[];
  tags?: string[];
  popular?: boolean;
};

export type MenuCategory =
  | 'Pizzas'
  | 'Burgers'
  | 'Pastas'
  | 'Rolls'
  | 'Sandwiches'
  | 'Munchies'
  | 'Sharing Meals'
  | 'Extras'
  | (string & {});

export type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  mapsUrl: string;
  hours: string;
  openTime: string;
  closeTime: string;
  daysOpen: string;
};
