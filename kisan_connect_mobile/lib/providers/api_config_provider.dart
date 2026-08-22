import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfigProvider with ChangeNotifier {
  static const String _keyBaseUrl = 'kisan_connect_api_base_url';
  static const String _defaultAndroidUrl = 'http://10.0.2.2:8000/api';

  String _baseUrl = _defaultAndroidUrl;
  final SharedPreferences _prefs;

  ApiConfigProvider(this._prefs) {
    _baseUrl = _prefs.getString(_keyBaseUrl) ?? _defaultAndroidUrl;
  }

  String get baseUrl => _baseUrl;

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
