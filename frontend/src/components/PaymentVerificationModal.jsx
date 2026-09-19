import React from 'react';
import { 
  CheckCircle, Loader2, ShieldCheck, Lock, AlertTriangle, 
  Truck, X 
} from 'lucide-react';

/**
 * PaymentVerificationModal
 * 
 * Provides a professional payment confirmation loading screen and celebration state
 * matching enterprise fintech & e-commerce applications.
 */
const PaymentVerificationModal = ({
  isOpen,
  status = 'verifying',
  orderId,
  paymentId,
  amount,
  title = 'Order Payment',
  description,
  onClose,
  onAction,
  actionLabel = 'Continue'
}) => {
  if (!isOpen) return null;

  const isVerifying = status === 'verifying';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-scaleUp overflow-hidden">
        
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-emerald-100/60 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-teal-100/60 blur-2xl pointer-events-none" />

        {/* Dismiss button when not verifying */}
        {!isVerifying && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* ── 1. VERIFYING PAYMENT LOADING STATE ── */}
        {isVerifying && (
          <div className="space-y-6 py-2">
            {/* Animated Shield and Pulse Ripples */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-emerald-100/80 animate-pulse" />
              <div className="relative w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <ShieldCheck className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                Processing Transaction
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Confirming Your Payment...
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Please do not close this window or refresh the page while we confirm your payment with the banking gateway.
              </p>
            </div>

            {/* Verification Pipeline Steps */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
              <div className="flex items-center gap-3 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-700">Payment Authorized by Gateway</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <span className="font-bold text-emerald-700">Verifying Cryptographic Bank Signature...</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <span className="font-medium">Securing Funds in Escrow &amp; Alerting Farmer</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5 pt-1">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>256-bit Bank-Grade SSL Encrypted Checkout</span>
            </div>
          </div>
        )}

        {/* ── 2. PAYMENT CONFIRMED / SUCCESS STATE ── */}
        {isSuccess && (
          <div className="space-y-6 py-2">
            {/* Celebration Check Badge */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner ring-8 ring-emerald-50 animate-scaleUp">
                <CheckCircle className="h-12 w-12 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Payment Verified · Confirmed
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Payment Successful! 🎉
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {description || 'Your payment has been verified. The order is locked in KisanConnect escrow and the logistics dispatch partner has been notified.'}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5 text-left shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-bold text-slate-800">#{orderId || 'KC-ORDER'}</span>
              </div>
              {paymentId && (
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Razorpay Reference:</span>
                  <span className="font-mono text-emerald-700 font-bold truncate max-w-[190px]" title={paymentId}>
                    {paymentId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Amount Paid:</span>
                <span className="font-black text-emerald-700 text-base">
                  ₹{typeof amount === 'number' ? amount.toFixed(2) : amount || '0.00'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={onAction || onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs shadow-md shadow-emerald-200 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Truck className="h-4 w-4" />
                <span>{actionLabel}</span>
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 3. PAYMENT FAILED STATE ── */}
        {isFailed && (
          <div className="space-y-6 py-2">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <AlertTriangle className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">
                Payment Verification Incomplete
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {description || 'We could not confirm the payment signature. If funds were deducted, your order will be automatically synced.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer"
            >
              Back to Portal
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentVerificationModal;
