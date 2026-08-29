import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Package, 
  ShieldCheck, 
  Tag, 
  ChevronRight, 
  MapPin,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Sparkles
} from '../components/Icons';
import { useMarket } from '../services/marketState';
import { MarketProduct, MarketBrand } from '../types';
import { MarketProductDetailModal } from './MarketProductDetailModal';
import { MarketCartDrawer } from './MarketCartDrawer';

interface MarketHomeScreenProps {
  onNavigateToCheckout: () => void;
  onNavigateToOrders: () => void;
  onNavigateToSeller: () => void;
  onBackToChat?: () => void;
}

export const MarketHomeScreen: React.FC<MarketHomeScreenProps> = ({
  onNavigateToCheckout,
  onNavigateToOrders,
  onNavigateToSeller,
  onBackToChat
}) => {
  const { 
    brands, 
    products, 
    categories,
    cartCount, 
    activeCategory, 
    setActiveCategory, 
    selectedBrandId, 
    setSelectedBrandId,
    selectedProduct, 
    setSelectedProduct,
    isCartOpen,
    setIsCartOpen,
    isLoading,
    refreshMarketData
  } = useMarket();

  // Filter published products by category or brand
  const filteredProducts = products.filter(product => {
    // Only display published products
    if (product.isPublished === false) return false;

    if (selectedBrandId) {
      return product.brandId === selectedBrandId;
    }
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Orbit Collection') {
      return product.brandName?.toLowerCase() === 'orbit collection' || product.category === 'Orbit Collection';
    }
    return product.brandName === activeCategory || product.category === activeCategory;
  });

  const activeBrandObj = selectedBrandId ? brands.find(b => b.id === selectedBrandId) : null;
  const thirdPartyBrands = brands.filter(b => !b.isOrbitCollection && b.name.toLowerCase() !== 'orbit collection');

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-50 selection:text-blue-900">
      {/* Top Navigation Bar - Orbit AI Native Styling */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-[54px] sm:h-16 flex items-center justify-between">
          
          {/* Left: Back to Chat + Brand Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {onBackToChat && (
              <button
                onClick={onBackToChat}
                className="p-1.5 -ml-1 sm:ml-0 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Back to Orbit AI Chat"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline text-xs font-semibold text-slate-600">Chat</span>
              </button>
            )}
            <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-950 font-sans">
                Orbit Market
              </span>
            </div>
          </div>

          {/* Right Header Navigation Controls - Perfectly spaced for mobile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            <button
              onClick={onNavigateToSeller}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-98 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Seller Portal & Product Management"
            >
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xs:inline sm:inline">Seller Portal</span>
            </button>

            <button
              onClick={onNavigateToOrders}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-98 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Track Your Orders"
            >
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xs:inline sm:inline">Orders</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white active:scale-98 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="View Cart"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6">
        
        {/* Marketplace Tagline */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-sans">
            Curated Local Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed font-sans font-medium">
            Shop directly from official Orbit merchandise and verified South African brands with integrated courier delivery.
          </p>
        </div>

        {/* Dynamic Category Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none">
          {categories.map((cat) => {
            const isActive = !selectedBrandId && activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedBrandId(null);
                  setActiveCategory(cat);
                }}
                className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}

          {selectedBrandId && (
            <button
              onClick={() => setSelectedBrandId(null)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Brand: {activeBrandObj?.name}</span>
              <span className="text-blue-500 font-bold ml-1">✕</span>
            </button>
          )}
        </div>

        {/* Brand Storefront Banner if brand selected */}
        {activeBrandObj && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 animate-fade-in text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-950 font-sans">{activeBrandObj.name}</h2>
                {activeBrandObj.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Verified Brand</span>
                  </span>
                )}
              </div>
              {activeBrandObj.location && (
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeBrandObj.location}</span>
                </div>
              )}
            </div>
            {activeBrandObj.description && (
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {activeBrandObj.description}
              </p>
            )}
          </div>
        )}

        {/* 3rd Party Brand Onboarding Notice if no 3rd-party brands yet */}
        {!selectedBrandId && thirdPartyBrands.length === 0 && activeCategory === 'All' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Store className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium text-slate-600">
                Local brands will appear here dynamically as they register on Orbit Market.
              </span>
            </div>
            <button
              onClick={onNavigateToSeller}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline whitespace-nowrap cursor-pointer shrink-0"
            >
              Register Brand →
            </button>
          </div>
        )}

        {/* Products Visual Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading marketplace catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 border border-slate-200/80 rounded-3xl p-8 space-y-3">
            <Tag className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No products available yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Products will appear here once published by the seller.
            </p>
            <button
              onClick={() => {
                setSelectedBrandId(null);
                setActiveCategory('All');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stockQuantity <= 0;
              const displayImage = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null);

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-md rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Dominant Product Image Container */}
                  <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden relative border border-slate-100 group-hover:scale-[1.01] transition-transform">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={product.name}
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                    )}

                    {/* In Stock / Out of Stock pill */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider uppercase ${
                        isOutOfStock 
                          ? 'bg-red-600 text-white' 
                          : 'bg-white/95 text-slate-800 shadow-2xs border border-slate-100'
                      }`}>
                        {isOutOfStock ? 'Sold Out' : product.brandName}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="pt-2.5 sm:pt-3 space-y-1 text-left flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        {product.brandName}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 leading-snug font-sans">
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 mt-2">
                      <div>
                        <div className="text-sm sm:text-base font-black text-slate-950 tracking-tight font-sans">
                          R{product.price.toFixed(2)}
                        </div>
                        {product.variants && product.variants.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {product.variants.map(v => v.sizeName).join(' · ')}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Orbit Market Guarantee Footer */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-700 text-left">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-blue-600 shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Orbit Courier & Direct Logistics</div>
              <div className="text-slate-500 text-[11px]">Orders collected directly from sellers and delivered reliably across South Africa.</div>
            </div>
          </div>
          <button
            onClick={onNavigateToSeller}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline whitespace-nowrap cursor-pointer shrink-0"
          >
            Sell on Orbit Market →
          </button>
        </div>
      </main>

      {/* Product Detail Modal */}
      <MarketProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSelectBrand={(brandId) => setSelectedBrandId(brandId)}
      />

      {/* Cart Drawer */}
      <MarketCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={onNavigateToCheckout}
      />
    </div>
  );
};
