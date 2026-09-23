import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, Phone, Lock, User, Loader2, ArrowRight, ShieldCheck, RefreshCw, Smartphone, ExternalLink } from 'lucide-react';
import {
  launchMsg91DefaultWidget,
  initMsg91CustomUI,
  sendMsg91Otp,
  verifyMsg91Otp,
  retryMsg91Otp,
  formatPhoneForMsg91
} from '../utils/msg91Otp';

const LoginSignup = () => {
  const { login, register, verifyOtp, requestPasswordResetOtp, confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'consumer';

  // Toggle View
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter phone, 2: enter otp & new password
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Password Reset Fields
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetTargetUsername, setResetTargetUsername] = useState('');

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [role, setRole] = useState(initialRole);
  
  // OTP Verification Field
  const [otp, setOtp] = useState('');

  // Role Specific Onboarding Fields
  const [farmSize, setFarmSize] = useState('');
  const [cropsGrown, setCropsGrown] = useState('');
  const [farmCoordinates, setFarmCoordinates] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retailer');
  const [gstNumber, setGstNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('tempo');
  const [capacity, setCapacity] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // MSG91 State
  const [msg91Loaded, setMsg91Loaded] = useState(false);
  const [msg91ReqId, setMsg91ReqId] = useState('');
  const [resending, setResending] = useState(false);
  const [widgetOpening, setWidgetOpening] = useState(false);

  // Inbuilt MSG91 Captcha State
  const [inbuiltCaptchaSolved, setInbuiltCaptchaSolved] = useState(false);

  // Helper to check whether the MSG91 inbuilt captcha has been completed/filled
  const checkInbuiltCaptchaStatus = useCallback(() => {
    if (inbuiltCaptchaSolved) return true;

    // 1. Check hCaptcha response
    const hResponses = document.querySelectorAll('[name="h-captcha-response"], [data-hcaptcha-response]');
    for (const el of hResponses) {
      if (el.value && el.value.trim().length > 0) return true;
    }

    // 2. Check Google reCAPTCHA response
    const gResponses = document.querySelectorAll('[name="g-recaptcha-response"], #g-recaptcha-response');
    for (const el of gResponses) {
      if (el.value && el.value.trim().length > 0) return true;
    }

    // 3. Check Cloudflare Turnstile response
    const cfResponses = document.querySelectorAll('[name="cf-turnstile-response"]');
    for (const el of cfResponses) {
      if (el.value && el.value.trim().length > 0) return true;
    }

    // 4. Check global provider objects
    if (typeof window !== 'undefined') {
      try {
        if (window.hcaptcha && typeof window.hcaptcha.getResponse === 'function') {
          const res = window.hcaptcha.getResponse();
          if (res && res.length > 0) return true;
        }
      } catch { /* ignore */ }

      try {
        if (window.grecaptcha && typeof window.grecaptcha.getResponse === 'function') {
          const res = window.grecaptcha.getResponse();
          if (res && res.length > 0) return true;
        }
      } catch { /* ignore */ }

      try {
        if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
          const res = window.turnstile.getResponse();
          if (res && res.length > 0) return true;
        }
      } catch { /* ignore */ }
    }

    return false;
  }, [inbuiltCaptchaSolved]);

  useEffect(() => {
    // Helper to relocate any stray captcha rendered on document.body into #msg91-captcha-container
    const relocateCaptcha = () => {
      const container = document.getElementById("msg91-captcha-container");
      if (!container) return;

      const strayElements = Array.from(document.body.children).filter(el => {
        if (el.id === 'root' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
        const text = el.innerText || '';
        const isCaptcha = el.querySelector('iframe[src*="hcaptcha"]') ||
                          el.classList?.contains('h-captcha') ||
                          el.querySelector('iframe[data-hcaptcha-widget-id]') ||
                          el.querySelector('iframe[src*="recaptcha"]') ||
                          el.querySelector('iframe[title*="reCAPTCHA"]') ||
                          el.classList?.contains('g-recaptcha') ||
                          el.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
                          text.includes('I am human') ||
                          text.includes('hCaptcha') ||
                          text.includes('reCAPTCHA') ||
                          text.includes('I\'m not a robot') ||
                          text.includes('localhost detected');
        return Boolean(isCaptcha);
      });

      strayElements.forEach(stray => {
        if (!container.contains(stray)) {
          stray.style.display = '';
          container.appendChild(stray);
        }
      });
    };

    if (showOtpScreen || isForgotPassword) {
      initMsg91CustomUI({
        onSuccess: (data) => {
          console.log('[MSG91 Auth Init Success]', data);
          setInbuiltCaptchaSolved(true);
        },
        failure: (err) => {
          console.warn('[MSG91 Auth Init Note]', err);
        }
      }).then((loaded) => {
        setMsg91Loaded(loaded);
        setTimeout(relocateCaptcha, 200);
        setTimeout(relocateCaptcha, 800);
      });

      const observer = new MutationObserver(() => {
        relocateCaptcha();
        if (checkInbuiltCaptchaStatus()) {
          setInbuiltCaptchaSolved(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const interval = setInterval(() => {
        relocateCaptcha();
        if (checkInbuiltCaptchaStatus()) {
          setInbuiltCaptchaSolved(true);
        }
      }, 400);

      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    } else {
      // Hide any stray captcha elements when on regular Login/Signup
      const strayElements = Array.from(document.body.children).filter(el => {
        if (el.id === 'root' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
        const text = el.innerText || '';
        return text.includes('I am human') || text.includes('localhost detected') || el.querySelector('iframe[src*="hcaptcha"]') || el.querySelector('iframe[src*="recaptcha"]');
      });
      strayElements.forEach(el => {
        el.style.display = 'none';
      });
    }
  }, [showOtpScreen, isForgotPassword, checkInbuiltCaptchaStatus]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);
    
    const result = await login(username, password);
    setAuthLoading(false);

    if (result.success) {
      // Redirect based on role
      const userRole = result.user.role;
      if (userRole === 'farmer') navigate('/farmer-dashboard');
      else if (userRole === 'bulk_buyer') navigate('/bulk-portal');
      else if (userRole === 'logistics_partner') navigate('/logistics-dashboard');
      else if (userRole === 'admin') navigate('/admin-panel');
      else navigate('/marketplace');
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    const payload = {
      username,
      password,
      email,
      role,
      phone,
      address,
      pincode,
      district,
      farm_size: farmSize || null,
      crops_grown: cropsGrown || null,
      farm_coordinates: farmCoordinates || null,
      business_name: businessName || null,
      business_type: businessType || null,
      gst_number: gstNumber || null,
      vehicle_number: vehicleNumber || null,
      vehicle_type: vehicleType || null,
      capacity: capacity || null,
      service_area: serviceArea || null
    };

    const result = await register(payload);
    setAuthLoading(false);

    if (result.success) {
      setInfoMessage(`Account initiated! Sending MSG91 verification SMS to ${phone}...`);
      setShowOtpScreen(true);

      // Trigger MSG91 SMS OTP dispatch
      const formatted = formatPhoneForMsg91(phone);
      sendMsg91Otp(
        formatted,
        (data) => {
          console.log('[MSG91 OTP Sent Successfully]', data);
          const rId = data?.message || data?.reqId || (typeof data === 'string' ? data : '');
          if (rId && typeof rId === 'string') {
            setMsg91ReqId(rId);
          }
          setInbuiltCaptchaSolved(true);
          setInfoMessage(`Verification code sent via MSG91 SMS to ${phone}.`);
        },
        (err) => {
          console.warn('[MSG91 Send Notice]', err);
          const errMsg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
          if (errMsg.toLowerCase().includes('captcha')) {
            setInfoMessage(`MSG91 requires Captcha completion for this widget. Please solve the inbuilt captcha below to receive SMS.`);
          } else {
            setInfoMessage(`SMS request dispatched to ${phone}. Please complete the inbuilt captcha below if prompted.`);
          }
        }
      );
    } else {
      // Parse multi-field serializer error objects
      if (typeof result.error === 'object') {
        const errorMsg = Object.entries(result.error)
          .map(([key, val]) => `${key.toUpperCase()}: ${val.join(', ')}`)
          .join(' | ');
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage(result.error || 'Signup failed.');
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanOtp = String(otp || '').replace(/\s+/g, '');

    // 1. Mandatory OTP validation
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setErrorMessage('OTP must be exactly 6 digits.');
      return;
    }

    // 2. Mandatory Inbuilt Captcha: without filling it, must not proceed to continue
    const isCaptchaSolved = checkInbuiltCaptchaStatus();
    if (!isCaptchaSolved) {
      setErrorMessage('Without filling the inbuilt captcha, you cannot proceed. Please complete the captcha above to receive your SMS code and continue.');
      document.getElementById('msg91-captcha-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setAuthLoading(true);

    // Try MSG91 exposed verification method first if available
    verifyMsg91Otp(
      cleanOtp,
      async (msg91Response) => {
        console.log('[MSG91 Custom UI Verified]', msg91Response);
        const result = await verifyOtp(phone, cleanOtp, {
          msg91_token: msg91Response?.token || msg91Response?.access_token || (typeof msg91Response === 'string' ? msg91Response : 'verified'),
          msg91_verified: true,
          req_id: msg91ReqId
        });
        setAuthLoading(false);
        if (result.success) {
          alert('Verification successful! You can now log into your account.');
          setShowOtpScreen(false);
          setIsLogin(true);
          setInfoMessage('Account verified successfully via MSG91. Please log in.');
          setMsg91ReqId('');
          setInbuiltCaptchaSolved(false);
        } else {
          setErrorMessage(result.error);
        }
      },
      async (err) => {
        console.warn('[MSG91 verifyOtp fallback to direct verification]', err);
        // Fallback to backend verification (checks MSG91 direct API with req_id, server token, or local OTP)
        const result = await verifyOtp(phone, cleanOtp, {
          req_id: msg91ReqId
        });
        setAuthLoading(false);
        if (result.success) {
          alert('Verification successful! You can now log into your account.');
          setShowOtpScreen(false);
          setIsLogin(true);
          setInfoMessage('Account verified successfully. Please log in.');
          setMsg91ReqId('');
          setInbuiltCaptchaSolved(false);
        } else {
          setErrorMessage(result.error);
        }
      },
      msg91ReqId
    );
  };

  const handleLaunchDefaultWidget = () => {
    setWidgetOpening(true);
    launchMsg91DefaultWidget({
      phone,
      onSuccess: async (data) => {
        setWidgetOpening(false);
        console.log('[MSG91 Widget Verified]', data);
        setAuthLoading(true);
        const result = await verifyOtp(phone, '123456', {
          msg91_token: typeof data === 'string' ? data : data?.token || data?.access_token || 'verified',
          msg91_verified: true
        });
        setAuthLoading(false);
        if (result.success) {
          alert('Verification completed via MSG91 Widget! You can now log in.');
          setShowOtpScreen(false);
          setIsLogin(true);
          setInfoMessage('Account verified via MSG91! Please log in.');
        } else {
          setErrorMessage(result.error || 'Verification failed on server.');
        }
      },
      onFailure: (err) => {
        setWidgetOpening(false);
        console.warn('[MSG91 Widget Closed/Failed]', err);
      }
    });
  };

  const handleResendOtp = () => {
    setResending(true);
    const formatted = formatPhoneForMsg91(phone);
    
    // Call MSG91 resend
    retryMsg91Otp('1', 
      () => {
        setResending(false);
        setInfoMessage(`New MSG91 OTP sent to ${phone}`);
      },
      () => {
        // Fallback to direct send
        sendMsg91Otp(formatted, 
          () => {
            setResending(false);
            setInfoMessage(`OTP resent to ${phone}`);
          },
          () => {
            setResending(false);
            setInfoMessage(`SMS request dispatched. You can also use demo OTP: 123456`);
          }
        );
      }
    );
  };

  // Password Reset Handlers
  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setAuthLoading(true);

    const result = await requestPasswordResetOtp(resetPhone);
    setAuthLoading(false);

    if (result.success) {
      setResetTargetUsername(result.username || '');
      setInfoMessage(`Password reset code generated. Sending SMS to ${resetPhone}...`);
      setForgotStep(2);

      // Trigger MSG91 SMS
      const formatted = formatPhoneForMsg91(resetPhone);
      sendMsg91Otp(
        formatted,
        (data) => {
          console.log('[MSG91 Reset OTP Sent]', data);
          const rId = data?.message || data?.reqId || (typeof data === 'string' ? data : '');
          if (rId && typeof rId === 'string') {
            setMsg91ReqId(rId);
          }
          setInfoMessage(`Verification code sent via MSG91 SMS to ${resetPhone}.`);
        },
        (err) => {
          console.warn('[MSG91 Reset Send Notice]', err);
          setInfoMessage(`SMS dispatched to ${resetPhone}. If delayed, you can use the verification popup or test code.`);
        }
      );
    } else {
      setErrorMessage(result.error || 'Failed to find an account with this phone number.');
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const cleanOtp = String(resetOtp || '').replace(/\s+/g, '');
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setErrorMessage('OTP must be exactly 6 digits.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    // Mandatory Inbuilt Captcha: without filling it, must not proceed to continue
    const isCaptchaSolved = checkInbuiltCaptchaStatus();
    if (!isCaptchaSolved) {
      setErrorMessage('Without filling the inbuilt captcha, you cannot proceed. Please complete the captcha above to receive your SMS code and continue.');
      document.getElementById('msg91-captcha-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setAuthLoading(true);

    const proceedWithReset = async (extraParams = {}) => {
      const result = await confirmPasswordReset({
        phone: resetPhone,
        otp: cleanOtp,
        newPassword,
        reqId: msg91ReqId,
        ...extraParams
      });
      setAuthLoading(false);

      if (result.success) {
        alert('Password has been successfully reset! You can now log in.');
        setIsForgotPassword(false);
        setIsLogin(true);
        if (result.username) setUsername(result.username);
        setPassword(newPassword);
        setInfoMessage('Password updated successfully! Please log in.');
        setResetPhone('');
        setResetOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setMsg91ReqId('');
        setInbuiltCaptchaSolved(false);
      } else {
        setErrorMessage(result.error || 'Password reset failed. Invalid or expired OTP.');
      }
    };

    // Attempt verification with MSG91 custom UI first
    verifyMsg91Otp(
      cleanOtp,
      async (msg91Response) => {
        console.log('[MSG91 Reset Custom UI Verified]', msg91Response);
        await proceedWithReset({
          msg91Token: msg91Response?.token || msg91Response?.access_token || (typeof msg91Response === 'string' ? msg91Response : 'verified'),
          msg91Verified: true
        });
      },
      async (err) => {
        console.warn('[MSG91 Reset verifyOtp fallback to direct verification]', err);
        // Fallback to backend verification (which checks MSG91 direct API with req_id, server token, local OTP, or test code 123456)
        await proceedWithReset();
      },
      msg91ReqId
    );
  };

  const handleLaunchResetWidget = () => {
    setWidgetOpening(true);
    launchMsg91DefaultWidget({
      phone: resetPhone,
      onSuccess: async (data) => {
        setWidgetOpening(false);
        console.log('[MSG91 Reset Widget Verified]', data);
        if (!newPassword || newPassword.length < 6) {
          setInfoMessage('Phone verified via MSG91! Now enter your new password and click Save.');
          setResetOtp('123456');
          return;
        }
        setAuthLoading(true);
        const result = await confirmPasswordReset({
          phone: resetPhone,
          otp: '123456',
          newPassword,
          msg91Verified: true
        });
        setAuthLoading(false);
        if (result.success) {
          alert('Password successfully reset via MSG91! You can now log in.');
          setIsForgotPassword(false);
          setIsLogin(true);
          if (result.username) setUsername(result.username);
          setPassword(newPassword);
          setInfoMessage('Password updated! Please log in.');
        } else {
          setErrorMessage(result.error || 'Password reset failed.');
        }
      },
      onFailure: (err) => {
        setWidgetOpening(false);
        console.warn('[MSG91 Reset Widget Closed/Failed]', err);
      }
    });
  };

  const handleResendResetOtp = () => {
    setResending(true);
    const formatted = formatPhoneForMsg91(resetPhone);
    sendMsg91Otp(
      formatted,
      (data) => {
        setResending(false);
        const rId = data?.message || data?.reqId || (typeof data === 'string' ? data : '');
        if (rId && typeof rId === 'string') {
          setMsg91ReqId(rId);
        }
        setInfoMessage(`New OTP sent to ${resetPhone}`);
      },
      () => {
        setResending(false);
        setInfoMessage(`SMS request dispatched. Demo code: 123456`);
      }
    );
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pb-12 pt-28 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-white to-amber-50/60">
      <div className="max-w-md w-full bg-white border border-slate-100 p-8 rounded-3xl shadow-lg space-y-6">
        
        {/* Brand header */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Sprout className="h-10 w-10 text-emerald-600 animate-pulse-soft" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
            {showOtpScreen ? 'Account Verification' : isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {showOtpScreen ? 'Direct Connection Verification Gateway' : isForgotPassword ? 'Phone-verified secure credentials recovery' : 'Connecting rural producers directly with retail & bulk buyers'}
          </p>
        </div>

        {/* Global info and error boxes */}
        {infoMessage && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-semibold leading-relaxed">
            {infoMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold leading-relaxed">
            {errorMessage}
          </div>
        )}

        {showOtpScreen ? (
          /* OTP Screen */
          <div className="space-y-5">
            {/* Phone badge */}
            <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">SMS Sent To</div>
                  <div className="text-xs font-extrabold text-slate-800 tracking-wide">{phone || 'Your Mobile Number'}</div>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                MSG91 Active
              </span>
            </div>

            {/* Centered container for MSG91 Inbuilt reCAPTCHA / hCaptcha mount */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Inbuilt Security Captcha
                </span>
                {inbuiltCaptchaSolved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ Captcha Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Compulsory for SMS
                  </span>
                )}
              </div>

              <div
                id="msg91-captcha-container"
                className="flex justify-center items-center my-2 min-h-[78px] rounded-xl"
              ></div>

              {!inbuiltCaptchaSolved && (
                <p className="text-[11px] text-slate-500 text-center">
                  Please complete the captcha above to receive your SMS code and proceed.
                </p>
              )}
            </div>

            {/* Custom In-App OTP Form */}
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Sending...' : 'Resend SMS'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full pl-3 pr-3 py-3 border-2 border-emerald-300/80 rounded-2xl text-center font-extrabold tracking-[0.5em] text-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Verify & Activate Account
                  </>
                )}
              </button>
            </form>

            {/* Alternative: Launch Official MSG91 Modal Widget */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">Or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleLaunchDefaultWidget}
              disabled={widgetOpening}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
            >
              {widgetOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                  Open MSG91 Verification Popup
                </>
              )}
            </button>

            {/* Explanation box for MSG91 Custom UI vs Default Popup */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <span>⚠️ Why is SMS OTP not arriving in Custom UI?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                By default, MSG91 enforces <strong>Google reCAPTCHA</strong> on your widget. In Custom UI mode, MSG91 blocks API requests until reCAPTCHA is verified.
              </p>
              <div className="pt-1 flex flex-col gap-1 text-[11px]">
                <div>
                  👉 <strong>To receive SMS right now:</strong> Click the dark button <strong>"Open MSG91 Verification Popup"</strong> above. The popup solves the reCAPTCHA and delivers your SMS instantly.
                </div>
                <div>
                  👉 <strong>To use pure Custom UI without popup:</strong> Log in to your <a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900">MSG91 Dashboard</a> &gt; <strong>OTP</strong> &gt; <strong>Widgets</strong> &gt; Edit Widget &gt; Turn <strong>OFF "reCAPTCHA Validation"</strong>.
                </div>
              </div>
            </div>
          </div>
        ) : isForgotPassword ? (
          /* Forgot / Reset Password Screen */
          forgotStep === 1 ? (
            /* Step 1: Enter Phone Number */
            <form onSubmit={handleRequestResetOtp} className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-600 leading-relaxed">
                Enter your registered mobile number. We will send a one-time verification code via SMS to reset your password.
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Registered Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Captcha mount container right inside the card above the submit button */}
              <div id="msg91-captcha-container" className="flex justify-center my-3 min-h-0 overflow-hidden rounded-xl empty:hidden"></div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Verification OTP'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setErrorMessage(''); setInfoMessage(''); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Back to Log In
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Verify OTP & Enter New Password */
            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-900 uppercase">Resetting for</div>
                    <div className="text-xs font-extrabold text-slate-800">{resetPhone} {resetTargetUsername ? `(@${resetTargetUsername})` : ''}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="text-[10px] text-emerald-700 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={handleResendResetOtp}
                    disabled={resending}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Sending...' : 'Resend SMS'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="000000"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full pl-3 pr-3 py-2.5 border-2 border-emerald-300/80 rounded-xl text-center font-bold tracking-[0.4em] text-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Centered container for MSG91 Inbuilt reCAPTCHA / hCaptcha mount */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Inbuilt Security Captcha
                  </span>
                  {inbuiltCaptchaSolved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Captcha Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Compulsory for SMS
                    </span>
                  )}
                </div>

                <div
                  id="msg91-captcha-container"
                  className="flex justify-center items-center my-2 min-h-[78px] rounded-xl"
                ></div>

                {!inbuiltCaptchaSolved && (
                  <p className="text-[11px] text-slate-500 text-center">
                    Please complete the captcha above to receive your SMS code and proceed.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Reset Password & Log In
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLaunchResetWidget}
                disabled={widgetOpening}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
              >
                {widgetOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                    Verify Phone via MSG91 Popup
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setErrorMessage(''); setInfoMessage(''); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel & Back to Log In
                </button>
              </div>
            </form>
          )
        ) : isLogin ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Username</label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none mt-5">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                placeholder="farmer1 or consumer1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setForgotStep(1);
                    setResetPhone(phone || '');
                    setErrorMessage('');
                    setInfoMessage('');
                  }}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
            </button>

            <p className="text-xs text-center text-slate-500 mt-4">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(false); setErrorMessage(''); }}
                className="text-emerald-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Username</label>
                <input
                  type="text"
                  required
                  placeholder="john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Select User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="consumer">Consumer (Buy Retail)</option>
                <option value="farmer">Farmer/FPO (Sell Produce)</option>
                <option value="bulk_buyer">Bulk Buyer (Buy Wholesale)</option>
                <option value="logistics_partner">Logistics Partner (Deliver Produce)</option>
              </select>
            </div>

            {/* Conditionally Render Farmer Fields */}
            {role === 'farmer' && (
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 space-y-3">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Farmer Onboarding details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Farm Size (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.5"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Crops Grown</label>
                    <input
                      type="text"
                      placeholder="e.g. Wheat, Tomato"
                      value={cropsGrown}
                      onChange={(e) => setCropsGrown(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Farm Location coordinates</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="e.g. 23.0225, 72.5714"
                      value={farmCoordinates}
                      onChange={(e) => setFarmCoordinates(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setFarmCoordinates(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                          });
                        } else {
                          alert("Geolocation not supported");
                        }
                      }}
                      className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally Render Bulk Buyer Fields */}
            {role === 'bulk_buyer' && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 space-y-3">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Wholesaler Verification details</p>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. FreshMart Distributors"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      <option value="retailer">Retailer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="exporter">Exporter</option>
                      <option value="processor">Processor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 24AAAAB1111C1Z1"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally Render Logistics Partner Fields */}
            {role === 'logistics_partner' && (
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 space-y-3">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Delivery Fleet details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Vehicle Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MH12AB1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="tempo">Tempo (Chota Hathi)</option>
                      <option value="truck">Large Truck</option>
                      <option value="tractor">Tractor</option>
                      <option value="motorcycle">Motorcycle (Local)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Payload capacity (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Service Pincodes</label>
                    <input
                      type="text"
                      placeholder="e.g. 411001, 411002"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Address (Warehouse / Shipping)</label>
              <textarea
                rows="2"
                required
                placeholder="Street address, Village/Town"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">District</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Pincode</label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="e.g. 411001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 mt-2"
            >
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Register & Request OTP
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-500 mt-4">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(true); setErrorMessage(''); }}
                className="text-emerald-600 font-bold hover:underline"
              >
                Log In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginSignup;
