import React from 'react';
import { Check, PackageCheck, Truck, ShieldCheck, Box, ShoppingBag } from 'lucide-react';

const Stepper = ({ currentStatus }) => {
  const steps = [
    { label: 'Placed', status: 'placed', icon: ShoppingBag },
    { label: 'Confirmed', status: 'confirmed', icon: ShieldCheck },
    { label: 'Packed', status: 'packed', icon: PackageCheck },
    { label: 'In Transit', status: 'in_transit', icon: Truck },
    { label: 'Delivered', status: 'delivered', icon: Box },
  ];

  const getStatusIndex = (status) => {
    const idx = steps.findIndex(step => step.status === status);
    return idx === -1 ? 0 : idx;
  };

  const currentIndex = getStatusIndex(currentStatus);

  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center text-sm font-semibold text-rose-600">
        This order has been cancelled.
      </div>
    );
  }

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          
          return (
            <React.Fragment key={step.status}>
              {/* Step circle */}
              <div className="flex flex-col items-center flex-1 relative">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' :
                  isActive ? 'bg-amber-500 border-amber-500 text-white animate-pulse-soft' :
                  'bg-white border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                
                <span className={`text-[10px] sm:text-xs font-bold mt-2 text-center transition-colors ${
                  isCompleted || isActive ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Progress Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-200 relative -top-3">
                  <div className={`absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-500`} style={{
                    width: index < currentIndex ? '100%' : '0%'
                  }}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
