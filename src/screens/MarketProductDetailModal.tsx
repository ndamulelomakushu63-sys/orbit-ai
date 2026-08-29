import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  CheckCircle2, 
  Minus, 
  Plus, 
  Store,
  ShieldCheck,
  Tag
} from '../components/Icons';
import { MarketProduct } from '../types';
import { useMarket } from '../services/marketState';

interface MarketProductDetailModalProps {
  product: MarketProduct | null;
  onClose: () => void;
  onSelectBrand?: (brandId: string) => void;
}

export const MarketProductDetailModal: React.FC<MarketProductDetailModalProps> = ({
  product,
  onClose,
  onSelectBrand
}) => {
  const { addToCart, setIsCartOpen } = useMarket();
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      if (product.variants && product.variants.length > 0) {
        // Auto select first variant with stock > 0
        const inStockVar = product.variants.find(v => v.stockQuantity > 0) || product.variants[0];
        setSelectedVariant(inStockVar.sizeName);
      } else {
        setSelectedVariant('');
      }
      setSelectedImageIndex(0);
      setQuantity(1);
      setAddedToast(false);
    }
  }, [product]);

  if (!product) return null;

  // Determine current stock limit
  let currentStock = product.stockQuantity;
  if (selectedVariant && product.variants && product.variants.length > 0) {
    const vObj = product.variants.find(v => v.sizeName === selectedVariant);
    if (vObj) {
      currentStock = vObj.stockQuantity;
    }
  }

  const isOutOfStock = currentStock <= 0;

  const imagesList = product.images && product.images.length > 0 
    ? product.images 
    : (product.imageUrl ? [product.imageUrl] : []);

  const activeImage = imagesList[selectedImageIndex] || product.imageUrl || '';

  const handleAdd = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, selectedVariant || undefined, quantity);
    if (res.success) {
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div 
        className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onSelectBrand) {
                  onSelectBrand(product.brandId);
                  onClose();
                }
              }}
              className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors font-bold flex items-center gap-1 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>{product.brandName}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left">
          
          {/* Main Visual Image Display */}
          <div className="w-full aspect-square sm:aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200/70">
            {activeImage ? (
              <img 
                src={activeImage} 
                alt={product.name}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                <ShoppingBag className="w-12 h-12" />
              </div>
            )}

            {/* Stock pill */}
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs ${
                isOutOfStock 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-slate-900 border border-slate-200'
              }`}>
                {isOutOfStock ? 'Sold Out' : `${currentStock} available`}
              </span>
            </div>
          </div>

          {/* Multiple Image Thumbnails if available */}
          {imagesList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedImageIndex === idx ? 'border-blue-600 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          {/* Title & Price */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {product.brandName}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 leading-tight font-sans">
              {product.name}
            </h2>
            <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-sans pt-1">
              R{product.price.toFixed(2)}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                Description
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                {product.description}
              </p>
            </div>
          )}

          {/* Variants / Size Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  Select Size
                </label>
                {selectedVariant && (
                  <span className="text-xs text-slate-500 font-medium">
                    Selected: <strong className="text-slate-900 font-bold">{selectedVariant}</strong>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant === v.sizeName;
                  const isVarOut = v.stockQuantity <= 0;
                  return (
                    <button
                      key={v.id}
                      disabled={isVarOut}
                      onClick={() => {
                        setSelectedVariant(v.sizeName);
                        setQuantity(1);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : isVarOut
                          ? 'bg-slate-50 text-slate-300 border-slate-200 line-through cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div>{v.sizeName}</div>
                      <div className={`text-[9px] mt-0.5 font-medium ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {isVarOut ? '0 left' : `${v.stockQuantity} left`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Quantity
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Max available: {currentStock}
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-black text-slate-900">
                {quantity}
              </span>
              <button
                disabled={quantity >= currentStock || isOutOfStock}
                onClick={() => setQuantity(q => Math.min(currentStock, q + 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Orbit Guarantee Notice */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center space-x-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">Direct South African courier delivery included.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3">
          {addedToast ? (
            <div className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Added to your cart</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setIsCartOpen(true);
                }}
                className="underline text-xs font-black text-emerald-900 hover:text-emerald-950 cursor-pointer"
              >
                View Cart →
              </button>
            </div>
          ) : (
            <button
              disabled={isOutOfStock}
              onClick={handleAdd}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isOutOfStock ? 'Sold Out' : `Add to Cart • R${(product.price * quantity).toFixed(2)}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
