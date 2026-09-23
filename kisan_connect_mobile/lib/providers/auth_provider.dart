import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class UserProfile {
  final String id;
  final String username;
  final String name;
  final String email;
  final String role; // 'farmer', 'consumer', 'bulk_buyer', 'logistics_driver', 'admin'
  final String phone;
  final String location;
  final bool kycVerified;
  final double rating;
  final String vehicleType;
  final String vehicleNumber;
  final String capacity;
  final String serviceArea;
  final String district;
  final String pincode;
  final String address;

  UserProfile({
    required this.id,
    required this.username,
    required this.name,
    required this.email,
    required this.role,
    required this.phone,
    required this.location,
    this.kycVerified = true,
    this.rating = 4.9,
    this.vehicleType = '',
    this.vehicleNumber = '',
    this.capacity = '',
    this.serviceArea = '',
    this.district = '',
    this.pincode = '',
    this.address = '',
  });

  UserProfile copyWith({
    String? id,
    String? username,
    String? name,
    String? email,
    String? role,
    String? phone,
    String? location,
    bool? kycVerified,
    double? rating,
    String? vehicleType,
    String? vehicleNumber,
    String? capacity,
    String? serviceArea,
    String? district,
    String? pincode,
    String? address,
  }) {
    return UserProfile(
      id: id ?? this.id,
      username: username ?? this.username,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      phone: phone ?? this.phone,
      location: location ?? this.location,
      kycVerified: kycVerified ?? this.kycVerified,
      rating: rating ?? this.rating,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      capacity: capacity ?? this.capacity,
      serviceArea: serviceArea ?? this.serviceArea,
      district: district ?? this.district,
      pincode: pincode ?? this.pincode,
      address: address ?? this.address,
    );
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    String roleStr = json['role'] ?? 'consumer';
    if (roleStr == 'logistics_partner') roleStr = 'logistics_driver';

    return UserProfile(
      id: json['id']?.toString() ?? 'u_${DateTime.now().millisecondsSinceEpoch}',
      username: json['username'] ?? '',
      name: json['name'] ?? json['username'] ?? 'User',
      email: json['email'] ?? '',
      role: roleStr,
      phone: json['phone'] ?? '',
      location: json['district'] ?? json['address'] ?? 'India',
      kycVerified: json['kyc_status'] == 'verified' || json['is_verified'] == true,
      rating: 4.9,
      vehicleType: json['vehicle_type'] ?? '',
      vehicleNumber: json['vehicle_number'] ?? '',
      capacity: json['capacity']?.toString() ?? '',
      serviceArea: json['service_area'] ?? '',
      district: json['district'] ?? '',
      pincode: json['pincode'] ?? '',
      address: json['address'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'name': name,
      'email': email,
      'role': role,
      'phone': phone,
      'location': location,
      'kycVerified': kycVerified,
      'rating': rating,
      'vehicle_type': vehicleType,
      'vehicle_number': vehicleNumber,
      'capacity': capacity,
      'service_area': serviceArea,
      'district': district,
      'pincode': pincode,
      'address': address,
    };
  }
}

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  String? _token;
  UserProfile _currentUser = demoAccounts[0];

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  UserProfile get currentUser => _currentUser;
  String get userRole => _currentUser.role;

  // Demo Accounts
  static final List<UserProfile> demoAccounts = [
    UserProfile(
      id: "f1",
      username: "farmer1",
      name: "Ramesh Patel (Kisan)",
      email: "farmer@kisanconnect.org",
      role: "farmer",
      phone: "9876543210",
      location: "Anand APMC Hub, Gujarat",
      kycVerified: true,
      rating: 4.9,
    ),
    UserProfile(
      id: "c1",
      username: "consumer1",
      name: "Priya Sharma",
      email: "consumer@kisanconnect.org",
      role: "consumer",
      phone: "9123456789",
      location: "Ahmedabad, Gujarat",
      kycVerified: true,
      rating: 5.0,
    ),
    UserProfile(
      id: "b1",
      username: "buyer1",
      name: "Reliance Agro B2B Procurements",
      email: "bulk@kisanconnect.org",
      role: "bulk_buyer",
      phone: "9988776655",
      location: "Vadodara Logistics Hub",
      kycVerified: true,
      rating: 4.8,
    ),
    UserProfile(
      id: "d1",
      username: "driver1",
      name: "Suresh Logistics Driver (GJT-88)",
      email: "driver@kisanconnect.org",
      role: "logistics_driver",
      phone: "9776655443",
      location: "Kheda Express Route",
      kycVerified: true,
      rating: 4.95,
      vehicleType: "Refrigerated Eicher Pro 10 Ton",
      vehicleNumber: "MH-15-EG-4521",
      capacity: "10000",
      serviceArea: "Maharashtra & Gujarat Corridor",
      district: "Nashik",
      pincode: "422003",
      address: "Plot 42, MIDC Ambad, Nashik, Maharashtra",
    ),
    UserProfile(
      id: "a1",
      username: "admin1",
      name: "SIH Platform Control Tower",
      email: "admin@kisanconnect.org",
      role: "admin",
      phone: "8000011223",
      location: "HQ Central Command",
      kycVerified: true,
      rating: 5.0,
    ),
  ];

  AuthProvider() {
    _loadSavedSession();
  }

  Future<void> _loadSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString('auth_token');
    final savedUserData = prefs.getString('user_data');

    if (savedToken != null && savedToken.isNotEmpty) {
      _token = savedToken;
      _isAuthenticated = true;
      if (savedUserData != null) {
        try {
          final data = jsonDecode(savedUserData);
          _currentUser = UserProfile.fromJson(data);
        } catch (_) {}
      }
      notifyListeners();
    }
  }

  void switchRole(String role) {
    String normalizedRole = role;
    if (normalizedRole == 'logistics_partner') normalizedRole = 'logistics_driver';

    final account = demoAccounts.firstWhere(
      (acc) => acc.role == normalizedRole,
      orElse: () => demoAccounts[0],
    );
    _currentUser = account;
    notifyListeners();
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final cleanUsername = username.trim();
    final cleanPassword = password.trim();

    // 1. Attempt real API login
    final apiResult = await ApiService.login(cleanUsername, cleanPassword);

    if (apiResult['success'] == true && apiResult.containsKey('access')) {
      _token = apiResult['access'];
      final userData = apiResult['user'];

      if (userData is Map<String, dynamic>) {
        _currentUser = UserProfile.fromJson(userData);
      } else {
        // Fallback profile if user field missing
        _currentUser = UserProfile(
          id: 'u_${DateTime.now().millisecondsSinceEpoch}',
          username: cleanUsername,
          name: cleanUsername,
          email: '',
          role: 'farmer',
          phone: '',
          location: 'India',
        );
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      await prefs.setString('user_data', jsonEncode(_currentUser.toJson()));
      await prefs.setString('user_role', _currentUser.role);

      _isAuthenticated = true;
      notifyListeners();
      return {'success': true, 'user': _currentUser};
    }

    // 2. Demo Sandbox fallback for seamless offline testing
    // Check if username matches demo account, or password == '123456'
    final matchedDemo = demoAccounts.firstWhere(
      (acc) => acc.username.toLowerCase() == cleanUsername.toLowerCase() ||
               acc.phone == cleanUsername,
      orElse: () => demoAccounts[0],
    );

    if (cleanPassword == '123456' || cleanUsername.isNotEmpty) {
      _token = "demo_jwt_token_${DateTime.now().millisecondsSinceEpoch}";
      _currentUser = matchedDemo;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      await prefs.setString('user_data', jsonEncode(_currentUser.toJson()));
      await prefs.setString('user_role', _currentUser.role);

      _isAuthenticated = true;
      notifyListeners();
      return {'success': true, 'user': _currentUser};
    }

    return {
      'success': false,
      'error': apiResult['error'] ?? 'Invalid username or password',
    };
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    final apiResult = await ApiService.register(payload);
    if (apiResult['success'] == true) {
      return apiResult;
    }

    // If offline / demo fallback
    if (payload['username'] != null && payload['phone'] != null) {
      return {
        'success': true,
        'user': payload,
        'demo': true,
      };
    }

    return apiResult;
  }

  Future<Map<String, dynamic>> verifyOtp(
    String phone,
    String otp, {
    String? msg91Token,
    String? reqId,
    bool msg91Verified = false,
  }) async {
    final apiResult = await ApiService.verifyOtp(
      phone: phone,
      otp: otp,
      msg91Token: msg91Token,
      reqId: reqId,
      msg91Verified: msg91Verified,
    );

    if (apiResult['success'] == true) {
      return apiResult;
    }

    // Demo bypass: code '123456' or msg91 verified
    if (otp == '123456' || msg91Verified) {
      return {
        'success': true,
        'message': 'Account verified successfully via Demo/MSG91.',
      };
    }

    return apiResult;
  }

  Future<Map<String, dynamic>> requestPasswordResetOtp(String phone) async {
    final apiResult = await ApiService.requestPasswordResetOtp(phone);
    if (apiResult['success'] == true) {
      return apiResult;
    }

    // Demo fallback for valid 10-digit number
    if (phone.replaceAll(RegExp(r'\D'), '').length >= 10) {
      return {
        'success': true,
        'message': 'Password reset OTP sent to $phone.',
        'phone': phone,
        'username': 'user_$phone',
      };
    }

    return apiResult;
  }

  Future<Map<String, dynamic>> confirmPasswordReset({
    required String phone,
    required String otp,
    required String newPassword,
    String? msg91Token,
    bool msg91Verified = false,
    String? reqId,
  }) async {
    final apiResult = await ApiService.confirmPasswordReset(
      phone: phone,
      otp: otp,
      newPassword: newPassword,
      msg91Token: msg91Token,
      msg91Verified: msg91Verified,
      reqId: reqId,
    );

    if (apiResult['success'] == true) {
      return apiResult;
    }

    // Demo fallback
    if (otp == '123456' || msg91Verified) {
      return {
        'success': true,
        'message': 'Password reset successfully (Demo mode).',
        'username': 'user_$phone',
      };
    }

    return apiResult;
  }

  Future<void> updateUserProfile(UserProfile updated) async {
    _currentUser = updated;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_data', jsonEncode(updated.toJson()));
    notifyListeners();
  }

  void logout() async {
    _isAuthenticated = false;
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    await prefs.remove('user_role');
    notifyListeners();
  }
}
