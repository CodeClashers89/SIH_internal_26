import React, { useState } from 'react';
import { 
  X, ShoppingBag, Repeat, Sparkles, Calendar, Clock, 
  Check, Sunrise, Sun, Sunset, ShieldCheck, ChevronRight 
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'Monday', label: 'Mon' },
  { id: 'Tuesday', label: 'Tue' },
  { id: 'Wednesday', label: 'Wed' },
  { id: 'Thursday', label: 'Thu' },
  { id: 'Friday', label: 'Fri' },
  { id: 'Saturday', label: 'Sat' },
  { id: 'Sunday', label: 'Sun' },
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '6:00 AM – 9:00 AM', icon: Sunrise },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM – 3:00 PM', icon: Sun },
  { id: 'evening', label: 'Evening', time: '5:00 PM – 8:00 PM', icon: Sunset },
];

const DURATIONS = [
  { months: 1, deliveries: 4, label: '1 Month', desc: '4 Drops' },
  { months: 2, deliveries: 8, label: '2 Months', desc: '8 Drops', popular: true },
  { months: 3, deliveries: 12, label: '3 Months', desc: '12 Drops' },
];

const OrderTypeModal = ({ isOpen, onClose, product, onConfirm }) => {
  const [selectedType, setSelectedType] = useState('onetime'); // 'onetime' | 'subscription'
  const [deliveryDay, setDeliveryDay] = useState('Monday');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('morning');
  const [durationMonths, setDurationMonths] = useState(2);

  if (!isOpen || !product) return null;

  const pricePerUnit = parseFloat(product.price_per_unit) || 0;
  const discountPerUnit = pricePerUnit * 0.05;
  const discountedPrice = pricePerUnit - discountPerUnit;
  const totalDeliveries = durationMonths * 4;

  const getNextDeliveryDate = (targetDay) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetIndex = days.findIndex(d => d.toLowerCase() === targetDay.toLowerCase());
    const now = new Date();
    const currentDayIndex = now.getDay();
    let daysUntil = (targetIndex - currentDayIndex + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    const nextDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
    return nextDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleConfirm = () => {
    if (selectedType === 'subscription') {
      onConfirm('subscription', {
        orderType: 'subscription',
        deliveryDay,
        deliveryTimeSlot,
        durationMonths,
      });
    } else {
      onConfirm('onetime', {
        orderType: 'onetime',
        deliveryDay: 'Monday',
        deliveryTimeSlot: 'morning',
        durationMonths: 2,
      });
    }
    onClose();
  };

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-xl overflow-hidden shrink-0 border border-emerald-100">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : '🌿'}
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base leading-tight">{product.name}</h3>
              <p className="text-[11px] text-slate-500">
                ₹{pricePerUnit.toFixed(2)} / {product.unit} · Choose how you want to order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="space-y-3">
            {/* Option 1: One-Time Order */}
            <div 
              onClick={() => setSelectedType('onetime')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedType === 'onetime'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                selectedType === 'onetime' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
              }`}>
                {selectedType === 'onetime' && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    One-Time Order
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{pricePerUnit.toFixed(2)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Instant standard delivery directly to your doorstep.
                </p>
              </div>
            </div>

            {/* Option 2: Recurring Farm Subscription */}
            <div 
              onClick={() => setSelectedType('subscription')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                selectedType === 'subscription'
                  ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selectedType === 'subscription' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {selectedType === 'subscription' && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                      <Repeat className="h-4 w-4 text-emerald-600" />
                      Recurring Auto-Delivery
                      <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight">
                        Save 5%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-700 text-sm">
                        ₹{discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through ml-1.5">
                        ₹{pricePerUnit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Freshly harvested from the farmer on your custom schedule with automatic discount.
                  </p>
                </div>
              </div>

              {/* ── Dynamic Schedule Settings (Appears only when Recurring is selected) ── */}
              {selectedType === 'subscription' && (
                <div className="pt-3 border-t border-emerald-200/80 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Recurring Schedule Settings
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                      Pause / Cancel anytime
                    </span>
                  </div>

                  {/* Day of Week Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                      Deliver Every Week On:
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeliveryDay(day.id); }}
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            deliveryDay === day.id
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slot Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                      Preferred Time Slot:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIME_SLOTS.map((slot) => {
                        const Icon = slot.icon;
                        const isSelected = deliveryTimeSlot === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeliveryTimeSlot(slot.id); }}
                            className={`p-2 rounded-xl text-left border transition-all ${
                              isSelected
                                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-900 shadow-xs'
                                : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <Icon className={`h-3 w-3 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                              {slot.label}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">{slot.time}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                      Schedule Duration:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {DURATIONS.map((dur) => (
                        <button
                          key={dur.months}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDurationMonths(dur.months); }}
                          className={`p-2 rounded-xl border text-center transition-all relative ${
                            durationMonths === dur.months
                              ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-900 shadow-xs font-bold'
                              : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600 text-xs'
                          }`}
                        >
                          <div className="text-xs font-bold">{dur.label}</div>
                          <div className="text-[9px] text-slate-500">{dur.desc}</div>
                          {dur.popular && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black px-1.5 rounded-full uppercase tracking-tighter">
                              Popular
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Banner */}
                  <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs space-y-1 text-slate-700">
                    <div className="flex justify-between items-center text-slate-800 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        First Delivery:
                      </span>
                      <span className="text-emerald-700 font-black">
                        {getNextDeliveryDate(deliveryDay)} ({deliveryTimeSlot})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      🔁 <strong>{totalDeliveries} deliveries</strong> every {deliveryDay} morning · ₹{discountedPrice.toFixed(2)} / delivery.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm shadow-emerald-200 active:scale-[0.98]"
          >
            {selectedType === 'subscription' ? (
              <>
                <Repeat className="h-4 w-4" />
                Confirm &amp; Subscribe Schedule
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Add to Cart (One-Time)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTypeModal;
