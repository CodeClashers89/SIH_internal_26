import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'control_tower_screen.dart';

class AdminPanelScreen extends StatefulWidget {
  const AdminPanelScreen({Key? key}) : super(key: key);

  @override
  State<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  bool _isLoading = true;
  List<dynamic> _pendingFarmers = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchPendingFarmers();
    });
  }

  ApiClient _getApiClient() {
    final prefs = Provider.of<AuthProvider>(context, listen: false).user == null
        ? null
        : (context.read<AuthProvider>()).prefs;
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    return ApiClient(prefs!, () => config.baseUrl, onUnauthorized: () {
      Provider.of<AuthProvider>(context, listen: false).logout();
    });
  }

  Future<void> _fetchPendingFarmers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final client = _getApiClient();
      final res = await client.get('/admin/kyc-pending/');
      setState(() {
        _pendingFarmers = res['data'] ?? res['pending_farmers'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load pending KYC list: $e')),
      );
    }
  }

  Future<void> _verifyKyc(int farmerId, String status) async {
    try {
      final client = _getApiClient();
      await client.post('/admin/kyc-verify/$farmerId/', {'status': status});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('KYC Status updated to: ${status.toUpperCase()}')),
      );
      _fetchPendingFarmers();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Panel 🛡️', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics, color: Colors.green),
            tooltip: 'Control Tower',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (ctx) => const ControlTowerScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchPendingFarmers,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _pendingFarmers.isEmpty
                ? const Center(child: Text('No farmer KYC approvals currently pending.'))
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _pendingFarmers.length,
                    itemBuilder: (c, idx) {
                      final f = _pendingFarmers[idx];
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: Colors.green.shade50,
                                    child: const Icon(Icons.person, color: Colors.green),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          f['username'] ?? '',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                        Text('Phone: ${f['phone'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text('Address: ${f['address'] ?? ''}, ${f['district'] ?? ''} (${f['pincode'] ?? ''})'),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                                child: Row(
                                  children: [
                                    const Icon(Icons.file_present, size: 16, color: Colors.blue),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'Uploaded KYC Doc: ${f['kyc_document'] ?? 'No document name found'}',
                                        style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Divider(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton(
                                    onPressed: () => _verifyKyc(f['id'], 'rejected'),
                                    child: const Text('Reject KYC', style: TextStyle(color: Colors.red)),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                    onPressed: () => _verifyKyc(f['id'], 'approved'),
                                    child: const Text('Approve & Verify', style: TextStyle(color: Colors.white)),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
