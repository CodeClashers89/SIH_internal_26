import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';

class AuthProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  final ApiClient _apiClient;

  Map<String, dynamic>? _user;
  bool _loading = true;

  AuthProvider(this._prefs, this._apiClient) {
    _apiClient.onUnauthorized = logout;
    _loadSession();
  }

  SharedPreferences get prefs => _prefs;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  String? get role => _user?['role'];
  bool get isVerified => _user?['is_verified'] ?? false;

  void _loadSession() {
    final userStr = _prefs.getString('user');
    final token = _prefs.getString('token');
    if (userStr != null && token != null) {
      try {
        _user = jsonDecode(userStr);
      } catch (_) {
        _user = null;
      }
    }
    _loading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final data = await _apiClient.post('/auth/login/', {
        'username': username,
        'password': password,
      });
      
      final token = data['access'];
      final userData = data['user'];
      
      await _prefs.setString('token', token);
      await _prefs.setString('user', jsonEncode(userData));
      
      _user = userData;
      notifyListeners();
      
      return {'success': true, 'user': userData};
    } on ApiException catch (e) {
      return {'success': false, 'error': e.message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> signUpData) async {
    try {
      final response = await _apiClient.post('/auth/register/', signUpData);
      return {'success': true, 'user': response};
    } on ApiException catch (e) {
      return {'success': false, 'error': e.message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    try {
      final response = await _apiClient.post('/auth/verify-otp/', {
        'phone': phone,
        'otp': otp,
      });

      // Update local state if this OTP is for the currently logged in user
      if (_user != null && _user?['phone'] == phone) {
        _user!['is_verified'] = true;
        await _prefs.setString('user', jsonEncode(_user));
        notifyListeners();
      }
      return {'success': true, 'message': response['message'] ?? 'OTP Verified successfully'};
    } on ApiException catch (e) {
      return {'success': false, 'error': e.message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<void> logout() async {
    await _prefs.remove('token');
    await _prefs.remove('user');
    _user = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>> submitKyc(String kycDoc) async {
    try {
      final response = await _apiClient.post('/farmer/kyc/', {
        'kyc_document': kycDoc,
      });
      final updatedUser = response['user'];
      await _prefs.setString('user', jsonEncode(updatedUser));
      _user = updatedUser;
      notifyListeners();
      return {'success': true};
    } on ApiException catch (e) {
      return {'success': false, 'error': e.message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
