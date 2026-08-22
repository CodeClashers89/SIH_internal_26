import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'package:intl/intl.dart';
import 'order_tracking_screen.dart';
import 'subscription_panel.dart';

class ConsumerMarketplaceScreen extends StatefulWidget {
  const ConsumerMarketplaceScreen({Key? key}) : super(key: key);

  @override
  State<ConsumerMarketplaceScreen> createState() => _ConsumerMarketplaceScreenState();
}

class _ConsumerMarketplaceScreenState extends State<ConsumerMarketplaceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiClient _apiClient = ApiClient(null as dynamic, () => ''); // initialized dynamically in initState

  List<dynamic> _products = [];
  List<dynamic> _orders = [];
  bool _isLoadingProducts = true;
  bool _isLoadingOrders = true;

  // Filters state
  String _searchQuery = '';
  String _selectedCategory = '';
  String _pincodeFilter = '';
  String _districtFilter = '';
  String _sortBy = 'newest'; // 'newest', 'price-low', 'price-high', 'freshness'

  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _pinCtrl = TextEditingController();
  final TextEditingController _distCtrl = TextEditingController();

  // Dialog and Cart Drawer inputs
  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _checkoutPinCtrl = TextEditingController();

  String _cartOrderType = 'onetime';
  String _cartDeliveryDay = 'Monday';
  String _cartDeliveryTimeSlot = 'morning';
  int _cartDurationMonths = 2;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1) {
        _fetchOrders();
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchProducts();
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user != null) {
        _addressCtrl.text = user['address'] ?? '';
        _checkoutPinCtrl.text = user['pincode'] ?? '';
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    _pinCtrl.dispose();
    _distCtrl.dispose();
    _addressCtrl.dispose();
    _checkoutPinCtrl.dispose();
    super.dispose();
  }

  ApiClient _getApiClient() {
    final prefs = Provider.of<AuthProvider>(context, listen: false).user == null
        ? null
        : (context.read<AuthProvider>()).prefs; // access SharedPreferences from AuthProvider
    final config = Provider.of<ApiConfigProvider>(context, listen: false);
    return ApiClient(prefs!, () => config.baseUrl, onUnauthorized: () {
      Provider.of<AuthProvider>(context, listen: false).logout();
    });
  }

  Future<void> _fetchProducts() async {
    setState(() {
      _isLoadingProducts = true;
    });

    try {
      final client = _getApiClient();
      String url = '/products/?';
      if (_selectedCategory.isNotEmpty) url += 'category=$_selectedCategory&';
      if (_searchQuery.isNotEmpty) url += 'search=$_searchQuery&';
      if (_pincodeFilter.isNotEmpty) url += 'pincode=$_pincodeFilter&';
      if (_districtFilter.isNotEmpty) url += 'district=$_districtFilter&';

      final res = await client.get(url);
      List<dynamic> list = res['data'] ?? [];

      // Sort results
      if (_sortBy == 'price-low') {
        list.sort((a, b) => (double.tryParse(a['price_per_unit'].toString()) ?? 0.0)
            .compareTo(double.tryParse(b['price_per_unit'].toString()) ?? 0.0));
      } else if (_sortBy == 'price-high') {
        list.sort((a, b) => (double.tryParse(b['price_per_unit'].toString()) ?? 0.0)
            .compareTo(double.tryParse(a['price_per_unit'].toString()) ?? 0.0));
      } else if (_sortBy == 'freshness') {
        list.sort((a, b) => (b['freshness_percentage'] as num)
            .compareTo(a['freshness_percentage'] as num));
      }

      setState(() {
        _products = list;
        _isLoadingProducts = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingProducts = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load products: $e')),
      );
    }
  }

  Future<void> _fetchOrders() async {
    setState(() {
      _isLoadingOrders = true;
    });

    try {
      final client = _getApiClient();
      final res = await client.get('/orders/');
      setState(() {
        _orders = res['data'] ?? [];
        _isLoadingOrders = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingOrders = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load orders: $e')),
      );
    }
  }

  Future<void> _cancelOrder(int orderId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final client = _getApiClient();
      await client.patch('/orders/$orderId/status/', {'status': 'cancelled'});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order cancelled successfully.')),
      );
      _fetchOrders();
    } catch (err) {
      String msg = 'Failed to cancel order.';
      if (err is ApiException && err.errorData is Map && err.errorData['error'] == 'CANCELLATION_LOCKED_AFTER_TRANSPORT_HANDOVER') {
        msg = 'CANCELLATION LOCKED: This order can no longer be cancelled because the produce has already been handed over to the transport partner.';
      } else if (err is ApiException) {
        msg = err.message;
      }
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Error', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          content: Text(msg),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
    }
  }

  void _showRazorpaySandbox(Map<String, dynamic> orderPayload) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(Icons.payment, color: Colors.green),
            SizedBox(width: 8),
            Text('Razorpay Simulator', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order ID: #${orderPayload['order']['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Amount: ₹${(orderPayload['amount_in_paise'] / 100).toStringAsFixed(2)}'),
            const SizedBox(height: 12),
            const Text(
              'Select payment status to mock callback signature verification:',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actionsAlignment: MainAxisAlignment.spaceEvenly,
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Payment failed. You can retry payment from "My Orders".')),
              );
              _fetchOrders();
              _tabController.animateTo(1);
            },
            child: const Text('Simulate Failure', style: TextStyle(color: Colors.white)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final client = _getApiClient();
                await client.post('/orders/payment-callback/', {
                  'order_id': orderPayload['order']['id'],
                  'razorpay_order_id': orderPayload['order']['razorpay_order_id'],
                  'razorpay_payment_id': 'pay_mock_${DateTime.now().millisecondsSinceEpoch}',
                  'razorpay_signature': 'mock_signature',
                });
                context.read<CartProvider>().clearCart();
                
                // Show checkout success screen
                _showSuccessOverlay();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error validating callback: $e')),
                );
              }
            },
            child: const Text('Simulate Success', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showSuccessOverlay() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        Future.delayed(const Duration(seconds: 2), () {
          Navigator.pop(ctx); // Close dialog
          _fetchOrders();
          _tabController.animateTo(1);
        });
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle),
                  child: const Icon(Icons.check_circle, size: 54, color: Colors.green),
                ),
                const SizedBox(height: 16),
                const Text('Order Confirmed!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                const SizedBox(height: 8),
                const Text(
                  'Payment successful. Your order has been placed.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _retryPayment(dynamic order) async {
    try {
      final client = _getApiClient();
      final res = await client.post('/orders/${order['id']}/retry-payment/');
      _showRazorpaySandbox(res);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to initiate retry payment: $e')),
      );
    }
  }

  double _estimateShipping() {
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    final buyerPincode = _checkoutPinCtrl.text.trim();
    final buyerDistrict = (user?['district'] ?? '').toString().trim().toLowerCase();
    
    final cart = Provider.of<CartProvider>(context, listen: false);
    if (cart.items.isEmpty) return 0.0;
    
    final firstProduct = cart.items.first.product;
    final farmerDetails = firstProduct['farmer_details'] ?? {};
    final farmerPincode = (farmerDetails['pincode'] ?? '').toString().trim();
    final farmerDistrict = (farmerDetails['district'] ?? '').toString().trim().toLowerCase();
    
    double estimatedKm = 85.0;
    if (farmerPincode.isNotEmpty && farmerPincode == buyerPincode) {
      estimatedKm = 3.5;
    } else if (farmerDistrict.isNotEmpty && farmerDistrict == buyerDistrict) {
      estimatedKm = 17.5;
    }
    
    return double.parse((estimatedKm * 12).toStringAsFixed(2));
  }

  void _showCartDrawer() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final cart = Provider.of<CartProvider>(context);
            
            final hasSubscriptionItem = cart.items.any((item) => item.isSubscription);
            if (hasSubscriptionItem && _cartOrderType == 'onetime') {
              _cartOrderType = 'subscription';
              final subItem = cart.items.firstWhere((item) => item.isSubscription);
              if (subItem.subConfig != null) {
                _cartDeliveryDay = subItem.subConfig!['deliveryDay'] ?? 'Monday';
                _cartDeliveryTimeSlot = subItem.subConfig!['deliveryTimeSlot'] ?? 'morning';
                _cartDurationMonths = subItem.subConfig!['durationMonths'] ?? 2;
              }
            }

            final baseSubtotal = cart.getCartTotal();
            final discountRate = _cartOrderType == 'subscription' ? 0.05 : 0.0;
            final subscriberSavings = baseSubtotal * discountRate;
            final discountedSubtotal = baseSubtotal - subscriberSavings;
            final shippingCharge = cart.items.isEmpty ? 0.0 : _estimateShipping();
            final perDeliveryTotal = discountedSubtotal + shippingCharge;
            final totalDeliveries = _cartDurationMonths * 4;
            final totalPlanAmount = perDeliveryTotal * totalDeliveries;

            final daysOfWeek = [
              {'id': 'Monday', 'label': 'Mon'},
              {'id': 'Tuesday', 'label': 'Tue'},
              {'id': 'Wednesday', 'label': 'Wed'},
              {'id': 'Thursday', 'label': 'Thu'},
              {'id': 'Friday', 'label': 'Fri'},
              {'id': 'Saturday', 'label': 'Sat'},
              {'id': 'Sunday', 'label': 'Sun'},
            ];

            final timeSlots = [
              {'id': 'morning', 'label': 'Morning', 'time': '6:00 AM – 9:00 AM', 'icon': Icons.light_mode},
              {'id': 'afternoon', 'label': 'Afternoon', 'time': '12:00 PM – 3:00 PM', 'icon': Icons.wb_sunny},
              {'id': 'evening', 'label': 'Evening', 'time': '5:00 PM – 8:00 PM', 'icon': Icons.nights_stay},
            ];

            final durations = [
              {'months': 1, 'deliveries': 4, 'label': '1 Month', 'desc': '4 Drops'},
              {'months': 2, 'deliveries': 8, 'label': '2 Months', 'desc': '8 Drops', 'popular': true},
              {'months': 3, 'deliveries': 12, 'label': '3 Months', 'desc': '12 Drops'},
            ];

            return Container(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Shopping Basket 🛒',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const Divider(),
                    if (cart.items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 36.0),
                        child: Center(
                          child: Text(
                            'Your cart is empty. Browse fresh yields to add items.',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ),
                      )
                    else ...[
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => setModalState(() => _cartOrderType = 'onetime'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _cartOrderType == 'onetime' ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: _cartOrderType == 'onetime'
                                        ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.shopping_bag_outlined, size: 16),
                                      SizedBox(width: 6),
                                      Text('One-Time', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: InkWell(
                                onTap: () => setModalState(() => _cartOrderType = 'subscription'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _cartOrderType == 'subscription' ? Colors.green : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: _cartOrderType == 'subscription'
                                        ? [BoxShadow(color: Colors.green.withOpacity(0.2), blurRadius: 4)]
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.repeat, size: 16, color: _cartOrderType == 'subscription' ? Colors.white : Colors.black87),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Auto-Delivery (-5%)',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: _cartOrderType == 'subscription' ? Colors.white : Colors.black87,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_cartOrderType == 'subscription') ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50.withOpacity(0.5),
                            border: Border.all(color: Colors.green.shade200, width: 1.5),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.stars, color: Colors.green, size: 18),
                                  const SizedBox(width: 6),
                                  const Text('RECURRING SCHEDULE SETTINGS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.amber.shade400, borderRadius: BorderRadius.circular(8)),
                                    child: const Text('SAVE 5%', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold)),
                                  )
                                ],
                              ),
                              const Divider(height: 20, color: Colors.green),
                              const Text('Deliver every week on:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: daysOfWeek.map((day) {
                                  final isSel = _cartDeliveryDay == day['id'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => _cartDeliveryDay = day['id']!),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.green : Colors.white,
                                            border: Border.all(color: isSel ? Colors.green : Colors.grey.shade300),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            day['label']!,
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSel ? Colors.white : Colors.black87),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              const Text('Preferred Time Slot:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                              const SizedBox(height: 6),
                              Row(
                                children: timeSlots.map((slot) {
                                  final isSel = _cartDeliveryTimeSlot == slot['id'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => _cartDeliveryTimeSlot = slot['id'] as String),
                                        child: Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.white : Colors.white.withOpacity(0.6),
                                            border: Border.all(color: isSel ? Colors.green : Colors.grey.shade300, width: 1.5),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Icon(slot['icon'] as IconData, size: 14, color: isSel ? Colors.green : Colors.grey),
                                                  const SizedBox(width: 4),
                                                  Text(slot['label'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Text((slot['time'] as String).replaceAll(' – ', '\n'), style: const TextStyle(fontSize: 8, color: Colors.grey)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              const Text('Schedule Duration:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                              const SizedBox(height: 6),
                              Row(
                                children: durations.map((dur) {
                                  final isSel = _cartDurationMonths == dur['months'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => _cartDurationMonths = dur['months'] as int),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.white : Colors.white.withOpacity(0.6),
                                            border: Border.all(color: isSel ? Colors.green : Colors.grey.shade300, width: 1.5),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          alignment: Alignment.center,
                                          child: Column(
                                            children: [
                                              Text(dur['label'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                              Text(dur['desc'] as String, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.shade200)),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.calendar_month, color: Colors.green, size: 16),
                                        const SizedBox(width: 6),
                                        const Text('First Delivery:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                        const Spacer(),
                                        Text(_getNextDeliveryDate(_cartDeliveryDay), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 12)),
                                        Text(' ($_cartDeliveryTimeSlot)', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '🔁 $totalDeliveries deliveries every $_cartDeliveryDay morning directly from farmer. Pause/cancel anytime.',
                                      style: const TextStyle(color: Colors.grey, fontSize: 10),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      Container(
                        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.25),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: cart.items.length,
                          itemBuilder: (c, idx) {
                            final item = cart.items[idx];
                            final price = double.tryParse(item.product['price_per_unit'].toString()) ?? 0.0;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.product['name'] ?? '',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        Text(
                                          '₹${price.toStringAsFixed(2)} / ${item.product['unit']}',
                                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (_cartOrderType == 'subscription')
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                      onPressed: () {
                                        setModalState(() {
                                          cart.removeFromCart(item.product['id']);
                                        });
                                      },
                                    )
                                  else
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, color: Colors.green, size: 20),
                                          onPressed: () {
                                            setModalState(() {
                                              cart.updateQuantity(item.product['id'], item.quantity - 1);
                                            });
                                          },
                                        ),
                                        Text(
                                          '${item.quantity.toStringAsFixed(0)}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, color: Colors.green, size: 20),
                                          onPressed: () {
                                            setModalState(() {
                                              cart.updateQuantity(item.product['id'], item.quantity + 1);
                                            });
                                          },
                                        ),
                                      ],
                                    ),
                                  if (_cartOrderType != 'subscription')
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                      onPressed: () {
                                        setModalState(() {
                                          cart.removeFromCart(item.product['id']);
                                        });
                                      },
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      const Divider(),
                      const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _addressCtrl,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: 'Shipping Address',
                          contentPadding: EdgeInsets.all(10),
                        ),
                        onChanged: (_) => setModalState(() {}),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _checkoutPinCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: '6-digit Pincode',
                          contentPadding: EdgeInsets.all(10),
                        ),
                        onChanged: (_) => setModalState(() {}),
                      ),
                      const Divider(height: 24),
                      if (_cartOrderType == 'subscription') ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Produce Subtotal:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                            Text('₹${baseSubtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('5% Subscriber Savings:', style: TextStyle(fontSize: 12, color: Colors.green)),
                            Text('- ₹${subscriberSavings.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Estimated Shipping Charge:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                            Text('+ ₹${shippingCharge.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Per Delivery Total:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                            Text('₹${perDeliveryTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Total Plan Amount ($totalDeliveries drops):', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                            Text('₹${totalPlanAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.green)),
                          ],
                        ),
                      ] else ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Produce Subtotal:', style: TextStyle(fontSize: 13, color: Colors.grey)),
                            Text('₹${baseSubtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Shipping Charge:', style: TextStyle(fontSize: 13, color: Colors.grey)),
                            Text('+ ₹${shippingCharge.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            Text(
                              '₹${(baseSubtotal + shippingCharge).toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.green),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                          onPressed: () async {
                            if (_addressCtrl.text.isEmpty || _checkoutPinCtrl.text.length != 6) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please fill valid address and 6-digit Pincode')),
                              );
                              return;
                            }

                            Navigator.pop(ctx); // Close cart sheet
                            if (_cartOrderType == 'subscription') {
                              _processSubscriptionCheckout();
                            } else {
                              _processCheckout();
                            }
                          },
                          child: Text(
                            _cartOrderType == 'subscription'
                                ? 'Confirm & Start Subscription'
                                : 'Proceed to Checkout',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ]
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _processCheckout() async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    final itemsPayload = cart.items.map((item) => {
      'product': item.product['id'],
      'quantity': item.quantity,
    }).toList();

    try {
      final client = _getApiClient();
      final res = await client.post('/orders/create/', {
        'items': itemsPayload,
        'shipping_address': _addressCtrl.text,
        'shipping_pincode': _checkoutPinCtrl.text,
      });

      _showRazorpaySandbox(res);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Checkout failed: $e')),
      );
    }
  }

  Future<void> _processSubscriptionCheckout() async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    final itemsPayload = cart.items.map((item) => {
      'product': item.product['id'],
      'quantity': item.quantity,
    }).toList();

    try {
      final client = _getApiClient();
      final res = await client.post('/orders/subscriptions/', {
        'items': itemsPayload,
        'shipping_address': _addressCtrl.text,
        'shipping_pincode': _checkoutPinCtrl.text,
        'delivery_day': _cartDeliveryDay,
        'delivery_time_slot': _cartDeliveryTimeSlot,
        'duration_months': _cartDurationMonths,
      });

      _showRazorpaySandbox(res);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Subscription checkout failed: $e')),
      );
    }
  }

  void _showProductDetails(dynamic product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        double qty = 1.0;
        final farmer = product['farmer_details'] ?? {};
        final freshness = product['freshness_percentage'] ?? 0;
        final rating = product['average_rating']?.toString() ?? 'N/A';
        final harvestDate = product['harvest_date'] != null
            ? DateFormat('dd MMM yyyy').format(DateTime.parse(product['harvest_date']))
            : 'Unknown';

        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.8,
              maxChildSize: 0.95,
              expand: false,
              builder: (context, scrollController) {
                return SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Product Image
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          product['image_url'] ?? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (c, e, s) => Image.network(
                            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
                            height: 200,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              product['name'] ?? '',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: freshness >= 80 ? Colors.green.shade50 : Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: freshness >= 80 ? Colors.green.shade200 : Colors.amber.shade200),
                            ),
                            child: Text(
                              'Freshness: $freshness%',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: freshness >= 80 ? Colors.green.shade800 : Colors.amber.shade800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '₹${product['price_per_unit']} / ${product['unit']}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                      const SizedBox(height: 8),
                      Text(product['description'] ?? 'No description provided.', style: const TextStyle(color: Colors.grey)),
                      const SizedBox(height: 16),
                      const Divider(),
                      const Text('Producer Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 6),
                      Text('Farmer Name: ${farmer['username'] ?? 'Anonymous'}'),
                      Text('Location: ${farmer['address'] ?? ''}, ${farmer['district'] ?? ''} (${farmer['pincode'] ?? ''})'),
                      Text('Harvest Date: $harvestDate'),
                      const SizedBox(height: 16),
                      const Divider(),
                      // Add to cart inputs
                      Row(
                        children: [
                          const Text('Quantity: ', style: TextStyle(fontWeight: FontWeight.bold)),
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: () {
                              if (qty > 1.0) setModalState(() => qty -= 1.0);
                            },
                          ),
                          Text('${qty.toStringAsFixed(0)}'),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () {
                              final max = double.tryParse(product['quantity']?.toString() ?? '0') ?? 0.0;
                              if (qty < max) setModalState(() => qty += 1.0);
                            },
                          ),
                          const Spacer(),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                            onPressed: () {
                              Navigator.pop(ctx);
                              _showOrderTypeDialog(product, qty);
                            },
                            child: const Text('Add to Basket', style: TextStyle(color: Colors.white)),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      // Review Widget
                      FarmerReviewsWidget(farmerId: product['farmer'], apiClient: _getApiClient()),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  String _getNextDeliveryDate(String targetDay) {
    final dayOfWeekMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    final targetIdx = dayOfWeekMap[targetDay.toLowerCase()] ?? 1;
    final now = DateTime.now();
    final currentIdx = now.weekday == 7 ? 0 : now.weekday;
    int daysUntil = (targetIdx - currentIdx + 7) % 7;
    if (daysUntil == 0) daysUntil = 7;
    final nextDate = now.add(Duration(days: daysUntil));
    return DateFormat('EEE, d MMM').format(nextDate);
  }

  void _showOrderTypeDialog(dynamic product, double qty) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        String selectedType = 'onetime';
        String deliveryDay = 'Monday';
        String deliveryTimeSlot = 'morning';
        int durationMonths = 2;

        final pricePerUnit = double.tryParse(product['price_per_unit']?.toString() ?? '0.0') ?? 0.0;
        final discountPerUnit = pricePerUnit * 0.05;
        final discountedPrice = pricePerUnit - discountPerUnit;

        final daysOfWeek = [
          {'id': 'Monday', 'label': 'Mon'},
          {'id': 'Tuesday', 'label': 'Tue'},
          {'id': 'Wednesday', 'label': 'Wed'},
          {'id': 'Thursday', 'label': 'Thu'},
          {'id': 'Friday', 'label': 'Fri'},
          {'id': 'Saturday', 'label': 'Sat'},
          {'id': 'Sunday', 'label': 'Sun'},
        ];

        final timeSlots = [
          {'id': 'morning', 'label': 'Morning', 'time': '6:00 AM – 9:00 AM', 'icon': Icons.light_mode},
          {'id': 'afternoon', 'label': 'Afternoon', 'time': '12:00 PM – 3:00 PM', 'icon': Icons.wb_sunny},
          {'id': 'evening', 'label': 'Evening', 'time': '5:00 PM – 8:00 PM', 'icon': Icons.nights_stay},
        ];

        final durations = [
          {'months': 1, 'deliveries': 4, 'label': '1 Month', 'desc': '4 Drops'},
          {'months': 2, 'deliveries': 8, 'label': '2 Months', 'desc': '8 Drops', 'popular': true},
          {'months': 3, 'deliveries': 12, 'label': '3 Months', 'desc': '12 Drops'},
        ];

        return StatefulBuilder(
          builder: (context, setModalState) {
            final double currentUnitPrice = selectedType == 'subscription' ? discountedPrice : pricePerUnit;
            final double currentTotal = currentUnitPrice * qty;
            final int totalDeliveries = durationMonths * 4;

            return Padding(
              padding: EdgeInsets.only(
                top: 20,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (product['image_url'] != null)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              product['image_url'],
                              width: 44,
                              height: 44,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.spa, color: Colors.green),
                            ),
                          )
                        else
                          const Icon(Icons.spa, color: Colors.green, size: 36),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                product['name'] ?? 'Produce',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              Text(
                                '₹${pricePerUnit.toStringAsFixed(2)} / ${product['unit']} · Choose order type',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    InkWell(
                      onTap: () => setModalState(() => selectedType = 'onetime'),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: selectedType == 'onetime'
                              ? Colors.green.shade50.withOpacity(0.4)
                              : Colors.white,
                          border: Border.all(
                            color: selectedType == 'onetime' ? Colors.green.shade600 : Colors.grey.shade200,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Radio<String>(
                              value: 'onetime',
                              groupValue: selectedType,
                              activeColor: Colors.green,
                              onChanged: (val) => setModalState(() => selectedType = val!),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        'One-Time Order',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      Text(
                                        '₹${(pricePerUnit * qty).toStringAsFixed(2)}',
                                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Single delivery directly to your doorstep.',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () => setModalState(() => selectedType = 'subscription'),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: selectedType == 'subscription'
                              ? Colors.green.shade50.withOpacity(0.6)
                              : Colors.white,
                          border: Border.all(
                            color: selectedType == 'subscription' ? Colors.green.shade600 : Colors.grey.shade200,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Radio<String>(
                                  value: 'subscription',
                                  groupValue: selectedType,
                                  activeColor: Colors.green,
                                  onChanged: (val) => setModalState(() => selectedType = val!),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              const Text(
                                                'Recurring Order',
                                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                              ),
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.amber.shade400,
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: const Text(
                                                  'SAVE 5%',
                                                  style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black),
                                                ),
                                              ),
                                            ],
                                          ),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                '₹${(discountedPrice * qty).toStringAsFixed(2)}',
                                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.green.shade700),
                                              ),
                                              Text(
                                                '₹${(pricePerUnit * qty).toStringAsFixed(2)}',
                                                style: const TextStyle(fontSize: 10, color: Colors.grey, decoration: TextDecoration.lineThrough),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Order repeated deliveries on a scheduled day & time.',
                                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (selectedType == 'subscription') ...[
                              const Divider(height: 24, color: Colors.green),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'DELIVER EVERY WEEK ON:',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: daysOfWeek.map((day) {
                                  final isSel = deliveryDay == day['id'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => deliveryDay = day['id']!),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.green : Colors.grey.shade100,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            day['label']!,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: isSel ? Colors.white : Colors.black87,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'PREFERRED TIME SLOT:',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: timeSlots.map((slot) {
                                  final isSel = deliveryTimeSlot == slot['id'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => deliveryTimeSlot = slot['id'] as String),
                                        child: Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.white : Colors.grey.shade50,
                                            border: Border.all(
                                              color: isSel ? Colors.green : Colors.grey.shade200,
                                              width: 1.5,
                                            ),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Icon(
                                                    slot['icon'] as IconData,
                                                    size: 14,
                                                    color: isSel ? Colors.green : Colors.grey,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    slot['label'] as String,
                                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                (slot['time'] as String).replaceAll(' – ', '\n'),
                                                style: const TextStyle(fontSize: 8, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'CONTRACT DURATION:',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: durations.map((dur) {
                                  final isSel = durationMonths == dur['months'];
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: InkWell(
                                        onTap: () => setModalState(() => durationMonths = dur['months'] as int),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          decoration: BoxDecoration(
                                            color: isSel ? Colors.white : Colors.grey.shade50,
                                            border: Border.all(
                                              color: isSel ? Colors.green : Colors.grey.shade200,
                                              width: 1.5,
                                            ),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          alignment: Alignment.center,
                                          child: Column(
                                            children: [
                                              Text(
                                                dur['label'] as String,
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                              ),
                                              Text(
                                                dur['desc'] as String,
                                                style: const TextStyle(fontSize: 9, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: Colors.green.shade200),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.calendar_month, color: Colors.green, size: 16),
                                        const SizedBox(width: 6),
                                        const Text(
                                          'First Delivery:',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                        const Spacer(),
                                        Text(
                                          _getNextDeliveryDate(deliveryDay),
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 12),
                                        ),
                                        Text(
                                          ' ($deliveryTimeSlot)',
                                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '🔁 $totalDeliveries scheduled drops every $deliveryDay for $durationMonths month(s) · ₹${(discountedPrice * qty).toStringAsFixed(2)} / delivery.',
                                      style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
                                    ),
                                  ],
                                ),
                              ),
                            ]
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Cancel', style: TextStyle(color: Colors.black87)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () {
                              final subConfig = selectedType == 'subscription'
                                  ? {
                                      'orderType': 'subscription',
                                      'deliveryDay': deliveryDay,
                                      'deliveryTimeSlot': deliveryTimeSlot,
                                      'durationMonths': durationMonths,
                                    }
                                  : {
                                      'orderType': 'onetime',
                                      'deliveryDay': 'Monday',
                                      'deliveryTimeSlot': 'morning',
                                      'durationMonths': 2,
                                    };

                              context.read<CartProvider>().addToCart(
                                    product,
                                    qty: qty,
                                    isSubscription: selectedType == 'subscription',
                                    subConfig: subConfig,
                                  );

                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    selectedType == 'subscription'
                                        ? '${product['name']} added as Auto-Delivery!'
                                        : '${product['name']} added to Basket!',
                                  ),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                            child: Text(
                              selectedType == 'subscription'
                                  ? 'Confirm Contract'
                                  : 'Add (One-Time)',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showFiltersPanel() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _pinCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Filter by Pincode'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _distCtrl,
              decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Filter by District'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      _pinCtrl.clear();
                      _distCtrl.clear();
                      setState(() {
                        _pincodeFilter = '';
                        _districtFilter = '';
                      });
                      Navigator.pop(ctx);
                      _fetchProducts();
                    },
                    child: const Text('Reset'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () {
                      setState(() {
                        _pincodeFilter = _pinCtrl.text;
                        _districtFilter = _distCtrl.text;
                      });
                      Navigator.pop(ctx);
                      _fetchProducts();
                    },
                    child: const Text('Apply', style: TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('KisanConnect Marketplace', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined),
                onPressed: _showCartDrawer,
              ),
              if (cart.getCartCount() > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: Text(
                      '${cart.getCartCount().toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
          )
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.green,
          indicatorColor: Colors.green,
          tabs: const [
            Tab(text: '🌾 Browse Fresh'),
            Tab(text: '📦 My Orders'),
            Tab(text: '📅 Subscriptions'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // BROWSE FRESH PRODUCE
          RefreshIndicator(
            onRefresh: _fetchProducts,
            child: Column(
              children: [
                // Filters Header
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          onSubmitted: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                            _fetchProducts();
                          },
                          decoration: InputDecoration(
                            hintText: 'Search tomato, onion...',
                            prefixIcon: const Icon(Icons.search),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.filter_list, color: Colors.green),
                        onPressed: _showFiltersPanel,
                      ),
                    ],
                  ),
                ),
                
                // Sorting & Categories
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12.0),
                  child: Row(
                    children: [
                      // Sort by dropdown
                      DropdownButton<String>(
                        value: _sortBy,
                        underline: const SizedBox(),
                        icon: const Icon(Icons.sort, size: 18),
                        onChanged: (val) {
                          setState(() {
                            _sortBy = val ?? 'newest';
                          });
                          _fetchProducts();
                        },
                        items: const [
                          DropdownMenuItem(value: 'newest', child: Text('Sort: Newest')),
                          DropdownMenuItem(value: 'price-low', child: Text('Sort: Price Low-High')),
                          DropdownMenuItem(value: 'price-high', child: Text('Sort: Price High-Low')),
                          DropdownMenuItem(value: 'freshness', child: Text('Sort: Freshness')),
                        ],
                      ),
                      const SizedBox(width: 12),
                      _categoryChip('', 'All Yields'),
                      _categoryChip('vegetable', 'Vegetables 🍅'),
                      _categoryChip('fruit', 'Fruits 🍏'),
                      _categoryChip('grain', 'Grains 🌾'),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                
                Expanded(
                  child: _isLoadingProducts
                      ? const Center(child: CircularProgressIndicator())
                      : _products.isEmpty
                          ? const Center(child: Text('No produce listings found matching criteria.'))
                          : GridView.builder(
                              padding: const EdgeInsets.all(12),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 0.72,
                                crossAxisSpacing: 10,
                                mainAxisSpacing: 10,
                              ),
                              itemCount: _products.length,
                              itemBuilder: (c, idx) {
                                final product = _products[idx];
                                return _buildProductCard(product);
                              },
                            ),
                ),
              ],
            ),
          ),

          // MY ORDERS / TRACKING TAB
          RefreshIndicator(
            onRefresh: _fetchOrders,
            child: _isLoadingOrders
                ? const Center(child: CircularProgressIndicator())
                : _orders.isEmpty
                    ? const Center(child: Text('You have not placed any orders yet.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _orders.length,
                        itemBuilder: (c, idx) {
                          final order = _orders[idx];
                          return _buildOrderCard(order);
                        },
                      ),
          ),
          
          // SUBSCRIPTIONS TAB
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: MarketplaceSubscriptionsPanel(apiClient: _getApiClient()),
          ),
        ],
      ),
    );
  }

  Widget _categoryChip(String slug, String label) {
    final selected = _selectedCategory == slug;
    return Padding(
      padding: const EdgeInsets.only(right: 6.0),
      child: ChoiceChip(
        selectedColor: Colors.green,
        label: Text(label, style: TextStyle(color: selected ? Colors.white : Colors.black87, fontSize: 12)),
        selected: selected,
        onSelected: (val) {
          setState(() {
            _selectedCategory = slug;
          });
          _fetchProducts();
        },
      ),
    );
  }

  Widget _buildProductCard(dynamic product) {
    final freshness = product['freshness_percentage'] ?? 0;
    final price = double.tryParse(product['price_per_unit'].toString()) ?? 0.0;
    
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showProductDetails(product),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Freshness badge
            Stack(
              children: [
                Image.network(
                  product['image_url'] ?? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
                  height: 110,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (c, e, s) => Image.network(
                    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
                    height: 110,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.green.shade800.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$freshness% Fresh',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                )
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product['name'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₹${price.toStringAsFixed(2)} / ${product['unit']}',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.green, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Stock: ${product['quantity']} ${product['unit']}',
                    style: const TextStyle(color: Colors.grey, fontSize: 10),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 10, color: Colors.red),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          '${product['farmer_details']?['district'] ?? ''}',
                          style: const TextStyle(color: Colors.grey, fontSize: 9),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      )
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(dynamic order) {
    final date = order['created_at'] != null
        ? DateFormat('dd MMM yyyy').format(DateTime.parse(order['created_at']))
        : 'Unknown';
    final total = double.tryParse(order['total_amount'].toString()) ?? 0.0;
    final status = order['status'] ?? 'placed';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order['id']}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: status == 'cancelled'
                        ? Colors.red.shade50
                        : status == 'delivered'
                            ? Colors.green.shade50
                            : Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: status == 'cancelled'
                          ? Colors.red.shade800
                          : status == 'delivered'
                              ? Colors.green.shade800
                              : Colors.blue.shade800,
                    ),
                  ),
                )
              ],
            ),
            const SizedBox(height: 6),
            Text('Placed on: $date', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            Text('Total Amount: ₹${total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 12),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (status == 'placed' && order['payment_status'] == 'unpaid') ...[
                  TextButton(
                    onPressed: () => _cancelOrder(order['id']),
                    child: const Text('Cancel Order', style: TextStyle(color: Colors.red)),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () => _retryPayment(order),
                    child: const Text('Pay Now', style: TextStyle(color: Colors.white)),
                  ),
                ],
                if (status != 'cancelled' && order['payment_status'] == 'paid')
                  OutlinedButton.icon(
                    icon: const Icon(Icons.local_shipping, size: 16),
                    label: const Text('Track Shipment'),
                    onPressed: () {
                      // Navigate to Shipment tracking screen
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => OrderTrackingScreen(orderId: order['id'], apiClient: _getApiClient()),
                        ),
                      );
                    },
                  ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

// Subcomponent: Farmer Reviews Widget
class FarmerReviewsWidget extends StatefulWidget {
  final int farmerId;
  final ApiClient apiClient;

  const FarmerReviewsWidget({Key? key, required this.farmerId, required this.apiClient}) : super(key: key);

  @override
  State<FarmerReviewsWidget> createState() => _FarmerReviewsWidgetState();
}

class _FarmerReviewsWidgetState extends State<FarmerReviewsWidget> {
  List<dynamic> _reviews = [];
  bool _loading = true;
  bool _submitting = false;

  final TextEditingController _commentCtrl = TextEditingController();
  int _selectedRating = 5;

  @override
  void initState() {
    super.initState();
    _fetchReviews();
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchReviews() async {
    try {
      final res = await widget.apiClient.get('/reviews/?farmer=${widget.farmerId}');
      setState(() {
        _reviews = res['data'] ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _submitReview() async {
    if (_commentCtrl.text.isEmpty) return;
    setState(() {
      _submitting = true;
    });

    try {
      final res = await widget.apiClient.post('/reviews/', {
        'farmer': widget.farmerId,
        'rating': _selectedRating,
        'comment': _commentCtrl.text,
      });

      setState(() {
        _reviews.insert(0, res);
        _commentCtrl.clear();
        _selectedRating = 5;
        _submitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Feedback submitted successfully.')),
      );
    } catch (e) {
      setState(() {
        _submitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit review: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Farmer Reviews & Ratings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        // Write Review form
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add Feedback', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Row(
                children: [
                  const Text('Rating: '),
                  ...List.generate(5, (index) => IconButton(
                    icon: Icon(
                      index < _selectedRating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                    ),
                    onPressed: () => setState(() => _selectedRating = index + 1),
                  )),
                ],
              ),
              TextField(
                controller: _commentCtrl,
                decoration: const InputDecoration(
                  hintText: 'Share your quality feedback...',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.all(8),
                ),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                onPressed: _submitting ? null : _submitReview,
                child: _submitting
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(color: Colors.white))
                    : const Text('Submit Review', style: TextStyle(color: Colors.white)),
              )
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_reviews.isEmpty)
          const Text('No reviews for this farmer yet.', style: TextStyle(color: Colors.grey, fontSize: 12))
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _reviews.length,
            itemBuilder: (c, idx) {
              final r = _reviews[idx];
              final date = r['created_at'] != null
                  ? DateFormat('dd/MM/yyyy').format(DateTime.parse(r['created_at']))
                  : '';
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          r['reviewer_details']?['username'] ?? 'Anonymous',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        ...List.generate(r['rating'] ?? 5, (index) => const Icon(Icons.star, color: Colors.amber, size: 12)),
                        const Spacer(),
                        Text(date, style: const TextStyle(color: Colors.grey, fontSize: 10)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(r['comment'] ?? '', style: const TextStyle(fontSize: 12)),
                    const Divider(),
                  ],
                ),
              );
            },
          )
      ],
    );
  }
}

class MarketplaceSubscriptionsPanel extends StatefulWidget {
  final ApiClient apiClient;
  const MarketplaceSubscriptionsPanel({Key? key, required this.apiClient}) : super(key: key);

  @override
  State<MarketplaceSubscriptionsPanel> createState() => _MarketplaceSubscriptionsPanelState();
}

class _MarketplaceSubscriptionsPanelState extends State<MarketplaceSubscriptionsPanel> {
  bool _loading = true;
  List<dynamic> _subscriptions = [];

  @override
  void initState() {
    super.initState();
    _fetchSubscriptions();
  }

  Future<void> _fetchSubscriptions() async {
    setState(() {
      _loading = true;
    });
    try {
      final res = await widget.apiClient.get('/orders/subscriptions/');
      setState(() {
        _subscriptions = res['data'] ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load subscriptions: $e')),
      );
    }
  }

  Future<void> _pauseSubscription(int subId) async {
    try {
      await widget.apiClient.post('/orders/subscriptions/$subId/pause/');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription paused successfully.')),
      );
      _fetchSubscriptions();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pause subscription: $e')),
      );
    }
  }

  Future<void> _resumeSubscription(int subId) async {
    try {
      await widget.apiClient.post('/orders/subscriptions/$subId/resume/');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription resumed successfully.')),
      );
      _fetchSubscriptions();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to resume subscription: $e')),
      );
    }
  }

  Future<void> _cancelSubscription(int subId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Subscription'),
        content: const Text('Are you sure you want to cancel this subscription contract? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await widget.apiClient.post('/orders/subscriptions/$subId/cancel/');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription cancelled successfully.')),
      );
      _fetchSubscriptions();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to cancel subscription: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 48.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Your Auto-Deliveries 📅',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            IconButton(
              icon: const Icon(Icons.refresh, color: Colors.green),
              onPressed: _fetchSubscriptions,
            ),
          ],
        ),
        const SizedBox(height: 8),
        _subscriptions.isEmpty
            ? Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.repeat, size: 40, color: Colors.grey),
                    SizedBox(height: 8),
                    Text(
                      'No recurring subscriptions found.',
                      style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Select Auto-Delivery during checkout to automate regular deliveries.',
                      style: TextStyle(color: Colors.grey, fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _subscriptions.length,
                itemBuilder: (c, idx) {
                  final sub = _subscriptions[idx];
                  final subId = sub['id'];
                  final status = (sub['status'] ?? 'active').toString().toLowerCase();
                  final completed = sub['completed_deliveries'] ?? 0;
                  final total = sub['total_deliveries'] ?? 8;
                  final day = sub['delivery_day'] ?? 'Monday';
                  final slot = sub['delivery_time_slot'] ?? 'morning';
                  final perDeliveryTotal = double.tryParse(sub['per_delivery_total']?.toString() ?? '0.0') ?? 0.0;
                  final totalPlanAmount = double.tryParse(sub['total_plan_amount']?.toString() ?? '0.0') ?? 0.0;
                  final nextDate = sub['next_delivery_date'] != null
                      ? DateFormat('dd MMM yyyy').format(DateTime.parse(sub['next_delivery_date']))
                      : 'N/A';
                  final items = sub['items'] ?? [];

                  Color statusColor = Colors.green;
                  if (status == 'paused') statusColor = Colors.orange;
                  if (status == 'cancelled') statusColor = Colors.red;
                  if (status == 'completed') statusColor = Colors.blue;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Subscription #$subId',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          Row(
                            children: [
                              const Icon(Icons.schedule, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                'Every $day ($slot)',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.event, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                'Next Drop: $nextDate',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.sync, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                '$completed / $total drops completed',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          const Text(
                            'PRODUCE ITEMS:',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.grey),
                          ),
                          const SizedBox(height: 4),
                          ...items.map<Widget>((it) {
                            final prodName = it['product_details']?['name'] ?? 'Produce';
                            final qty = it['quantity'] ?? 1;
                            final unit = it['product_details']?['unit'] ?? 'kg';
                            final price = double.tryParse(it['price']?.toString() ?? '0.0') ?? 0.0;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('• $prodName × $qty $unit', style: const TextStyle(fontSize: 12)),
                                  Text('₹${(qty * price).toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            );
                          }).toList(),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Per Delivery Total:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              Text('₹${perDeliveryTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.green)),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Plan Contract Value:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              Text('₹${totalPlanAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (status == 'active' || status == 'paused')
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (status == 'active')
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.orange.shade600,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                    icon: const Icon(Icons.pause, size: 16, color: Colors.white),
                                    label: const Text('Pause', style: TextStyle(fontSize: 11, color: Colors.white)),
                                    onPressed: () => _pauseSubscription(subId),
                                  ),
                                if (status == 'paused') ...[
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                    icon: const Icon(Icons.play_arrow, size: 16, color: Colors.white),
                                    label: const Text('Resume', style: TextStyle(fontSize: 11, color: Colors.white)),
                                    onPressed: () => _resumeSubscription(subId),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.red,
                                      side: const BorderSide(color: Colors.red),
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                    icon: const Icon(Icons.cancel, size: 16, color: Colors.red),
                                    label: const Text('Cancel Plan', style: TextStyle(fontSize: 11, color: Colors.red)),
                                    onPressed: () => _cancelSubscription(subId),
                                  ),
                                ]
                              ],
                            )
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


