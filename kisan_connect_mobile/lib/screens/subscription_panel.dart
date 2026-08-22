import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';

class SubscriptionPanel extends StatefulWidget {
  final String role; // 'buyer' or 'farmer'

  const SubscriptionPanel({Key? key, required this.role}) : super(key: key);

  @override
  State<SubscriptionPanel> createState() => _SubscriptionPanelState();
}

class _SubscriptionPanelState extends State<SubscriptionPanel> {
  bool _loading = true;
  List<dynamic> _subscriptions = [];
  List<dynamic> _products = [];

  // Form State
  String? _selectedProductId;
  final _qtyCtrl = TextEditingController();
  String _selectedSchedule = 'Daily';
  bool _submitting = false;
  String _formError = '';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() {
      _loading = true;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    final user = auth.user!;

    try {
      // 1. Fetch subscriptions from B2B engine
      final param = widget.role == 'farmer' ? 'farmer_id=${user['id']}' : 'buyer_id=${user['id']}';
      final subRes = await http.get(Uri.parse('${config.subscriptionUrl}/list?$param'));
      if (subRes.statusCode == 200) {
        _subscriptions = jsonDecode(subRes.body);
      }

      // 2. Fetch products if buyer (for dropdown selection)
      if (widget.role == 'buyer') {
        final client = ApiClient(auth.prefs, () => config.baseUrl);
        final prodRes = await client.get('/products/');
        _products = prodRes['data'] ?? [];
      }

      setState(() {
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load subscription metrics: $e')),
      );
    }
  }

  Future<void> _createSubscription() async {
    if (_selectedProductId == null || _qtyCtrl.text.isEmpty) {
      setState(() {
        _formError = 'Please fill all inputs.';
      });
      return;
    }

    final product = _products.firstWhere((p) => p['id'].toString() == _selectedProductId);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    final user = auth.user!;

    setState(() {
      _submitting = true;
      _formError = '';
    });

    final payload = {
      'farmer_id': product['farmer'].toString(),
      'buyer_profile': {
        'buyer_id': user['id'].toString(),
        'name': user['username'] ?? 'Buyer',
        'delivery_address': user['address'] ?? 'Registered Address',
      },
      'schedule_matrix': {
        'recurring_days': [_selectedSchedule],
      },
      'items_breakdown': [
        {
          'commodity_name': product['name'],
          'quantity': double.parse(_qtyCtrl.text),
          'unit': product['unit'] ?? 'kg',
          'price_per_unit': double.parse(product['price_per_unit'].toString()),
        }
      ]
    };

    try {
      final res = await http.post(
        Uri.parse('${config.subscriptionUrl}/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        _qtyCtrl.clear();
        _selectedProductId = null;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Subscription requested! Sent to farmer for approval.')),
        );
        _fetchData();
      } else {
        setState(() {
          _formError = 'Failed to submit request: ${res.body}';
        });
      }
    } catch (e) {
      setState(() {
        _formError = 'Connection error: $e';
      });
    } finally {
      setState(() {
        _submitting = false;
      });
    }
  }

  Future<void> _toggleSubscription(String subId, bool currentStatus) async {
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${config.subscriptionUrl}/toggle-status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'subscription_id': subId,
          'active': !currentStatus,
        }),
      );
      if (res.statusCode == 200) {
        _fetchData();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Status update failed')));
    }
  }

  Future<void> _respondSubscription(String subId, bool accept) async {
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${config.subscriptionUrl}/respond'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'subscription_id': subId,
          'accept': accept,
        }),
      );
      if (res.statusCode == 200) {
        _fetchData();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(accept ? 'Subscription accepted!' : 'Subscription rejected.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update subscription')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.role == 'buyer') ...[
          // Creation form
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'New Regular Subscription 📅',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const Text(
                  'Schedule recurring deliveries directly with the producer.',
                  style: TextStyle(color: Colors.grey, fontSize: 11),
                ),
                const Divider(height: 20),
                if (_formError.isNotEmpty) ...[
                  Text(_formError, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  const SizedBox(height: 8),
                ],
                DropdownButtonFormField<String>(
                  value: _selectedProductId,
                  hint: const Text('Select a Product / Farmer', style: TextStyle(fontSize: 13)),
                  items: _products.map((p) {
                    final price = double.tryParse(p['price_per_unit'].toString()) ?? 0.0;
                    return DropdownMenuItem<String>(
                      value: p['id'].toString(),
                      child: Text(
                        '${p['name']} — ₹${price.toStringAsFixed(2)}/${p['unit']}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedProductId = val),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _qtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Recurring Volume Quantity',
                    contentPadding: EdgeInsets.all(10),
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _selectedSchedule,
                  decoration: const InputDecoration(
                    labelText: 'Delivery Schedule',
                    contentPadding: EdgeInsets.all(10),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Daily', child: Text('Daily')),
                    DropdownMenuItem(value: 'Monday', child: Text('Every Monday')),
                    DropdownMenuItem(value: 'Wednesday', child: Text('Every Wednesday')),
                    DropdownMenuItem(value: 'Friday', child: Text('Every Friday')),
                  ],
                  onChanged: (val) => setState(() => _selectedSchedule = val ?? 'Daily'),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                    onPressed: _submitting ? null : _createSubscription,
                    child: _submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Request Subscription', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // Subscriptions List
        const Text(
          'Active Subscriptions Feed',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 8),
        _subscriptions.isEmpty
            ? Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                alignment: Alignment.center,
                child: const Text('No recurring subscriptions logged.', style: TextStyle(color: Colors.grey, fontSize: 13)),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _subscriptions.length,
                itemBuilder: (c, idx) {
                  final sub = _subscriptions[idx];
                  final status = sub['status'] ?? 'PENDING';
                  final active = sub['active'] ?? true;
                  final items = sub['items_breakdown'] ?? [];
                  final commodity = items.isNotEmpty ? items[0]['commodity_name'] : 'Produce';
                  final qty = items.isNotEmpty ? items[0]['quantity'] : 0.0;
                  final unit = items.isNotEmpty ? items[0]['unit'] : 'kg';
                  final price = items.isNotEmpty ? items[0]['price_per_unit'] : 0.0;
                  final schedule = sub['schedule_matrix']?['recurring_days']?.join(', ') ?? 'Daily';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Subscription ID: ${sub['_id']?.toString().substring(0, 8) ?? sub['id']}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'ACCEPTED'
                                      ? Theme.of(context).colorScheme.secondary.withOpacity(0.1)
                                      : status == 'REJECTED'
                                          ? Colors.red.shade50
                                          : Colors.amber.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: status == 'ACCEPTED'
                                        ? Theme.of(context).colorScheme.secondary
                                        : status == 'REJECTED'
                                            ? Colors.red.shade800
                                            : Colors.amber.shade800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('Produce: $commodity ($qty $unit)'),
                          Text('Price Bid: ₹$price / $unit'),
                          Text('Schedule Matrix: $schedule'),
                          Text('Address: ${sub['buyer_profile']?['delivery_address'] ?? ''}'),
                          const Divider(),
                          if (widget.role == 'farmer' && status == 'PENDING')
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(
                                  onPressed: () => _respondSubscription(sub['_id'] ?? sub['id'], false),
                                  child: const Text('Reject', style: TextStyle(color: Colors.red)),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                  onPressed: () => _respondSubscription(sub['_id'] ?? sub['id'], true),
                                  child: const Text('Accept', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            )
                          else if (widget.role == 'buyer' && status == 'ACCEPTED')
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Subscription Active Status:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                Switch(
                                  value: active,
                                  activeColor: Theme.of(context).colorScheme.secondary,
                                  onChanged: (val) {
                                    _toggleSubscription(sub['_id'] ?? sub['id'], active);
                                  },
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }
}
