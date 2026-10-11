import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  MarketBrand, 
  MarketProduct, 
  MarketOrder, 
  CartItem, 
  MarketSettings, 
  MarketOrderStatus 
} from '../types';
import { 
  dbFetchMarketBrands, 
  dbFetchMarketProducts, 
  dbFetchMarketOrders, 
  dbUpsertMarketBrand, 
  dbUpsertMarketProduct, 
  dbUpdateMarketOrderStatus, 
  dbFetchMarketSettings 
} from './supabase';
import { useAppState } from './state';

function isMockBrand(id?: string, name?: string): boolean {
  const n = (name || '').toLowerCase().trim();
  const i = (id || '').toLowerCase().trim();
  return i === 'brand-orbit-official' || i === 'brand-orbit' || i === 'brand-authentic' || i === 'brand-kasi-crafted' || i === 'brand-beach-collection' || i === 'brand-beat-collection' ||
    n === 'orbit collection' || n === 'orbit' || n === 'authentic' || n === 'kasi crafted' || n === 'beach collection' || n === 'beat collection' || n.includes('beach collection') || n.includes('beat collection') || n.includes('orbit collection') || n.includes('nike') || n.includes('adidas');
}

function isMockProduct(id?: string, name?: string, brandName?: string): boolean {
  const n = (name || '').toLowerCase().trim();
  const b = (brandName || '').toLowerCase().trim();
  const i = (id || '').toLowerCase().trim();
  return i.startsWith('prod-orb-') || i === 'prod-orbit-tshirt' || i.startsWith('prod-auth-') || i.startsWith('prod-kasi-') || i === 'prod-beat-collection-tee' ||
    b === 'orbit collection' || b === 'orbit' || b === 'authentic' || b === 'kasi crafted' || b === 'beach collection' || b === 'beat collection' ||
    b.includes('beach collection') || b.includes('beat collection') || b.includes('orbit collection') ||
    n.includes('orbit t-shirt') || n.includes('authentic classic') || n.includes('kasi crafted') || n.includes('beach collection') || n.includes('beat collection');
}

interface MarketContextType {
  brands: MarketBrand[];
  products: MarketProduct[];
  categories: string[];
  cart: CartItem[];
  orders: MarketOrder[];
  settings: MarketSettings;
  isLoading: boolean;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  selectedBrandId: string | null;
  setSelectedBrandId: (brandId: string | null) => void;
  selectedProduct: MarketProduct | null;
  setSelectedProduct: (prod: MarketProduct | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  
  // Cart Actions
  addToCart: (product: MarketProduct, variantName?: string, quantity?: number) => { success: boolean; message: string };
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  
  // Calculations
  cartCount: number;
  cartSubtotal: number;
  deliveryFee: number;
  cartTotal: number;

  // Data Actions
  refreshMarketData: () => Promise<void>;
  createBrand: (brand: MarketBrand) => Promise<{ success: boolean; error?: string }>;
  createProduct: (product: MarketProduct) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: MarketOrderStatus, trackingNumber?: string) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppState();
  const [brands, setBrands] = useState<MarketBrand[]>(() => {
    try {
      const local = localStorage.getItem('orbit_market_brands');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter((b: any) => b && b.id && b.name && !isMockBrand(b.id, b.name));
        }
      }
    } catch (e) {}
    return [];
  });

  const [products, setProducts] = useState<MarketProduct[]>(() => {
    try {
      const local = localStorage.getItem('orbit_market_products');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p && p.id && p.name && !isMockProduct(p.id, p.name, p.brandName || p.brand_name));
        }
      }
    } catch (e) {}
    return [];
  });

  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [settings, setSettings] = useState<MarketSettings>({
    id: 'default',
    commissionRate: 0.10,
    defaultDeliveryFee: 50.00,
    minOrderAmount: 0.00,
    isActive: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Cart state persisted locally, filtering any old mock product items
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('orbit_market_cart');
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(item => 
        item && item.productId && item.productName && !isMockProduct(item.productId, item.productName, item.brandName)
      ) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('orbit_market_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  // Initial fetch
  const refreshMarketData = async () => {
    try {
      setIsLoading(true);
      const [fetchedBrands, fetchedProducts, fetchedSettings, fetchedOrders] = await Promise.all([
        dbFetchMarketBrands(),
        dbFetchMarketProducts(),
        dbFetchMarketSettings(),
        dbFetchMarketOrders(currentUser?.uid)
      ]);

      if (fetchedBrands) setBrands(fetchedBrands);
      if (fetchedProducts) setProducts(fetchedProducts);
      if (fetchedSettings) setSettings(fetchedSettings);
      if (fetchedOrders) setOrders(fetchedOrders);
    } catch (err) {
      console.warn("Error refreshing market data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrders = async () => {
    try {
      const fetched = await dbFetchMarketOrders(currentUser?.uid);
      setOrders(fetched);
    } catch (e) {}
  };

  useEffect(() => {
    refreshMarketData();
  }, [currentUser?.uid]);

  // Cart Operations
  const addToCart = (product: MarketProduct, variantName?: string, quantity: number = 1): { success: boolean; message: string } => {
    const itemKey = `${product.id}-${variantName || 'default'}`;
    
    // Find variant max stock if variant exists
    let maxStock = product.stockQuantity;
    if (variantName && product.variants && product.variants.length > 0) {
      const variantObj = product.variants.find(v => v.sizeName === variantName);
      if (variantObj) {
        maxStock = variantObj.stockQuantity;
      }
    }

    if (maxStock <= 0) {
      return { success: false, message: "Selected item is out of stock." };
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.id === itemKey);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const newQty = Math.min(maxStock, currentQty + quantity);
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          maxStock
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: itemKey,
          productId: product.id,
          productName: product.name,
          brandId: product.brandId,
          brandName: product.brandName,
          variantName: variantName || undefined,
          price: product.price,
          quantity: Math.min(maxStock, quantity),
          maxStock,
          imageUrl: product.imageUrl
        };
        return [...prev, newItem];
      }
    });

    return { success: true, message: `Added ${product.name} to cart.` };
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: Math.min(item.maxStock, newQty)
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Dynamic categories: 'All' and all registered brands with published products
  const categories = useMemo(() => {
    const list = ['All'];
    
    // Find all brands with published products
    const brandsWithPublishedProducts = new Set<string>();
    products.forEach(p => {
      if (p.isPublished !== false && p.brandName) {
        const trimmed = p.brandName.trim();
        if (trimmed) {
          brandsWithPublishedProducts.add(trimmed);
        }
      }
    });

    brands.forEach(b => {
      if (b.name && brandsWithPublishedProducts.has(b.name.trim())) {
        if (!list.includes(b.name.trim())) {
          list.push(b.name.trim());
        }
      }
    });

    brandsWithPublishedProducts.forEach(bName => {
      if (!list.includes(bName)) {
        list.push(bName);
      }
    });

    return list;
  }, [brands, products]);

  // Calculations
  const cartCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    return cart.length > 0 ? (settings.defaultDeliveryFee || 50.00) : 0;
  }, [cart, settings.defaultDeliveryFee]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + deliveryFee;
  }, [cartSubtotal, deliveryFee]);

  // Brand / Product creations
  const createBrand = async (newBrand: MarketBrand): Promise<{ success: boolean; error?: string }> => {
    const res = await dbUpsertMarketBrand(newBrand);
    if (res.success) {
      setBrands(prev => {
        const idx = prev.findIndex(b => b.id === newBrand.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newBrand;
          return updated;
        }
        return [...prev, newBrand];
      });
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to register brand" };
  };

  const createProduct = async (newProduct: MarketProduct): Promise<boolean> => {
    const success = await dbUpsertMarketProduct(newProduct);
    if (success) {
      setProducts(prev => {
        const idx = prev.findIndex(p => p.id === newProduct.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newProduct;
          return updated;
        }
        return [...prev, newProduct];
      });
    }
    return success;
  };

  const updateOrderStatus = async (orderId: string, status: MarketOrderStatus, trackingNumber?: string): Promise<boolean> => {
    const success = await dbUpdateMarketOrderStatus(orderId, status, trackingNumber);
    if (success) {
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.orderNumber === orderId) {
          return {
            ...o,
            orderStatus: status,
            trackingNumber: trackingNumber || o.trackingNumber,
            updatedAt: new Date().toISOString()
          };
        }
        return o;
      }));
    }
    return success;
  };

  return (
    <MarketContext.Provider value={{
      brands,
      products,
      categories,
      cart,
      orders,
      settings,
      isLoading,
      activeCategory,
      setActiveCategory,
      selectedBrandId,
      setSelectedBrandId,
      selectedProduct,
      setSelectedProduct,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartSubtotal,
      deliveryFee,
      cartTotal,
      refreshMarketData,
      createBrand,
      createProduct,
      updateOrderStatus,
      refreshOrders
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
