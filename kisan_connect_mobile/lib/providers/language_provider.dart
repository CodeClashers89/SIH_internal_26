import 'package:flutter/material.dart';

enum AppLanguage { english, hindi, gujarati, marathi }

class LanguageProvider with ChangeNotifier {
  AppLanguage _currentLanguage = AppLanguage.english;

  AppLanguage get currentLanguage => _currentLanguage;

  String get languageName {
    switch (_currentLanguage) {
      case AppLanguage.english:
        return 'English';
      case AppLanguage.hindi:
        return 'हिन्दी (Hindi)';
      case AppLanguage.gujarati:
        return 'ગુજરાતી (Gujarati)';
      case AppLanguage.marathi:
        return 'मराठी (Marathi)';
    }
  }

  void setLanguage(AppLanguage lang) {
    _currentLanguage = lang;
    notifyListeners();
  }

  // Common UI Strings Dictionary
  static final Map<AppLanguage, Map<String, String>> _localizedValues = {
    AppLanguage.english: {
      'app_title': 'KisanConnect',
      'farmer_dashboard': 'Farmer Dashboard',
      'marketplace': 'Marketplace',
      'bulk_b2b': 'B2B Wholesale',
      'logistics': 'Logistics & OTP',
      'ai_assistant': 'Kisan AI Voice Assistant',
      'subscriptions': 'Auto-Subscriptions',
      'login': 'Login / Signup',
      'role_farmer': 'Farmer',
      'role_consumer': 'Consumer',
      'role_bulk_buyer': 'Bulk Buyer',
      'role_logistics': 'Logistics Driver',
      'role_admin': 'Admin',
      'search_placeholder': 'Search produce, crops, locations...',
      'freshness': 'Freshness',
      'mandi_price': 'Mandi Price Benchmark',
      'add_crop': '+ Add New Crop Listing',
      'verify_otp': 'Verify Delivery OTP',
      'cart': 'My Basket',
      'checkout': 'Proceed to Checkout',
      'logout': 'Logout',
    },
    AppLanguage.hindi: {
      'app_title': 'किसान कनेक्ट',
      'farmer_dashboard': 'किसान डैशबोर्ड',
      'marketplace': 'मंडी / बाज़ार',
      'bulk_b2b': 'थोक / बी2बी व्यापार',
      'logistics': 'लॉजिस्टिक्स एवं ओटीपी',
      'ai_assistant': 'किसान एआई सहायता',
      'subscriptions': 'ऑटो सब्सक्रिप्शन',
      'login': 'लॉगिन / साइनअप',
      'role_farmer': 'किसान',
      'role_consumer': 'उपभोक्ता',
      'role_bulk_buyer': 'थोक खरीदार',
      'role_logistics': 'ड्राइवर / लॉजिस्टिक्स',
      'role_admin': 'व्यवस्थापक',
      'search_placeholder': 'फसल, उत्पाद, स्थान खोजें...',
      'freshness': 'ताज़गी मान',
      'mandi_price': 'मंडी भाव',
      'add_crop': '+ नई फसल जोड़ें',
      'verify_otp': 'ओटीपी सत्यापित करें',
      'cart': 'मेरी टोकरी',
      'checkout': 'भुगतान करें',
      'logout': 'लॉगआउट',
    },
    AppLanguage.gujarati: {
      'app_title': 'કિસાન કનેક્ટ',
      'farmer_dashboard': 'ખેડૂત ડેશબોર્ડ',
      'marketplace': 'બજાર',
      'bulk_b2b': 'જથ્થાબંધ બી2બી',
      'logistics': 'લોજિસ્ટિક્સ અને ઓટીપી',
      'ai_assistant': 'કિસાન એઆઈ આસિસ્ટન્ટ',
      'subscriptions': 'ઓટો સબ્સ્ક્રિપ્શન',
      'login': 'લોગિન / સાઇનઅપ',
      'role_farmer': 'ખેડૂત',
      'role_consumer': 'ગ્રાહક',
      'role_bulk_buyer': 'જથ્થાબંધ ખરીદનાર',
      'role_logistics': 'ડ્રાઇવર / લોજિસ્ટિક્સ',
      'role_admin': 'એડમિન',
      'search_placeholder': 'પાક, પાકો, સ્થાન શોધો...',
      'freshness': 'તાજગી તાજગી',
      'mandi_price': 'માર્કેટ યાર્ડ ભાવ',
      'add_crop': '+ નવો પાક ઉમેરો',
      'verify_otp': 'ઓટીપી ચકાસો',
      'cart': 'મારી ટોપલી',
      'checkout': 'ખરીદી પૂરી કરો',
      'logout': 'લોગઆઉટ',
    },
    AppLanguage.marathi: {
      'app_title': 'किसान कनेक्ट',
      'farmer_dashboard': 'शेतकरी डॅशबोर्ड',
      'marketplace': 'बाजारपेठ',
      'bulk_b2b': 'घाऊक बी२बी',
      'logistics': 'लॉजिस्टिक्स आणि ओटीपी',
      'ai_assistant': 'किसान एआय सहाय्यक',
      'subscriptions': 'ऑटो सबस्क्रिप्शन',
      'login': 'लॉगिन / साइनअप',
      'role_farmer': 'शेतकरी',
      'role_consumer': 'ग्राहक',
      'role_bulk_buyer': 'घाऊक खरेदीदार',
      'role_logistics': 'ड्रायव्हर / लॉजिस्टिक्स',
      'role_admin': 'अ‍ॅडमिन',
      'search_placeholder': 'पिके, शेतमाल शोधा...',
      'freshness': 'ताजेपणा मान',
      'mandi_price': 'बाजार समिती भाव',
      'add_crop': '+ नवीन पीक जोडा',
      'verify_otp': 'ओटीपी सत्यापित करा',
      'cart': 'माझी टोपली',
      'checkout': 'खरेदी पूर्ण करा',
      'logout': 'लॉगआउट',
    },
  };

  String getText(String key) {
    final langMap = _localizedValues[_currentLanguage] ?? _localizedValues[AppLanguage.english]!;
    return langMap[key] ?? _localizedValues[AppLanguage.english]![key] ?? key;
  }
}
