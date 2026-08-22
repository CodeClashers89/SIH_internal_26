import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'package:intl/intl.dart';

class BulkBuyerPortalScreen extends StatefulWidget {
  const BulkBuyerPortalScreen({Key? key}) : super(key: key);

  @override
  State<BulkBuyerPortalScreen> createState() => _BulkBuyerPortalScreenState();
}

class _BulkBuyerPortalScreenState extends State<BulkBuyerPortalScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  List<dynamic> _products = [];
  List<dynamic> _quotes = [];
  List<dynamic> _requirements = [];
  List<dynamic> _offers = [];
  List<dynamic> _contracts = [];

  // Form Inputs
  final _quoteQtyCtrl = TextEditingController();
  final _quotePriceCtrl = TextEditingController();

  final _reqCropCtrl = TextEditingController();
  final _reqQtyCtrl = TextEditingController();
  final _reqPriceCtrl = TextEditingController();
  String _reqUnit = 'kg';
  final _reqTimelineCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchPortalData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _quoteQtyCtrl.dispose();
    _quotePriceCtrl.dispose();
    _reqCropCtrl.dispose();
    _reqQtyCtrl.dispose();
    _reqPriceCtrl.dispose();
    _reqTimelineCtrl.dispose();
    super.dispose();
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

  Future<void> _fetchPortalData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final client = _getApiClient();
      
      final results = await Future.wait([
        client.get('/products/'),
        client.get('/orders/quotes/'),
        client.get('/orders/bulk-requirements/'),
        client.get('/orders/pre-harvest-contracts/'),
        client.get('/orders/farmer-offers/'),
      ]);

      setState(() {
        _products = results[0]['data'] ?? [];
        _quotes = results[1]['data'] ?? [];
        _requirements = results[2]['data'] ?? [];
        _contracts = results[3]['data'] ?? [];
        _offers = results[4]['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load bulk portal data: $e')),
      );
    }
  }

  // Bids & Quote Actions
  Future<void> _requestQuote(int productId) async {
    if (_quoteQtyCtrl.text.isEmpty || _quotePriceCtrl.text.isEmpty) return;
    try {
      final client = _getApiClient();
      await client.post('/orders/quotes/', {
        'product': productId,
        'quantity': double.parse(_quoteQtyCtrl.text),
        'buyer_offer_price': double.parse(_quotePriceCtrl.text),
      });

      _quoteQtyCtrl.clear();
      _quotePriceCtrl.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Wholesale quote request submitted to farmer!')));
      _fetchPortalData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to request quote: $e')));
    }
  }

  Future<void> _respondQuote(int quoteId, String action) async {
    try {
      final client = _getApiClient();
      if (action == 'accept') {
        final res = await client.post('/orders/quotes/$quoteId/accept-offer/');
        _showRazorpaySandbox(res);
      } else if (action == 'reject') {
        await client.post('/orders/quotes/$quoteId/reject-offer/');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Counter offer rejected.')));
      }
      _fetchPortalData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
    }
  }

  // Bulk Requirement Posting
  Future<void> _postRequirement() async {
    if (_reqCropCtrl.text.isEmpty ||
        _reqQtyCtrl.text.isEmpty ||
        _reqPriceCtrl.text.isEmpty ||
        _reqTimelineCtrl.text.isEmpty) return;
    
    try {
      final client = _getApiClient();
      await client.post('/orders/bulk-requirements/', {
        'crop_name': _reqCropCtrl.text,
        'quantity_required': double.parse(_reqQtyCtrl.text),
        'unit': _reqUnit,
        'target_price_per_unit': double.parse(_reqPriceCtrl.text),
        'delivery_timeline': _reqTimelineCtrl.text,
      });

      _reqCropCtrl.clear();
      _reqQtyCtrl.clear();
      _reqPriceCtrl.clear();
      _reqTimelineCtrl.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Yield volume requirement posted successfully.')));
      _fetchPortalData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to post requirement: $e')));
    }
  }

  // Farmer Offers handling
  Future<void> _respondFarmerOffer(int offerId, String action) async {
    try {
      final client = _getApiClient();
      if (action == 'accept') {
        final res = await client.post('/orders/farmer-offers/$offerId/accept/');
        _showRazorpaySandbox(res);
      } else if (action == 'reject') {
        await client.post('/orders/farmer-offers/$offerId/reject/');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Farmer offer rejected.')));
      }
      _fetchPortalData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to process offer: $e')));
    }
  }

  // Pre-harvest contract reservation
  Future<void> _reserveContract(int contractId) async {
    try {
      final client = _getApiClient();
      final res = await client.post('/orders/pre-harvest-contracts/$contractId/reserve/');
      _showRazorpaySandbox(res);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to reserve contract: $e')));
    }
  }

  // Checkout payment simulator dialog
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
            Text('Razorpay Sandbox', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order ID: #${orderPayload['order']?['id'] ?? orderPayload['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Amount: ₹${(orderPayload['amount_in_paise'] / 100).toStringAsFixed(2)}'),
            const SizedBox(height: 12),
            const Text(
              'Verify cryptographic mock signature callback flow:',
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
                const SnackBar(content: Text('Payment cancelled. Check unpaid status in order manager.')),
              );
              _fetchPortalData();
            },
            child: const Text('Simulate Failure', style: TextStyle(color: Colors.white)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final client = _getApiClient();
                final ordId = orderPayload['order']?['id'] ?? orderPayload['id'];
                final rzpOrdId = orderPayload['order']?['razorpay_order_id'] ?? orderPayload['razorpay_order_id'] ?? 'mock_rzp';

                await client.post('/orders/payment-callback/', {
                  'order_id': ordId,
                  'razorpay_order_id': rzpOrdId,
                  'razorpay_payment_id': 'pay_bulk_mock_${DateTime.now().millisecondsSinceEpoch}',
                  'razorpay_signature': 'mock_signature',
                });
                
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Wholesale Order payment completed successfully!')),
                );
                _fetchPortalData();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error validating signature: $e')),
                );
              }
            },
            child: const Text('Simulate Success', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // dialog popups
  void _showRequestQuoteDialog(dynamic product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Request Volume Quote: ${product['name']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Stock Available: ${product['quantity']} ${product['unit']}'),
            Text('Listed Price: ₹${product['price_per_unit']} / ${product['unit']}'),
            const SizedBox(height: 12),
            TextField(
              controller: _quoteQtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Target Volume Quantity'),
            ),
            TextField(
              controller: _quotePriceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Your Bid Price per unit (₹)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () => _requestQuote(product['id']),
            child: const Text('Send Offer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showPostRequirementDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
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
              const Text('Post Wholesale Demand Listing 🌾', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Divider(),
              TextField(controller: _reqCropCtrl, decoration: const InputDecoration(labelText: 'Crop Name (e.g. Potato)')),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _reqQtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Volume Quantity Required'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _reqUnit,
                    onChanged: (val) => setModalState(() => _reqUnit = val ?? 'kg'),
                    items: const [
                      DropdownMenuItem(value: 'kg', child: Text('kg')),
                      DropdownMenuItem(value: 'quintal', child: Text('quintal')),
                      DropdownMenuItem(value: 'ton', child: Text('ton')),
                    ],
                  ),
                ],
              ),
              TextField(
                controller: _reqPriceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Target Budget Price (₹ / unit)'),
              ),
              TextField(
                controller: _reqTimelineCtrl,
                decoration: const InputDecoration(labelText: 'Delivery Timeline (e.g. Within 10 Days)'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  onPressed: _postRequirement,
                  child: const Text('Post Demand Listing', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bulk Buyer Portal 🤝', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.green,
          indicatorColor: Colors.green,
          isScrollable: true,
          tabs: const [
            Tab(text: '🌾 Request Quotes'),
            Tab(text: '🤝 Active Negotiations'),
            Tab(text: '📋 Posted Demands'),
            Tab(text: '📝 Forward Contracts'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // REQUEST QUOTES
                RefreshIndicator(
                  onRefresh: _fetchPortalData,
                  child: _products.isEmpty
                      ? const Center(child: Text('No listed produce available for quote request.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _products.length,
                          itemBuilder: (c, idx) {
                            final prod = _products[idx];
                            return Card(
                              child: ListTile(
                                title: Text(prod['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('₹${prod['price_per_unit']} / ${prod['unit']} | Stock: ${prod['quantity']}'),
                                trailing: ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                  onPressed: () => _showRequestQuoteDialog(prod),
                                  child: const Text('Request Quote', style: TextStyle(color: Colors.white, fontSize: 11)),
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // ACTIVE NEGOTIATIONS
                RefreshIndicator(
                  onRefresh: _fetchPortalData,
                  child: _quotes.isEmpty
                      ? const Center(child: Text('No active quote negotiation streams.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _quotes.length,
                          itemBuilder: (c, idx) {
                            final q = _quotes[idx];
                            final status = q['status'] ?? 'pending';
                            final buyerPrice = q['buyer_offer_price'];
                            final farmerPrice = q['farmer_counter_price'];

                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('Quote #${q['id']} - ${q['product_details']?['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        Text(status.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                    Text('Quantity: ${q['quantity']}'),
                                    Text('Your Price Bid: ₹$buyerPrice'),
                                    if (farmerPrice != null) Text('Farmer Counter Price: ₹$farmerPrice', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
                                    const Divider(),
                                    if (status == 'counter_offered')
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          TextButton(
                                            onPressed: () => _respondQuote(q['id'], 'reject'),
                                            child: const Text('Reject Counter', style: TextStyle(color: Colors.red)),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                            onPressed: () => _respondQuote(q['id'], 'accept'),
                                            child: const Text('Accept & Checkout', style: TextStyle(color: Colors.white)),
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

                // POSTED DEMANDS
                RefreshIndicator(
                  onRefresh: _fetchPortalData,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                            icon: const Icon(Icons.add, color: Colors.white),
                            label: const Text('Post Bulk Yield Requirement', style: TextStyle(color: Colors.white)),
                            onPressed: _showPostRequirementDialog,
                          ),
                        ),
                      ),
                      Expanded(
                        child: _requirements.isEmpty
                            ? const Center(child: Text('No wholesale volume demands listed.'))
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                itemCount: _requirements.length,
                                itemBuilder: (c, idx) {
                                  final req = _requirements[idx];
                                  // Find farmer bids matching this requirement
                                  final matchingOffers = _offers.where((o) => o['requirement'] == req['id']).toList();

                                  return Card(
                                    child: Padding(
                                      padding: const EdgeInsets.all(12.0),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(req['crop_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                          Text('Required: ${req['quantity_required']} ${req['unit']} | Target: ₹${req['target_price_per_unit']}'),
                                          Text('Timeline: ${req['delivery_timeline']}'),
                                          const SizedBox(height: 8),
                                          const Divider(),
                                          Text('Incoming Farmer Offers (${matchingOffers.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue)),
                                          if (matchingOffers.isEmpty)
                                            const Padding(
                                              padding: EdgeInsets.all(8.0),
                                              child: Text('No farmer bids received for this requirement yet.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                            )
                                          else
                                            ListView.builder(
                                              shrinkWrap: true,
                                              physics: const NeverScrollableScrollPhysics(),
                                              itemCount: matchingOffers.length,
                                              itemBuilder: (context, oIdx) {
                                                final offer = matchingOffers[oIdx];
                                                final offerStatus = offer['status'] ?? 'pending';
                                                return Container(
                                                  margin: const EdgeInsets.only(top: 8),
                                                  padding: const EdgeInsets.all(8),
                                                  decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8)),
                                                  child: Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      Expanded(
                                                        child: Column(
                                                          crossAxisAlignment: CrossAxisAlignment.start,
                                                          children: [
                                                            Text('Farmer: ${offer['farmer_details']?['username'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                                            Text('Offered: ${offer['quantity_offered']} ${req['unit']} @ ₹${offer['offered_price']}', style: const TextStyle(fontSize: 10)),
                                                          ],
                                                        ),
                                                      ),
                                                      if (offerStatus == 'pending')
                                                        Row(
                                                          children: [
                                                            IconButton(
                                                              icon: const Icon(Icons.cancel, color: Colors.red, size: 20),
                                                              onPressed: () => _respondFarmerOffer(offer['id'], 'reject'),
                                                            ),
                                                            IconButton(
                                                              icon: const Icon(Icons.check_circle, color: Colors.green, size: 20),
                                                              onPressed: () => _respondFarmerOffer(offer['id'], 'accept'),
                                                            ),
                                                          ],
                                                        )
                                                      else
                                                        Text(offerStatus.toUpperCase(), style: TextStyle(fontSize: 10, color: offerStatus == 'accepted' ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
                                                    ],
                                                  ),
                                                );
                                              },
                                            ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),

                // FORWARD CONTRACTS
                RefreshIndicator(
                  onRefresh: _fetchPortalData,
                  child: _contracts.isEmpty
                      ? const Center(child: Text('No Pre-Harvest Forward Contracts currently available.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _contracts.length,
                          itemBuilder: (c, idx) {
                            final con = _contracts[idx];
                            final isReserved = con['is_reserved'] ?? false;
                            return Card(
                              child: ListTile(
                                title: Text(con['crop_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Yield: ${con['estimated_yield']} ${con['unit']} | Target Price: ₹${con['price_per_unit']}'),
                                    Text('Harvest expected: ${con['expected_harvest_date']}'),
                                    Text('Farmer: ${con['farmer_details']?['username'] ?? ''}'),
                                  ],
                                ),
                                trailing: isReserved
                                    ? Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
                                        child: Text('RESERVED', style: TextStyle(color: Colors.amber.shade800, fontSize: 10, fontWeight: FontWeight.bold)),
                                      )
                                    : ElevatedButton(
                                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                        onPressed: () => _reserveContract(con['id']),
                                        child: const Text('Reserve', style: TextStyle(color: Colors.white, fontSize: 11)),
                                      ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
