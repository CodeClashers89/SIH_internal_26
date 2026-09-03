import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';

class LoginSignupScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;
  const LoginSignupScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginSignupScreen> createState() => _LoginSignupScreenState();
}

class _LoginSignupScreenState extends State<LoginSignupScreen> {
  bool _isSignUp = false;
  String _selectedRole = 'farmer';
  final _phoneController = TextEditingController(text: '9876543210');
  final _passwordController = TextEditingController(text: '123456');
  final _nameController = TextEditingController();

  final List<Map<String, dynamic>> _roles = [
    {
      'id': 'farmer',
      'label': 'Farmer (किसान)',
      'subtitle': 'Sell Produce, Check Mandi Rates & AI Advice',
      'icon': Icons.agriculture,
      'color': const Color(0xFF16A34A),
    },
    {
      'id': 'consumer',
      'label': 'Consumer / Shopper',
      'subtitle': 'Buy Fresh Produce Directly from Farmers',
      'icon': Icons.shopping_basket_rounded,
      'color': const Color(0xFF0284C7),
    },
    {
      'id': 'bulk_buyer',
      'label': 'Bulk Buyer (B2B)',
      'subtitle': 'Wholesale Quotes, Contracts & Reverse Sourcing',
      'icon': Icons.store_mall_directory_rounded,
      'color': const Color(0xFFD97706),
    },
    {
      'id': 'logistics_driver',
      'label': 'Logistics Driver',
      'subtitle': 'Delivery Jobs & OTP Verifications',
      'icon': Icons.local_shipping_rounded,
      'color': const Color(0xFFEA580C),
    },
    {
      'id': 'admin',
      'label': 'Platform Admin',
      'subtitle': 'KYC Approvals & Command Center',
      'icon': Icons.admin_panel_settings_rounded,
      'color': const Color(0xFF9333EA),
    },
  ];

  void _handleLogin() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    authProvider.switchRole(_selectedRole);
    final success = await authProvider.login(
      _phoneController.text.trim(),
      _passwordController.text.trim(),
    );
    if (success && mounted) {
      widget.onLoginSuccess();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lang = Provider.of<LanguageProvider>(context);

    return Scaffold(
      body: SingleChildScrollView(
        child: Container(
          minHeight: MediaQuery.of(context).size.height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                theme.primaryColor.withOpacity(0.08),
                theme.scaffoldBackgroundColor,
              ],
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              // Header Branding
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.agriculture_rounded, color: Colors.white, size: 36),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    lang.getText('app_title'),
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _isSignUp ? "Create a New KisanConnect Account" : "Welcome Back! Log in to continue",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[400] : Colors.grey[700]),
              ),
              const SizedBox(height: 28),

              // Role Selector Header
              const Text(
                "Select Your Account Type:",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),

              // Roles List Cards
              Column(
                children: _roles.map((role) {
                  final isSelected = _selectedRole == role['id'];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedRole = role['id'];
                        });
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (role['color'] as Color).withOpacity(0.12)
                              : Theme.of(context).cardTheme.color,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? role['color'] as Color : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: (role['color'] as Color).withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(role['icon'] as IconData, color: role['color'] as Color, size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    role['label'] as String,
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    role['subtitle'] as String,
                                    style: TextStyle(fontSize: 12, color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[400] : Colors.grey[600]),
                                  ),
                                ],
                              ),
                            ),
                            if (isSelected)
                              Icon(Icons.check_circle_rounded, color: role['color'] as Color, size: 24),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),

              // Inputs
              if (_isSignUp) ...[
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: "Full Name / Enterprise Name",
                    prefixIcon: Icon(Icons.person),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Mobile Number / Username",
                  prefixIcon: Icon(Icons.phone_android),
                ),
              ),
              const SizedBox(height: 14),

              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Password / Master OTP",
                  prefixIcon: Icon(Icons.lock),
                  helperText: "Demo Helper: Use password '123456' for instant login",
                ),
              ),
              const SizedBox(height: 24),

              // Action Button
              ElevatedButton(
                onPressed: _handleLogin,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  _isSignUp ? "Register Account" : "Log In As ${_roles.firstWhere((r) => r['id'] == _selectedRole)['label']}",
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 14),

              // Mode Switcher
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_isSignUp ? "Already registered?" : "Don't have an account?"),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isSignUp = !_isSignUp;
                      });
                    },
                    child: Text(_isSignUp ? "Sign In" : "Sign Up"),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
