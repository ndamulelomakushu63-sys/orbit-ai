import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  ShoppingBag,
  MapPin,
  Tag
} from '../components/Icons';
import { useMarket } from '../services/marketState';
import { MarketOrder, MarketOrderStatus } from '../types';

interface MarketOrdersScreenProps {
  onBack: () => void;
  highlightOrderId?: string;
}

const ORDER_STATUS_STEPS: { status: MarketOrderStatus; label: string; desc: string }[] = [
  { status: 'PAID', label: 'Payment Confirmed', desc: 'Order confirmed and sent to seller.' },
  { status: 'PREPARING', label: 'Seller Preparing', desc: 'Seller is packaging your items.' },
  { status: 'READY FOR COLLECTION', label: 'Ready for Pickup', desc: 'Awaiting Orbit courier pickup.' },
  { status: 'RECEIVED BY ORBIT', label: 'Received by Orbit', desc: 'Arrived at Orbit central hub.' },
  { status: 'OUT FOR DELIVERY', label: 'Out for Delivery', desc: 'Courier is en route to your address.' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Package delivered.' }
];

export const MarketOrdersScreen: React.FC<MarketOrdersScreenProps> = ({
  onBack,
  highlightOrderId
}) => {
  const { orders, refreshOrders, isLoading } = useMarket();
  const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null);

  useEffect(() => {
    refreshOrders();
  }, []);

  useEffect(() => {
    if (orders && orders.length > 0) {
      if (highlightOrderId) {
        const found = orders.find(o => o.id === highlightOrderId || o.orderNumber === highlightOrderId);
        if (found) setSelectedOrder(found);
        else setSelectedOrder(orders[0]);
      } else if (!selectedOrder) {
        setSelectedOrder(orders[0]);
      }
    }
  }, [orders, highlightOrderId]);

  const getStepIndex = (currentStatus: MarketOrderStatus): number => {
    switch (currentStatus) {
      case 'PAID': return 0;
      case 'PREPARING': return 1;
      case 'READY FOR COLLECTION': return 2;
      case 'RECEIVED BY ORBIT': return 3;
      case 'OUT FOR DELIVERY': return 4;
      case 'DELIVERED': return 5;
      default: return 0;
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-white text-slate-900 font-sans selection:bg-blue-50 selection:text-blue-900 pb-12 text-left">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Market</span>
          </button>
          <div className="text-xs font-extrabold tracking-wider uppercase text-slate-900">
            Order Tracking
          </div>
          <button
            onClick={() => refreshOrders()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-sans">
            My Orders & Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed font-sans font-medium">
            Monitor real-time status, courier pickup updates, and delivery timelines for your Orbit Market purchases.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 border border-slate-200/80 rounded-3xl p-8 space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No orders found yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              When you purchase products from Orbit Market, your real-time tracking will appear here.
            </p>
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Orders List Column */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                All Orders ({orders.length})
              </span>
              {orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-600/60 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs text-slate-900 font-mono">
                        {order.orderNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700">
                        {order.orderStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 line-clamp-1 mb-2 font-medium">
                      {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className="font-black text-slate-950">
                        R{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Order Detail Column */}
            {selectedOrder && (
              <div className="lg:col-span-7 space-y-5">
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
                  
                  {/* Top Details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Order Number
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-950 font-mono">
                        {selectedOrder.orderNumber}
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Total Paid
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-600">
                        R{selectedOrder.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Delivery Progress
                    </span>

                    <div className="space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {ORDER_STATUS_STEPS.map((step, idx) => {
                        const currentIdx = getStepIndex(selectedOrder.orderStatus);
                        const isDone = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;

                        return (
                          <div key={step.status} className="relative flex items-start space-x-3">
                            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isDone ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${isCurrent ? 'text-blue-600' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                                {step.label}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {step.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tracking Number info if present */}
                  {selectedOrder.trackingNumber && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center space-x-2.5 text-xs text-blue-900">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold">Courier Waybill: </span>
                        <span className="font-mono">{selectedOrder.trackingNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* Destination Info */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Delivery Address</span>
                    </div>
                    <p className="text-slate-600 pl-5 font-medium leading-relaxed">
                      {selectedOrder.deliveryAddress}
                    </p>
                    <p className="text-slate-500 pl-5 text-[11px]">
                      Contact: {selectedOrder.customerName} ({selectedOrder.customerPhone || selectedOrder.customerEmail})
                    </p>
                  </div>

                  {/* Order Items Table */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Purchased Items
                    </span>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                          <div>
                            <span className="font-bold text-slate-900">{item.productName}</span>
                            <span className="text-slate-400 ml-1.5">
                              {item.brandName} {item.variantName ? `• Size: ${item.variantName}` : ''} • Qty: {item.quantity}
                            </span>
                          </div>
                          <span className="font-black text-slate-900">
                            R{item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
