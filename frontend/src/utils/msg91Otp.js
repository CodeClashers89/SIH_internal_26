/**
 * MSG91 OTP Web SDK Integration Helper
 * Supports both:
 * 1. Default UI (Hosted MSG91 verification modal)
 * 2. Custom UI (window.sendOtp & window.verifyOtp via exposeMethods: true)
 */

export const MSG91_CONFIG = {
  widgetId: import.meta.env.VITE_MSG91_WIDGET_ID || "3668416a466e363834343939",
  tokenAuth: import.meta.env.VITE_MSG91_TOKEN_AUTH || "564962TA0jersOB6a90124eP1",
};

/**
 * Format phone number to 91XXXXXXXXXX format required by MSG91
 */
export const formatPhoneForMsg91 = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
};

let scriptLoadingPromise = null;

/**
 * Dynamically load MSG91 OTP Provider JavaScript SDK
 */
export const loadMsg91Script = () => {
  if (typeof window !== 'undefined' && typeof window.initSendOTP === 'function') {
    return Promise.resolve(window.initSendOTP);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  const urls = [
    'https://verify.msg91.com/otp-provider.js',
    'https://verify.phone91.com/otp-provider.js'
  ];

  scriptLoadingPromise = new Promise((resolve, reject) => {
    let index = 0;

    const attempt = () => {
      if (index >= urls.length) {
        reject(new Error('Failed to load MSG91 OTP SDK from all provider URLs.'));
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = urls[index];
      script.async = true;

      script.onload = () => {
        if (typeof window.initSendOTP === 'function') {
          resolve(window.initSendOTP);
        } else {
          // Poll briefly in case initSendOTP attaches slightly after onload
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;
            if (typeof window.initSendOTP === 'function') {
              clearInterval(checkInterval);
              resolve(window.initSendOTP);
            } else if (checkCount > 20) {
              clearInterval(checkInterval);
              index++;
              attempt();
            }
          }, 100);
        }
      };

      script.onerror = () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        index++;
        attempt();
      };

      document.head.appendChild(script);
    };

    attempt();
  });

  return scriptLoadingPromise;
};

/**
 * Launch MSG91 Default UI Modal Widget
 * @param {Object} options
 * @param {string} options.phone - Mobile number to verify
 * @param {Function} options.onSuccess - Callback on verified OTP (receives response token/data)
 * @param {Function} options.onFailure - Callback on error or dismissal
 */
export const launchMsg91DefaultWidget = async ({ phone, onSuccess, onFailure }) => {
  try {
    const initSendOTP = await loadMsg91Script();
    const identifier = formatPhoneForMsg91(phone);

    const configuration = {
      widgetId: MSG91_CONFIG.widgetId,
      tokenAuth: MSG91_CONFIG.tokenAuth,
      identifier: identifier || undefined,
      exposeMethods: false,
      success: (data) => {
        console.log('[MSG91 Widget Success]', data);
        if (onSuccess) onSuccess(data);
      },
      failure: (error) => {
        console.warn('[MSG91 Widget Failure]', error);
        if (onFailure) onFailure(error);
      }
    };

    initSendOTP(configuration);
  } catch (error) {
    console.error('[MSG91 Loader Error]', error);
    if (onFailure) onFailure(error);
  }
};

/**
 * Initialize MSG91 Headless/Custom UI Mode
 * Exposes window.sendOtp and window.verifyOtp for in-app input forms.
 */
export const initMsg91CustomUI = async ({ onSuccess, onFailure } = {}) => {
  try {
    const initSendOTP = await loadMsg91Script();

    const configuration = {
      widgetId: MSG91_CONFIG.widgetId,
      tokenAuth: MSG91_CONFIG.tokenAuth,
      exposeMethods: true,
      captchaRenderId: "msg91-captcha-container",
      success: (data) => {
        console.log('[MSG91 Custom UI Success]', data);
        if (onSuccess) onSuccess(data);
      },
      failure: (error) => {
        console.warn('[MSG91 Custom UI Failure]', error);
        if (onFailure) onFailure(error);
      }
    };

    initSendOTP(configuration);
    return true;
  } catch (err) {
    console.error('[MSG91 Custom UI Init Error]', err);
    return false;
  }
};

/**
 * Send OTP via exposed MSG91 method
 */
export const sendMsg91Otp = (phone, onSuccess, onFailure) => {
  const formatted = formatPhoneForMsg91(phone);
  if (typeof window !== 'undefined' && typeof window.sendOtp === 'function') {
    return window.sendOtp(formatted, onSuccess, onFailure);
  } else {
    console.warn('[MSG91] window.sendOtp not available yet. Falling back to default trigger.');
    if (onFailure) onFailure(new Error('window.sendOtp not ready'));
  }
};

/**
 * Verify OTP via exposed MSG91 method
 */
export const verifyMsg91Otp = (otp, onSuccess, onFailure) => {
  if (typeof window !== 'undefined' && typeof window.verifyOtp === 'function') {
    return window.verifyOtp(otp, onSuccess, onFailure);
  } else {
    console.warn('[MSG91] window.verifyOtp not available yet.');
    if (onFailure) onFailure(new Error('window.verifyOtp not ready'));
  }
};

/**
 * Resend OTP via exposed MSG91 method
 * channel: '1' for SMS, '4' for Voice, '12' for WhatsApp
 */
export const retryMsg91Otp = (channel = '1', onSuccess, onFailure) => {
  if (typeof window !== 'undefined' && typeof window.retryOtp === 'function') {
    return window.retryOtp(channel, onSuccess, onFailure);
  }
};
