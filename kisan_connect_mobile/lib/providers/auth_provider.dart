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
  });
}

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = true; // Default logged in for instant preview
  String? _token = "demo_jwt_token_12345";
  UserProfile _currentUser = UserProfile(
    id: "f1",
    username: "ramesh_farmer",
    name: "Ramesh Patel (Kisan)",
    email: "ramesh.patel@kisanconnect.org",
    role: "farmer",
    phone: "+91 98765 43210",
    location: "Anand, Gujarat (District APMC)",
    kycVerified: true,
    rating: 4.9,
  );

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  UserProfile get currentUser => _currentUser;
  String get userRole => _currentUser.role;

  // Demo Accounts
  static final List<UserProfile> demoAccounts = [
    UserProfile(
      id: "f1",
      username: "ramesh_farmer",
      name: "Ramesh Patel",
      email: "farmer@kisanconnect.org",
      role: "farmer",
      phone: "+91 98765 43210",
      location: "Anand APMC Hub, Gujarat",
      kycVerified: true,
      rating: 4.9,
    ),
    UserProfile(
      id: "c1",
      username: "priya_consumer",
      name: "Priya Sharma",
      email: "consumer@kisanconnect.org",
      role: "consumer",
      phone: "+91 91234 56789",
      location: "Ahmedabad, Gujarat",
      kycVerified: true,
      rating: 5.0,
    ),
    UserProfile(
      id: "b1",
      username: "reliance_fresh_buyer",
      name: "Reliance Agro B2B Procurements",
      email: "bulk@kisanconnect.org",
      role: "bulk_buyer",
      phone: "+91 99887 76655",
      location: "Vadodara Logistics Hub",
      kycVerified: true,
      rating: 4.8,
    ),
    UserProfile(
      id: "d1",
      username: "suresh_logistics",
      name: "Suresh Logistics Driver (GJT-88)",
      email: "driver@kisanconnect.org",
      role: "logistics_driver",
      phone: "+91 97766 55443",
      location: "Kheda Express Route",
      kycVerified: true,
      rating: 4.95,
    ),
    UserProfile(
      id: "a1",
      username: "admin_kisan",
      name: "SIH Platform Control Tower",
      email: "admin@kisanconnect.org",
      role: "admin",
      phone: "+91 80000 11223",
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
    _token = prefs.getString('auth_token') ?? "demo_jwt_token_12345";
    final savedRole = prefs.getString('user_role') ?? 'farmer';
    switchRole(savedRole);
  }

  void switchRole(String role) {
    final account = demoAccounts.firstWhere(
      (acc) => acc.role == role,
      orElse: () => demoAccounts[0],
    );
    _currentUser = account;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    final result = await ApiService.login(username, password);
    if (result.containsKey('access')) {
      _token = result['access'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      _isAuthenticated = true;
      notifyListeners();
      return true;
    }
    // Sandbox / Demo login
    if (password == '123456' || username.isNotEmpty) {
      _isAuthenticated = true;
      notifyListeners();
      return true;
    }
    return false;
  }

  void logout() async {
    _isAuthenticated = false;
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    notifyListeners();
  }
}
