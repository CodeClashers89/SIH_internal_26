import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'package:intl/intl.dart';

class ControlTowerScreen extends StatefulWidget {
  const ControlTowerScreen({Key? key}) : super(key: key);

  @override
  State<ControlTowerScreen> createState() => _ControlTowerScreenState();
}

class _ControlTowerScreenState extends State<ControlTowerScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _summary;
  List<dynamic> _exceptions = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchControlTowerData();
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

  Future<void> _fetchControlTowerData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final client = _getApiClient();
      final results = await Future.wait([
        client.get('/control-tower/summary/'),
        client.get('/control-tower/exceptions/'),
      ]);

      setState(() {
        _summary = results[0];
        _exceptions = results[1]['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load Control Tower logs: $e')),
      );
    }
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return Colors.red;
      case 'HIGH':
        return Colors.orange;
      case 'MEDIUM':
        return Colors.amber.shade700;
      default:
        return Colors.blue;
    }
  }

  Widget _buildSummaryCard(String title, String val, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(color: Colors.grey.shade200.withOpacity(0.5), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                val,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              Icon(icon, color: color, size: 20),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagnostics Control Tower', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchControlTowerData,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchControlTowerData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Operational metrics title
                    const Text('Operational Diagnostics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 10),

                    // Grid stats
                    if (_summary != null)
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 1.15,
                        children: [
                          _buildSummaryCard('Active Orders', '${_summary!['active_orders'] ?? 0}', Icons.shopping_basket, Colors.blue),
                          _buildSummaryCard('Orders At Risk', '${_summary!['orders_at_risk'] ?? 0}', Icons.warning, Colors.orange),
                          _buildSummaryCard('Critical Alert', '${_summary!['critical_exceptions'] ?? 0}', Icons.error, Colors.red),
                          _buildSummaryCard('Vehicle Issues', '${_summary!['vehicle_issues'] ?? 0}', Icons.local_shipping, Colors.amber.shade800),
                          _buildSummaryCard('Payment Disputes', '${_summary!['payment_disputes'] ?? 0}', Icons.payment_outlined, Colors.purple),
                          _buildSummaryCard('Available Trucks', '${_summary!['available_trucks'] ?? 0}', Icons.local_shipping, Colors.green),
                        ],
                      ),
                    
                    const SizedBox(height: 24),
                    const Text('Active Exception Stream Logs', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    const Text('Real-time updates on logistical anomalies.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                    const SizedBox(height: 12),

                    // Exception lists
                    _exceptions.isEmpty
                        ? Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(32),
                            alignment: Alignment.center,
                            child: const Text('No active exception warnings recorded in transit logs.', style: TextStyle(color: Colors.grey)),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _exceptions.length,
                            itemBuilder: (c, idx) {
                              final ex = _exceptions[idx];
                              final severity = ex['severity'] ?? 'LOW';
                              final date = ex['created_at'] != null
                                  ? DateFormat('dd MMM, hh:mm a').format(DateTime.parse(ex['created_at']))
                                  : '';
                              
                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: _getSeverityColor(severity).withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: _getSeverityColor(severity).withOpacity(0.3)),
                                            ),
                                            child: Text(
                                              severity.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: _getSeverityColor(severity),
                                              ),
                                            ),
                                          ),
                                          Text(date, style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        ex['type']?.toString().replaceAll('_', ' ') ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        ex['description'] ?? '',
                                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ],
                ),
              ),
            ),
    );
  }
}
