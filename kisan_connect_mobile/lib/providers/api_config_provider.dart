import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfigProvider with ChangeNotifier {
  static const String _keyBaseUrl = 'kisan_connect_api_base_url';
  static const String _keySubUrl = 'kisan_connect_api_sub_url';
  static const String _defaultAndroidUrl = 'http://10.0.2.2:8000/api';
  static const String _defaultSubUrl = 'http://10.0.2.2:8001/api/v1/subscription';

  String _baseUrl = _defaultAndroidUrl;
  String _subscriptionUrl = _defaultSubUrl;
  final SharedPreferences _prefs;

  ApiConfigProvider(this._prefs) {
    _baseUrl = _prefs.getString(_keyBaseUrl) ?? _defaultAndroidUrl;
    _subscriptionUrl = _prefs.getString(_keySubUrl) ?? _defaultSubUrl;
  }

  String get baseUrl => _baseUrl;
  String get subscriptionUrl => _subscriptionUrl;

  Future<void> updateConfig(String newBaseUrl, String newSubUrl) async {
    // Sanitize Base URL
    String sanitizedBase = newBaseUrl.trim();
    if (!sanitizedBase.endsWith('/api') && !sanitizedBase.endsWith('/api/')) {
      if (sanitizedBase.endsWith('/')) {
        sanitizedBase = '${sanitizedBase}api';
      } else {
        sanitizedBase = '$sanitizedBase/api';
      }
    }
    
    _baseUrl = sanitizedBase;
    _subscriptionUrl = newSubUrl.trim();

    await _prefs.setString(_keyBaseUrl, sanitizedBase);
    await _prefs.setString(_keySubUrl, _subscriptionUrl);
    notifyListeners();
  }

  Future<void> updateBaseUrl(String newUrl) async {
    // Ensure clean URL format
    String sanitized = newUrl.trim();
    if (!sanitized.endsWith('/api') && !sanitized.endsWith('/api/')) {
      if (sanitized.endsWith('/')) {
        sanitized = '${sanitized}api';
      } else {
        sanitized = '$sanitized/api';
      }
    }
    
    _baseUrl = sanitized;
    await _prefs.setString(_keyBaseUrl, sanitized);
    notifyListeners();
  }
}
