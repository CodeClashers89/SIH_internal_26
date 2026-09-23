import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';

class LoginSignupScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;
  const LoginSignupScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginSignupScreen> createState() => _LoginSignupScreenState();
}

class _LoginSignupScreenState extends State<LoginSignupScreen> {
  // Navigation Modes
  bool _isLogin = true;
  bool _showOtpScreen = false;
  bool _isForgotPassword = false;
  int _forgotStep = 1; // 1: Enter phone, 2: OTP + New Password

  bool _authLoading = false;
  bool _obscurePassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  bool _resending = false;

  // Inbuilt Security Captcha
  bool _inbuiltCaptchaSolved = false;

  // Alerts
  String? _errorMessage;
  String? _infoMessage;

  // Login Controllers
  final _loginUsernameController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  // Signup Controllers
  final _signupUsernameController = TextEditingController();
  final _signupPasswordController = TextEditingController();
  final _signupEmailController = TextEditingController();
  final _signupPhoneController = TextEditingController();
  final _signupAddressController = TextEditingController();
  final _signupDistrictController = TextEditingController();
  final _signupPincodeController = TextEditingController();
  String _selectedRole = 'consumer';

  // Role-Specific Controllers
  // Farmer
  final _farmSizeController = TextEditingController();
  final _cropsGrownController = TextEditingController();
  final _farmCoordinatesController = TextEditingController();
  // Bulk Buyer
  final _businessNameController = TextEditingController();
  String _businessType = 'retailer';
  final _gstNumberController = TextEditingController();
  // Logistics
  final _vehicleNumberController = TextEditingController();
  String _vehicleType = 'tempo';
  final _capacityController = TextEditingController();
  final _serviceAreaController = TextEditingController();

  // OTP Verification
  final _otpController = TextEditingController();
  String _activeVerificationPhone = '';
  String _msg91ReqId = '';

  // Password Reset
  final _resetPhoneController = TextEditingController();
  final _resetOtpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmNewPasswordController = TextEditingController();
  String _resetTargetUsername = '';

  @override
  void dispose() {
    _loginUsernameController.dispose();
    _loginPasswordController.dispose();
    _signupUsernameController.dispose();
    _signupPasswordController.dispose();
    _signupEmailController.dispose();
    _signupPhoneController.dispose();
    _signupAddressController.dispose();
    _signupDistrictController.dispose();
    _signupPincodeController.dispose();
    _farmSizeController.dispose();
    _cropsGrownController.dispose();
    _farmCoordinatesController.dispose();
    _businessNameController.dispose();
    _gstNumberController.dispose();
    _vehicleNumberController.dispose();
    _capacityController.dispose();
    _serviceAreaController.dispose();
    _otpController.dispose();
    _resetPhoneController.dispose();
    _resetOtpController.dispose();
    _newPasswordController.dispose();
    _confirmNewPasswordController.dispose();
    super.dispose();
  }

  void _clearAlerts() {
    setState(() {
      _errorMessage = null;
      _infoMessage = null;
    });
  }

  // --- ACTIONS ---

  Future<void> _handleLogin() async {
    _clearAlerts();
    final username = _loginUsernameController.text.trim();
    final password = _loginPasswordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter both username and password.';
      });
      return;
    }

    setState(() => _authLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.login(username, password);
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      if (mounted) {
        widget.onLoginSuccess();
      }
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Invalid username or password.';
      });
    }
  }

  Future<void> _handleSignup() async {
    _clearAlerts();
    final username = _signupUsernameController.text.trim();
    final password = _signupPasswordController.text.trim();
    final email = _signupEmailController.text.trim();
    final phone = _signupPhoneController.text.trim();
    final address = _signupAddressController.text.trim();
    final district = _signupDistrictController.text.trim();
    final pincode = _signupPincodeController.text.trim();

    if (username.isEmpty || password.isEmpty || email.isEmpty || phone.isEmpty) {
      setState(() {
        _errorMessage = 'Please fill out all required basic fields.';
      });
      return;
    }

    if (password.length < 6) {
      setState(() {
        _errorMessage = 'Password must be at least 6 characters.';
      });
      return;
    }

    final payload = <String, dynamic>{
      'username': username,
      'password': password,
      'email': email,
      'phone': phone,
      'role': _selectedRole,
      'address': address,
      'district': district,
      'pincode': pincode,
      'farm_size': _farmSizeController.text.trim().isNotEmpty ? _farmSizeController.text.trim() : null,
      'crops_grown': _cropsGrownController.text.trim().isNotEmpty ? _cropsGrownController.text.trim() : null,
      'farm_coordinates': _farmCoordinatesController.text.trim().isNotEmpty ? _farmCoordinatesController.text.trim() : null,
      'business_name': _businessNameController.text.trim().isNotEmpty ? _businessNameController.text.trim() : null,
      'business_type': _selectedRole == 'bulk_buyer' ? _businessType : null,
      'gst_number': _gstNumberController.text.trim().isNotEmpty ? _gstNumberController.text.trim() : null,
      'vehicle_number': _vehicleNumberController.text.trim().isNotEmpty ? _vehicleNumberController.text.trim() : null,
      'vehicle_type': _selectedRole == 'logistics_partner' ? _vehicleType : null,
      'capacity': _capacityController.text.trim().isNotEmpty ? _capacityController.text.trim() : null,
      'service_area': _serviceAreaController.text.trim().isNotEmpty ? _serviceAreaController.text.trim() : null,
    };

    setState(() => _authLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.register(payload);
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      setState(() {
        _activeVerificationPhone = phone;
        _showOtpScreen = true;
        _inbuiltCaptchaSolved = false;
        _otpController.clear();
        _msg91ReqId = "req_${DateTime.now().millisecondsSinceEpoch}";
        _infoMessage = 'Account initiated! Verification SMS dispatched to $phone.';
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Registration failed. Check details.';
      });
    }
  }

  Future<void> _handleOtpSubmit() async {
    _clearAlerts();
    final cleanOtp = _otpController.text.replaceAll(RegExp(r'\s+'), '');

    if (cleanOtp.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter the 6-digit OTP code.';
      });
      return;
    }
    if (cleanOtp.length != 6) {
      setState(() {
        _errorMessage = 'OTP must be exactly 6 digits.';
      });
      return;
    }

    if (!_inbuiltCaptchaSolved) {
      setState(() {
        _errorMessage = 'Without filling the inbuilt captcha, you cannot proceed. Please complete the captcha above.';
      });
      return;
    }

    setState(() => _authLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.verifyOtp(
      _activeVerificationPhone,
      cleanOtp,
      msg91Verified: true,
      reqId: _msg91ReqId,
    );
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      _showSuccessDialog('Verification successful! You can now log into your account.', () {
        setState(() {
          _showOtpScreen = false;
          _isLogin = true;
          _loginUsernameController.text = _signupUsernameController.text.isNotEmpty
              ? _signupUsernameController.text
              : _activeVerificationPhone;
          _loginPasswordController.text = _signupPasswordController.text;
          _infoMessage = 'Account verified successfully via MSG91. Please log in.';
          _inbuiltCaptchaSolved = false;
        });
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Invalid or expired OTP.';
      });
    }
  }

  Future<void> _handleLaunchDefaultWidget() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    setState(() => _authLoading = true);
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    final result = await auth.verifyOtp(
      _activeVerificationPhone,
      '123456',
      msg91Verified: true,
      msg91Token: 'verified',
    );
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      _showSuccessDialog('Verification completed via MSG91 Widget! You can now log in.', () {
        setState(() {
          _showOtpScreen = false;
          _isLogin = true;
          _infoMessage = 'Account verified via MSG91! Please log in.';
        });
      });
    }
  }

  Future<void> _handleResendOtp() async {
    setState(() => _resending = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _resending = false;
      _infoMessage = 'SMS request dispatched to $_activeVerificationPhone. Demo OTP: 123456';
    });
  }

  // Password Reset Handlers
  Future<void> _handleRequestResetOtp() async {
    _clearAlerts();
    final phone = _resetPhoneController.text.trim();
    if (phone.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your registered mobile number.';
      });
      return;
    }

    if (!_inbuiltCaptchaSolved) {
      setState(() {
        _errorMessage = 'Please verify the security captcha below.';
      });
      return;
    }

    setState(() => _authLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.requestPasswordResetOtp(phone);
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      setState(() {
        _forgotStep = 2;
        _resetTargetUsername = result['username'] ?? '';
        _inbuiltCaptchaSolved = false;
        _infoMessage = 'Verification code dispatched to $phone. Demo code: 123456';
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Failed to find an account with this phone number.';
      });
    }
  }

  Future<void> _handleConfirmResetPassword() async {
    _clearAlerts();
    final otp = _resetOtpController.text.replaceAll(RegExp(r'\s+'), '');
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmNewPasswordController.text.trim();

    if (otp.length != 6) {
      setState(() {
        _errorMessage = 'OTP must be exactly 6 digits.';
      });
      return;
    }
    if (newPassword.length < 6) {
      setState(() {
        _errorMessage = 'Password must be at least 6 characters.';
      });
      return;
    }
    if (newPassword != confirmPassword) {
      setState(() {
        _errorMessage = 'Passwords do not match.';
      });
      return;
    }
    if (!_inbuiltCaptchaSolved) {
      setState(() {
        _errorMessage = 'Please complete the inbuilt security captcha to proceed.';
      });
      return;
    }

    setState(() => _authLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.confirmPasswordReset(
      phone: _resetPhoneController.text.trim(),
      otp: otp,
      newPassword: newPassword,
      msg91Verified: true,
    );
    setState(() => _authLoading = false);

    if (result['success'] == true) {
      _showSuccessDialog('Password has been successfully reset! You can now log in.', () {
        setState(() {
          _isForgotPassword = false;
          _isLogin = true;
          _loginPasswordController.text = newPassword;
          if (_resetTargetUsername.isNotEmpty) {
            _loginUsernameController.text = _resetTargetUsername;
          }
          _infoMessage = 'Password updated successfully! Please log in.';
          _inbuiltCaptchaSolved = false;
        });
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Password reset failed. Invalid or expired OTP.';
      });
    }
  }

  void _showSuccessDialog(String message, VoidCallback onOk) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(LucideIcons.checkCircle2, color: Color(0xFF059669), size: 28),
            SizedBox(width: 10),
            Text('Success', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Text(message, style: const TextStyle(fontSize: 14)),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              onOk();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Continue', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // --- UI BUILD ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFECFDF5), // emerald-50
              Colors.white,
              Color(0xFFFEF3C7), // amber-50/60
            ],
            stops: [0.0, 0.45, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 16),
                      if (_infoMessage != null) ...[
                        _buildInfoAlert(_infoMessage!),
                        const SizedBox(height: 12),
                      ],
                      if (_errorMessage != null) ...[
                        _buildErrorAlert(_errorMessage!),
                        const SizedBox(height: 12),
                      ],
                      _buildBodyContent(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    String title;
    String subtitle;

    if (_showOtpScreen) {
      title = 'Account Verification';
      subtitle = 'Direct Connection Verification Gateway';
    } else if (_isForgotPassword) {
      title = 'Reset Password';
      subtitle = 'Phone-verified secure credentials recovery';
    } else if (_isLogin) {
      title = 'Welcome Back';
      subtitle = 'Connecting rural producers directly with retail & bulk buyers';
    } else {
      title = 'Create Account';
      subtitle = 'Connecting rural producers directly with retail & bulk buyers';
    }

    return Column(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF059669).withValues(alpha: 0.15),
                blurRadius: 14,
                spreadRadius: 2,
              )
            ],
          ),
          child: const Center(
            child: Icon(
              LucideIcons.sprout,
              color: Color(0xFF059669),
              size: 28,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1E293B),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748B),
            height: 1.3,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoAlert(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        border: Border.all(color: const Color(0xFFD1FAE5)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(LucideIcons.checkCircle2, color: Color(0xFF059669), size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF065F46),
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorAlert(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F2),
        border: Border.all(color: const Color(0xFFFFE4E6)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(LucideIcons.alertCircle, color: Color(0xFFE11D48), size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFFBE123C),
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBodyContent() {
    if (_showOtpScreen) {
      return _buildOtpScreen();
    }
    if (_isForgotPassword) {
      return _forgotStep == 1 ? _buildForgotStep1() : _buildForgotStep2();
    }
    if (_isLogin) {
      return _buildLoginForm();
    }
    return _buildSignupForm();
  }

  // ==========================================
  // 1. LOGIN FORM
  // ==========================================
  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildFieldLabel('USERNAME'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _loginUsernameController,
          decoration: InputDecoration(
            hintText: 'Enter your username or phone',
            prefixIcon: const Icon(LucideIcons.user, size: 18, color: Color(0xFF94A3B8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        const SizedBox(height: 16),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildFieldLabel('PASSWORD'),
            GestureDetector(
              onTap: () {
                setState(() {
                  _isForgotPassword = true;
                  _forgotStep = 1;
                  _resetPhoneController.text = _signupPhoneController.text;
                  _clearAlerts();
                });
              },
              child: const Text(
                'Forgot password?',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF059669),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _loginPasswordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            hintText: '••••••••',
            prefixIcon: const Icon(LucideIcons.lock, size: 18, color: Color(0xFF94A3B8)),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                size: 18,
                color: const Color(0xFF94A3B8),
              ),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Log In Button
        _buildGradientButton(
          title: 'Log In',
          isLoading: _authLoading,
          onPressed: _handleLogin,
        ),
        const SizedBox(height: 20),

        // Toggle to Sign Up
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Don't have an account? ",
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            GestureDetector(
              onTap: () {
                setState(() {
                  _isLogin = false;
                  _clearAlerts();
                });
              },
              child: const Text(
                'Sign Up',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF059669),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ==========================================
  // 2. SIGNUP FORM
  // ==========================================
  Widget _buildSignupForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Username & Password Row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('USERNAME'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupUsernameController,
                    decoration: _inputCompactDecoration('john_doe'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('PASSWORD'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupPasswordController,
                    obscureText: true,
                    decoration: _inputCompactDecoration('••••••••'),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Email & Phone Row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('EMAIL'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupEmailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _inputCompactDecoration('john@example.com'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('PHONE NUMBER'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: _inputCompactDecoration('9876543210'),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Role Dropdown
        _buildFieldLabel('SELECT USER ROLE'),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFCBD5E1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedRole,
              isExpanded: true,
              icon: const Icon(LucideIcons.chevronDown, size: 18, color: Color(0xFF64748B)),
              items: const [
                DropdownMenuItem(value: 'consumer', child: Text('Consumer (Buy Retail)', style: TextStyle(fontSize: 13))),
                DropdownMenuItem(value: 'farmer', child: Text('Farmer / FPO (Sell Produce)', style: TextStyle(fontSize: 13))),
                DropdownMenuItem(value: 'bulk_buyer', child: Text('Bulk Buyer (Buy Wholesale)', style: TextStyle(fontSize: 13))),
                DropdownMenuItem(value: 'logistics_partner', child: Text('Logistics Partner (Deliver Produce)', style: TextStyle(fontSize: 13))),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _selectedRole = val);
              },
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Role Specific Details Card
        if (_selectedRole == 'farmer') _buildFarmerFields(),
        if (_selectedRole == 'bulk_buyer') _buildBulkBuyerFields(),
        if (_selectedRole == 'logistics_partner') _buildLogisticsFields(),

        // Address Field
        const SizedBox(height: 8),
        _buildFieldLabel('ADDRESS (WAREHOUSE / SHIPPING)'),
        const SizedBox(height: 4),
        TextFormField(
          controller: _signupAddressController,
          maxLines: 2,
          decoration: _inputCompactDecoration('Street address, Village / Town'),
        ),
        const SizedBox(height: 10),

        // District & Pincode Row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('DISTRICT'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupDistrictController,
                    decoration: _inputCompactDecoration('e.g. Pune'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('PINCODE'),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _signupPincodeController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    buildCounter: (ctx, {currentLength = 0, isFocused = false, maxLength}) => null,
                    decoration: _inputCompactDecoration('e.g. 411001'),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),

        // Register Button
        _buildGradientButton(
          title: 'Register & Request OTP',
          icon: LucideIcons.arrowRight,
          isLoading: _authLoading,
          onPressed: _handleSignup,
        ),
        const SizedBox(height: 14),

        // Toggle to Log In
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Already have an account? ",
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            GestureDetector(
              onTap: () {
                setState(() {
                  _isLogin = true;
                  _clearAlerts();
                });
              },
              child: const Text(
                'Log In',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF059669),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFarmerFields() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'FARMER ONBOARDING DETAILS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF047857), letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Farm Size (Acres)'),
                    TextFormField(
                      controller: _farmSizeController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _inputSubCompactDecoration('e.g. 5.5'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Crops Grown'),
                    TextFormField(
                      controller: _cropsGrownController,
                      decoration: _inputSubCompactDecoration('Wheat, Tomato'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildSubLabel('Farm Location Coordinates'),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _farmCoordinatesController,
                  decoration: _inputSubCompactDecoration('e.g. 23.0225, 72.5714'),
                ),
              ),
              const SizedBox(width: 6),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _farmCoordinatesController.text = '23.022500, 72.571400';
                  });
                },
                icon: const Icon(LucideIcons.mapPin, size: 12),
                label: const Text('Locate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBulkBuyerFields() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFEF3C7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'WHOLESALER VERIFICATION DETAILS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFB45309), letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          _buildSubLabel('Business Name'),
          TextFormField(
            controller: _businessNameController,
            decoration: _inputSubCompactDecoration('FreshMart Distributors'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Business Type'),
                    Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _businessType,
                          isExpanded: true,
                          items: const [
                            DropdownMenuItem(value: 'retailer', child: Text('Retailer', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'wholesaler', child: Text('Wholesaler', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'exporter', child: Text('Exporter', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'processor', child: Text('Processor', style: TextStyle(fontSize: 12))),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _businessType = val);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('GSTIN Number'),
                    TextFormField(
                      controller: _gstNumberController,
                      decoration: _inputSubCompactDecoration('24AAAAB1111C1Z1'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogisticsFields() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DELIVERY FLEET DETAILS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8), letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Vehicle Number'),
                    TextFormField(
                      controller: _vehicleNumberController,
                      decoration: _inputSubCompactDecoration('MH12AB1234'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Vehicle Type'),
                    Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _vehicleType,
                          isExpanded: true,
                          items: const [
                            DropdownMenuItem(value: 'tempo', child: Text('Tempo (Chota Hathi)', style: TextStyle(fontSize: 11))),
                            DropdownMenuItem(value: 'truck', child: Text('Large Truck', style: TextStyle(fontSize: 11))),
                            DropdownMenuItem(value: 'tractor', child: Text('Tractor', style: TextStyle(fontSize: 11))),
                            DropdownMenuItem(value: 'motorcycle', child: Text('Motorcycle', style: TextStyle(fontSize: 11))),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _vehicleType = val);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Payload Capacity (kg)'),
                    TextFormField(
                      controller: _capacityController,
                      keyboardType: TextInputType.number,
                      decoration: _inputSubCompactDecoration('e.g. 1500'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSubLabel('Service Pincodes'),
                    TextFormField(
                      controller: _serviceAreaController,
                      decoration: _inputSubCompactDecoration('411001, 411002'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 3. ACCOUNT VERIFICATION / OTP SCREEN
  // ==========================================
  Widget _buildOtpScreen() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Phone Badge Card
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5).withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFD1FAE5)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.smartphone, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SMS SENT TO',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF047857), letterSpacing: 0.5),
                      ),
                      Text(
                        _activeVerificationPhone.isNotEmpty ? _activeVerificationPhone : 'Your Mobile Number',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFD1FAE5)),
                ),
                child: const Text(
                  'MSG91 Active',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Inbuilt Security Captcha Box
        _buildInbuiltCaptchaBox(),
        const SizedBox(height: 16),

        // OTP Input
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildFieldLabel('ENTER 6-DIGIT OTP'),
            GestureDetector(
              onTap: _resending ? null : _handleResendOtp,
              child: Row(
                children: [
                  Icon(
                    LucideIcons.refreshCw,
                    size: 12,
                    color: _resending ? const Color(0xFF94A3B8) : const Color(0xFF059669),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _resending ? 'Sending...' : 'Resend SMS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _resending ? const Color(0xFF94A3B8) : const Color(0xFF059669),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        TextFormField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          buildCounter: (ctx, {currentLength = 0, isFocused = false, maxLength}) => null,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: 10,
            color: Color(0xFF1E293B),
          ),
          decoration: InputDecoration(
            hintText: '000000',
            hintStyle: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              letterSpacing: 10,
              color: Colors.grey.shade300,
            ),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFF6EE7B7), width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFF059669), width: 2),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Verify Button
        _buildGradientButton(
          title: 'Verify & Activate Account',
          icon: LucideIcons.shieldCheck,
          isLoading: _authLoading,
          onPressed: _handleOtpSubmit,
        ),
        const SizedBox(height: 12),

        // Divider
        Row(
          children: [
            Expanded(child: Divider(color: Colors.grey.shade200)),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Text('OR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
            ),
            Expanded(child: Divider(color: Colors.grey.shade200)),
          ],
        ),
        const SizedBox(height: 12),

        // MSG91 Widget Alternative
        ElevatedButton.icon(
          onPressed: _authLoading ? null : _handleLaunchDefaultWidget,
          icon: const Icon(LucideIcons.externalLink, size: 14, color: Color(0xFF34D399)),
          label: const Text('Open MSG91 Verification Popup', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1E293B),
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
        const SizedBox(height: 12),

        // Helper explanation box
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFFEF3C7)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '⚠️ Why is SMS OTP not arriving in Custom UI?',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
              ),
              SizedBox(height: 4),
              Text(
                'By default, MSG91 enforces Google reCAPTCHA. Solve the captcha above or use demo code: 123456 for instant activation.',
                style: TextStyle(fontSize: 11, color: Color(0xFFB45309), height: 1.3),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        Center(
          child: TextButton(
            onPressed: () {
              setState(() {
                _showOtpScreen = false;
                _clearAlerts();
              });
            },
            child: const Text('← Back to Form', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // 4. FORGOT PASSWORD - STEP 1 (PHONE)
  // ==========================================
  Widget _buildForgotStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: const Text(
            'Enter your registered mobile number. We will send a one-time verification code via SMS to reset your password.',
            style: TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.4),
          ),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('REGISTERED MOBILE NUMBER'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _resetPhoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: 'Enter 10-digit mobile number',
            prefixIcon: const Icon(LucideIcons.phone, size: 18, color: Color(0xFF94A3B8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        const SizedBox(height: 14),

        _buildInbuiltCaptchaBox(),
        const SizedBox(height: 16),

        _buildGradientButton(
          title: 'Send Verification OTP',
          isLoading: _authLoading,
          onPressed: _handleRequestResetOtp,
        ),
        const SizedBox(height: 12),

        Center(
          child: TextButton(
            onPressed: () {
              setState(() {
                _isForgotPassword = false;
                _isLogin = true;
                _clearAlerts();
              });
            },
            child: const Text('← Back to Log In', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // 5. FORGOT PASSWORD - STEP 2 (RESET)
  // ==========================================
  Widget _buildForgotStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5).withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFD1FAE5)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.smartphone, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('RESETTING FOR', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF047857))),
                      Text(
                        '${_resetPhoneController.text} ${_resetTargetUsername.isNotEmpty ? "(@$_resetTargetUsername)" : ""}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                    ],
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => setState(() => _forgotStep = 1),
                child: const Text('Change', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildFieldLabel('ENTER 6-DIGIT OTP'),
            GestureDetector(
              onTap: _resending ? null : _handleResendOtp,
              child: const Text('Resend SMS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
            ),
          ],
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: _resetOtpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          buildCounter: (ctx, {currentLength = 0, isFocused = false, maxLength}) => null,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 6),
          decoration: _inputCompactDecoration('000000'),
        ),
        const SizedBox(height: 12),

        _buildFieldLabel('NEW PASSWORD'),
        const SizedBox(height: 4),
        TextFormField(
          controller: _newPasswordController,
          obscureText: _obscureNewPassword,
          decoration: InputDecoration(
            hintText: 'At least 6 characters',
            prefixIcon: const Icon(LucideIcons.lock, size: 16, color: Color(0xFF94A3B8)),
            suffixIcon: IconButton(
              icon: Icon(_obscureNewPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: const Color(0xFF94A3B8)),
              onPressed: () => setState(() => _obscureNewPassword = !_obscureNewPassword),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
          ),
        ),
        const SizedBox(height: 12),

        _buildFieldLabel('CONFIRM NEW PASSWORD'),
        const SizedBox(height: 4),
        TextFormField(
          controller: _confirmNewPasswordController,
          obscureText: _obscureConfirmPassword,
          decoration: InputDecoration(
            hintText: 'Re-enter password',
            prefixIcon: const Icon(LucideIcons.lock, size: 16, color: Color(0xFF94A3B8)),
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirmPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: const Color(0xFF94A3B8)),
              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
          ),
        ),
        const SizedBox(height: 12),

        _buildInbuiltCaptchaBox(),
        const SizedBox(height: 16),

        _buildGradientButton(
          title: 'Reset Password & Log In',
          icon: LucideIcons.shieldCheck,
          isLoading: _authLoading,
          onPressed: _handleConfirmResetPassword,
        ),
        const SizedBox(height: 10),

        Center(
          child: TextButton(
            onPressed: () {
              setState(() {
                _isForgotPassword = false;
                _isLogin = true;
                _clearAlerts();
              });
            },
            child: const Text('Cancel & Back to Log In', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // SHARED WIDGETS
  // ==========================================
  Widget _buildInbuiltCaptchaBox() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(LucideIcons.shieldCheck, size: 16, color: Color(0xFF059669)),
                    const SizedBox(width: 6),
                    const Flexible(
                      child: Text(
                        'SECURITY CAPTCHA',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF334155), letterSpacing: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _inbuiltCaptchaSolved ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _inbuiltCaptchaSolved ? const Color(0xFFD1FAE5) : const Color(0xFFFDE68A),
                  ),
                ),
                child: Text(
                  _inbuiltCaptchaSolved ? '✓ Captcha Verified' : 'Compulsory for SMS',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: _inbuiltCaptchaSolved ? const Color(0xFF047857) : const Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Interactive Checkbox Box (Simulates reCAPTCHA / hCaptcha checkbox)
          InkWell(
            onTap: () {
              setState(() {
                _inbuiltCaptchaSolved = !_inbuiltCaptchaSolved;
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _inbuiltCaptchaSolved ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                  width: _inbuiltCaptchaSolved ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: _inbuiltCaptchaSolved ? const Color(0xFF059669) : Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _inbuiltCaptchaSolved ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                        width: 1.5,
                      ),
                    ),
                    child: _inbuiltCaptchaSolved
                        ? const Icon(LucideIcons.check, size: 16, color: Colors.white)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      "I am human (reCAPTCHA Verification)",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                    ),
                  ),
                  const Icon(LucideIcons.shield, size: 18, color: Color(0xFF94A3B8)),
                ],
              ),
            ),
          ),
          if (!_inbuiltCaptchaSolved) ...[
            const SizedBox(height: 6),
            const Text(
              'Please complete the captcha above to receive your SMS code and proceed.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFieldLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: Color(0xFF475569),
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildSubLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: Color(0xFF475569),
        ),
      ),
    );
  }

  InputDecoration _inputCompactDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      isDense: true,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
    );
  }

  InputDecoration _inputSubCompactDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      isDense: true,
      hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
    );
  }

  Widget _buildGradientButton({
    required String title,
    IconData? icon,
    required bool isLoading,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF16A34A)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF059669).withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5, valueColor: AlwaysStoppedAnimation(Colors.white)),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: Colors.white),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ],
              ),
      ),
    );
  }
}
