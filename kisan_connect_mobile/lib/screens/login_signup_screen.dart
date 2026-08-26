import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';

class LoginSignupScreen extends StatefulWidget {
  const LoginSignupScreen({Key? key}) : super(key: key);

  @override
  State<LoginSignupScreen> createState() => _LoginSignupScreenState();
}

class _LoginSignupScreenState extends State<LoginSignupScreen> {
  final _formKey = GlobalKey<FormState>();

  bool _isLogin = true;
  bool _showOtpScreen = false;
  bool _isLoading = false;
  String _errorMessage = '';
  String _infoMessage = '';

  // Common Form controllers
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _districtController = TextEditingController();
  final _otpController = TextEditingController();

  // Role onboarding fields
  String _selectedRole = 'consumer'; // 'farmer', 'consumer', 'bulk_buyer', 'logistics_partner'
  
  // Farmer
  final _farmSizeController = TextEditingController();
  final _cropsGrownController = TextEditingController();
  final _farmCoordsController = TextEditingController();
  
  // Bulk Buyer
  final _businessNameController = TextEditingController();
  String _businessType = 'retailer'; // 'retailer', 'wholesaler', 'food_processor', 'exporter'
  final _gstNumberController = TextEditingController();

  // Logistics
  final _vehicleNumberController = TextEditingController();
  String _vehicleType = 'tempo'; // 'tempo', 'truck', 'reefer', 'motorcycle'
  final _capacityController = TextEditingController();
  final _serviceAreaController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _pincodeController.dispose();
    _districtController.dispose();
    _otpController.dispose();
    _farmSizeController.dispose();
    _cropsGrownController.dispose();
    _farmCoordsController.dispose();
    _businessNameController.dispose();
    _gstNumberController.dispose();
    _vehicleNumberController.dispose();
    _capacityController.dispose();
    _serviceAreaController.dispose();
    super.dispose();
  }

  void _showSettingsDialog() {
    final configProvider = Provider.of<ApiConfigProvider>(context, listen: false);
    final urlController = TextEditingController(text: configProvider.baseUrl);
    final subController = TextEditingController(text: configProvider.subscriptionUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('API Connection Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Backend API server URL:',
                style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'http://10.0.2.2:8000/api',
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'B2B Subscription API URL:',
                style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: subController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'http://10.0.2.2:8001/api/v1/subscription',
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Quick Presets:',
                style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  ActionChip(
                    label: const Text('Android Emulator', style: TextStyle(fontSize: 11)),
                    onPressed: () {
                      urlController.text = 'http://10.0.2.2:8000/api';
                      subController.text = 'http://10.0.2.2:8001/api/v1/subscription';
                    },
                  ),
                  ActionChip(
                    label: const Text('Localhost (iOS/Web)', style: TextStyle(fontSize: 11)),
                    onPressed: () {
                      urlController.text = 'http://localhost:8000/api';
                      subController.text = 'http://localhost:8001/api/v1/subscription';
                    },
                  ),
                  ActionChip(
                    backgroundColor: Colors.teal.shade900,
                    label: const Text('Render Live', style: TextStyle(color: Colors.white, fontSize: 11)),
                    onPressed: () {
                      urlController.text = 'https://kishanconnect.onrender.com/api';
                      subController.text = 'http://localhost:8001/api/v1/subscription';
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Use 10.0.2.2 for Android Emulator, or local machine IP for real devices.',
                style: TextStyle(fontSize: 10, color: Colors.amber, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              await configProvider.updateConfig(urlController.text, subController.text);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('API Configuration updated!')),
              );
            },
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isLoading = true;
      _errorMessage = '';
      _infoMessage = '';
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final res = await auth.login(_usernameController.text, _passwordController.text);

    setState(() {
      _isLoading = false;
    });

    if (!res['success']) {
      setState(() {
        _errorMessage = res['error'] ?? 'Login failed';
      });
    }
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = '';
      _infoMessage = '';
    });

    final payload = {
      'username': _usernameController.text,
      'password': _passwordController.text,
      'email': _emailController.text,
      'phone': _phoneController.text,
      'address': _addressController.text,
      'pincode': _pincodeController.text,
      'district': _districtController.text,
      'role': _selectedRole,
      'farm_size': _selectedRole == 'farmer' ? (double.tryParse(_farmSizeController.text) ?? 0.0) : null,
      'crops_grown': _selectedRole == 'farmer' ? _cropsGrownController.text : null,
      'farm_coordinates': _selectedRole == 'farmer' ? _farmCoordsController.text : null,
      'business_name': _selectedRole == 'bulk_buyer' ? _businessNameController.text : null,
      'business_type': _selectedRole == 'bulk_buyer' ? _businessType : null,
      'gst_number': _selectedRole == 'bulk_buyer' ? _gstNumberController.text : null,
      'vehicle_number': _selectedRole == 'logistics_partner' ? _vehicleNumberController.text : null,
      'vehicle_type': _selectedRole == 'logistics_partner' ? _vehicleType : null,
      'capacity': _selectedRole == 'logistics_partner' ? (double.tryParse(_capacityController.text) ?? 0.0) : null,
      'service_area': _selectedRole == 'logistics_partner' ? _serviceAreaController.text : null,
    };

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final res = await auth.register(payload);

    setState(() {
      _isLoading = false;
    });

    if (res['success']) {
      setState(() {
        _showOtpScreen = true;
        _infoMessage = 'Registration initiated. Please enter the OTP sent to ${_phoneController.text}.';
      });
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Signup failed';
      });
    }
  }

  Future<void> _handleOtpVerify() async {
    if (_otpController.text.length != 6) {
      setState(() {
        _errorMessage = 'OTP must be exactly 6 digits';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final res = await auth.verifyOtp(_phoneController.text, _otpController.text);

    setState(() {
      _isLoading = false;
    });

    if (res['success']) {
      setState(() {
        _showOtpScreen = false;
        _isLogin = true;
        _otpController.clear();
        _infoMessage = 'Account verified successfully. Please log in.';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Verification successful! Please log in.')),
      );
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Verification failed';
      });
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: TextFormField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        validator: validator ?? (value) => value == null || value.isEmpty ? '$label is required' : null,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: Theme.of(context).primaryColor),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final config = Provider.of<ApiConfigProvider>(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.blueGrey),
            onPressed: _showSettingsDialog,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Brand Logo/Name
                Icon(Icons.spa, size: 64, color: Theme.of(context).primaryColor),
                const SizedBox(height: 12),
                Text(
                  _showOtpScreen
                      ? 'Account Verification'
                      : _isLogin
                          ? 'Welcome Back'
                          : 'Create Account',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Connecting rural producers directly with retail & bulk buyers',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 20),

                // Info & Error messages
                if (_infoMessage.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                      border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.2)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_infoMessage, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 13)),
                  ),
                if (_errorMessage.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      border: Border.all(color: Colors.red.shade100),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_errorMessage, style: TextStyle(color: Colors.red.shade800, fontSize: 13)),
                  ),

                // Form details
                if (_showOtpScreen) ...[
                  // OTP Screen Form
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      '💡 Demo Tip: Check Django backend terminal for SMS mock OTP, or use the master test OTP 123456.',
                      style: TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic),
                    ),
                  ),
                  _buildTextField(
                    controller: _otpController,
                    label: 'Enter 6-digit OTP',
                    icon: Icons.lock_clock,
                    keyboardType: TextInputType.number,
                    validator: (val) {
                      if (val == null || val.length != 6) return 'Enter exactly 6 digits';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      onPressed: _isLoading ? null : _handleOtpVerify,
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Verify Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => setState(() {
                      _showOtpScreen = false;
                      _infoMessage = '';
                    }),
                    child: Text('Back to Login/Signup', style: TextStyle(color: Theme.of(context).primaryColor)),
                  )
                ] else if (_isLogin) ...[
                  // Login Screen Form
                  _buildTextField(
                    controller: _usernameController,
                    label: 'Username',
                    icon: Icons.person,
                  ),
                  _buildTextField(
                    controller: _passwordController,
                    label: 'Password',
                    icon: Icons.lock,
                    obscureText: true,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      onPressed: _isLoading ? null : _handleLogin,
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Don't have an account?"),
                      TextButton(
                        onPressed: () => setState(() {
                          _isLogin = false;
                          _errorMessage = '';
                        }),
                        child: Text('Sign Up', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ] else ...[
                  // Signup Form
                  _buildTextField(
                    controller: _usernameController,
                    label: 'Username',
                    icon: Icons.person,
                  ),
                  _buildTextField(
                    controller: _passwordController,
                    label: 'Password',
                    icon: Icons.lock,
                    obscureText: true,
                  ),
                  _buildTextField(
                    controller: _emailController,
                    label: 'Email',
                    icon: Icons.email,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  _buildTextField(
                    controller: _phoneController,
                    label: 'Phone Number',
                    icon: Icons.phone,
                    keyboardType: TextInputType.phone,
                  ),
                  _buildTextField(
                    controller: _addressController,
                    label: 'Address',
                    icon: Icons.home,
                  ),
                  _buildTextField(
                    controller: _pincodeController,
                    label: 'Pincode',
                    icon: Icons.pin_drop,
                    keyboardType: TextInputType.number,
                    validator: (val) {
                      if (val == null || val.length != 6) return 'Pincode must be 6 digits';
                      return null;
                    },
                  ),
                  _buildTextField(
                    controller: _districtController,
                    label: 'District',
                    icon: Icons.location_city,
                  ),
                  
                  // Role Selector
                  DropdownButtonFormField<String>(
                    value: _selectedRole,
                    decoration: InputDecoration(
                      labelText: 'Role Type',
                      prefixIcon: Icon(Icons.supervisor_account, color: Theme.of(context).primaryColor),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'farmer', child: Text('Farmer 🌾')),
                      DropdownMenuItem(value: 'consumer', child: Text('Consumer 🛒')),
                      DropdownMenuItem(value: 'bulk_buyer', child: Text('Bulk Buyer 🤝')),
                      DropdownMenuItem(value: 'logistics_partner', child: Text('Logistics Partner 🚚')),
                    ],
                    onChanged: (val) => setState(() {
                      _selectedRole = val ?? 'consumer';
                    }),
                  ),
                  const SizedBox(height: 12),

                  // Role-specific sections
                  if (_selectedRole == 'farmer') ...[
                    const Divider(),
                    const Text('Farmer Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _farmSizeController,
                      label: 'Farm Size (Hectares)',
                      icon: Icons.landscape,
                      keyboardType: TextInputType.number,
                    ),
                    _buildTextField(
                      controller: _cropsGrownController,
                      label: 'Crops Grown (Comma separated)',
                      icon: Icons.grass,
                    ),
                    _buildTextField(
                      controller: _farmCoordsController,
                      label: 'Farm Coordinates (e.g. 28.6139, 77.2090)',
                      icon: Icons.map,
                    ),
                  ],

                  if (_selectedRole == 'bulk_buyer') ...[
                    const Divider(),
                    const Text('Bulk Buyer Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _businessNameController,
                      label: 'Business Name',
                      icon: Icons.business,
                    ),
                    DropdownButtonFormField<String>(
                      value: _businessType,
                      decoration: InputDecoration(
                        labelText: 'Business Type',
                        prefixIcon: Icon(Icons.store, color: Theme.of(context).primaryColor),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'retailer', child: Text('Retailer')),
                        DropdownMenuItem(value: 'wholesaler', child: Text('Wholesaler')),
                        DropdownMenuItem(value: 'food_processor', child: Text('Food Processor')),
                        DropdownMenuItem(value: 'exporter', child: Text('Exporter')),
                      ],
                      onChanged: (val) => setState(() {
                        _businessType = val ?? 'retailer';
                      }),
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      controller: _gstNumberController,
                      label: 'GST Number',
                      icon: Icons.payment,
                    ),
                  ],

                  if (_selectedRole == 'logistics_partner') ...[
                    const Divider(),
                    const Text('Logistics Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _vehicleNumberController,
                      label: 'Vehicle Plate Number',
                      icon: Icons.numbers,
                    ),
                    DropdownButtonFormField<String>(
                      value: _vehicleType,
                      decoration: InputDecoration(
                        labelText: 'Vehicle Type',
                        prefixIcon: Icon(Icons.local_shipping, color: Theme.of(context).primaryColor),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'tempo', child: Text('Tempo')),
                        DropdownMenuItem(value: 'truck', child: Text('Truck')),
                        DropdownMenuItem(value: 'reefer', child: Text('Reefer')),
                        DropdownMenuItem(value: 'motorcycle', child: Text('Motorcycle')),
                      ],
                      onChanged: (val) => setState(() {
                        _vehicleType = val ?? 'tempo';
                      }),
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      controller: _capacityController,
                      label: 'Capacity (Kg)',
                      icon: Icons.fitness_center,
                      keyboardType: TextInputType.number,
                    ),
                    _buildTextField(
                      controller: _serviceAreaController,
                      label: 'Service Area (District / Pincode)',
                      icon: Icons.room,
                    ),
                  ],

                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      onPressed: _isLoading ? null : _handleSignup,
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Sign Up', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Already have an account?"),
                      TextButton(
                        onPressed: () => setState(() {
                          _isLogin = true;
                          _errorMessage = '';
                        }),
                        child: Text('Sign In', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
                
                // Show current endpoint
                const SizedBox(height: 16),
                Text(
                  'Connected to: ${config.baseUrl}',
                  style: const TextStyle(fontSize: 10, color: Colors.grey, fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
