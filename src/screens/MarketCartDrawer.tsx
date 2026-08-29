import React from 'react';
import { 
  X, 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  ArrowRight,
  Truck
} from '../components/Icons';
import { useMarket } from '../services/marketState';

interface MarketCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const MarketCartDrawer: React.FC<MarketCartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout
}) => {
  const { 
    cart, 
    cartSubtotal, 
    deliveryFee, 
    cartTotal, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart 
  } = useMarket();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-slide-left text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-950 font-sans">
              Shopping Cart ({cart.length})
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors font-medium mr-2 cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Your cart is empty
                </h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Discover official Orbit merchandise and verified South African brands on Orbit Market.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Explore Products
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex flex-col space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Thumbnail */}
                  {item.imageUrl && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
                      {item.brandName}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                      {item.productName}
                    </h4>
                    {item.variantName && (
                      <span className="inline-block mt-0.5 text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold">
                        Size: {item.variantName}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-slate-950 font-sans">
                      R{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span>R{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <div className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Courier Delivery (South Africa)</span>
                </div>
                <span>R{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>R{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
