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
            return Container(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
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
                    // Cart Items List
                    Container(
                      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.3),
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
                    // Delivery Details
                    const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _addressCtrl,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Shipping Address',
                        contentPadding: EdgeInsets.all(10),
                      ),
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
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text(
                          '₹${cart.getCartTotal().toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.green),
                        ),
                      ],
                    ),
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
                          _processCheckout();
                        },
                        child: const Text(
                          'Proceed to Checkout',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ]
                ],
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
                              context.read<CartProvider>().addToCart(product, qty: qty);
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${product['name']} added to Basket!')),
                              );
                            },
                            child: const Text('Add to Cart', style: TextStyle(color: Colors.white)),
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
          const SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: SubscriptionPanel(role: 'buyer'),
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


