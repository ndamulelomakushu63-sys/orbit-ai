import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ShoppingBag
} from '../components/Icons';
import { useMarket } from '../services/marketState';
import { useAppState } from '../services/state';
import { MarketOrder } from '../types';
import { dbCreateMarketOrder } from '../services/supabase';

interface MarketCheckoutScreenProps {
  onBack: () => void;
  onOrderSuccess: (order: MarketOrder) => void;
}

export const MarketCheckoutScreen: React.FC<MarketCheckoutScreenProps> = ({
  onBack,
  onOrderSuccess
}) => {
  const { currentUser } = useAppState();
  const { cart, cartSubtotal, deliveryFee, cartTotal, clearCart, refreshOrders } = useMarket();

  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white select-none">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No items in checkout</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Your cart is currently empty. Please select products from the marketplace before checking out.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
        >
          Return to Market
        </button>
      </div>
    );
  }

  const handlePayFastCheckout = async (isTestSim: boolean = false) => {
    setErrorMessage(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 8) {
      setErrorMessage("Please provide a valid contact phone number for delivery.");
      return;
    }
    const fullAddress = `${deliveryAddress.trim()}, ${city.trim()} ${postalCode.trim()}`.trim();
    if (!deliveryAddress.trim() || !city.trim()) {
      setErrorMessage("Please provide a complete delivery address and city.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Send minimal cart & customer payload to Vercel server-side payment initialization endpoint
      const payload = {
        userId: currentUser?.uid || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: fullAddress,
        items: cart.map(item => ({
          productId: item.productId,
          variantName: item.variantName || null,
          quantity: item.quantity,
          sellerId: item.sellerId || null
        }))
      };

      const initRes = await fetch('/api/market/checkout-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const initData = await initRes.json();

      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || 'Failed to initialize checkout session.');
      }

      const generatedOrder: MarketOrder = initData.order;

      if (isTestSim) {
        // Instant simulated test order for demo & verification
        const simRes = await fetch('/api/market/complete-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: generatedOrder.id,
            paymentId: `sim_pf_${Date.now()}`
          })
        });

        const simData = await simRes.json();
        if (simData.success) {
          clearCart();
          await refreshOrders();
          onOrderSuccess(simData.order || generatedOrder);
          return;
        }
      }

      // 2. Submit to PayFast Gateway with Server-Signed Signature
      const payfastData = initData.payfast;
      const payfastEndpoint = initData.payfastEndpoint || 'https://www.payfast.co.za/eng/process';

      if (payfastData && payfastData.signature) {
        clearCart();
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payfastEndpoint;

        Object.keys(payfastData).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(payfastData[key]);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error("Unable to establish secure PayFast payment session. Please try again.");
      }

    } catch (err: any) {
      console.error("Checkout error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-white text-slate-900 font-sans selection:bg-blue-50 selection:text-blue-900 pb-12 text-left">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Market</span>
          </button>
          <div className="text-xs font-extrabold tracking-wider uppercase text-slate-900">
            Secure Checkout
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Form Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Left: Customer & Delivery Info */}
          <div className="lg:col-span-7 space-y-6">
            
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Delivery Details Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Truck className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider font-sans">
                  1. Delivery Details
                </h2>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sipho Ndlovu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="sipho@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Contact Phone (Courier) *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="082 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="123 Nelson Mandela Ave, Apt 4B"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      City / Suburb *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Johannesburg"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="2000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider font-sans">
                  2. Payment Method
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-blue-200 text-blue-600 font-bold text-xs shadow-2xs">
                    PF
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">PayFast Official Gateway</div>
                    <div className="text-[11px] text-slate-500">Credit Card, Debit Card, Instant EFT, Capitec Pay</div>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border-4 border-blue-600 bg-white" />
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>256-bit encrypted checkout. No banking details are stored on Orbit AI servers.</span>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4">
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider font-sans border-b border-slate-200 pb-3">
                Order Summary
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 block truncate">{item.productName}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.brandName} {item.variantName ? `• ${item.variantName}` : ''} • Qty: {item.quantity}
                      </span>
                    </div>
                    <span className="font-black text-slate-950 whitespace-nowrap">
                      R{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Subtotal</span>
                  <span>R{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Courier Delivery (South Africa)</span>
                  <span>R{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                  <span>Total Due</span>
                  <span>R{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <button
                disabled={isProcessing}
                onClick={() => handlePayFastCheckout(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm transition-all shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with PayFast • R{cartTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              {/* Instant Demo Order simulation button for testing */}
              <button
                disabled={isProcessing}
                onClick={() => handlePayFastCheckout(true)}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              >
                Instant Demo Order (Verification Mode)
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
