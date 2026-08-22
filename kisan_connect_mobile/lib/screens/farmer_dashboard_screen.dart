import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'subscription_panel.dart';

class FarmerDashboardScreen extends StatefulWidget {
  const FarmerDashboardScreen({Key? key}) : super(key: key);

  @override
  State<FarmerDashboardScreen> createState() => _FarmerDashboardScreenState();
}

class _FarmerDashboardScreenState extends State<FarmerDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  Map<String, dynamic>? _stats;
  List<dynamic> _listings = [];
  List<dynamic> _orders = [];
  List<dynamic> _quotes = [];
  List<dynamic> _bulkRequirements = [];
  List<dynamic> _myOffers = [];
  List<dynamic> _contracts = [];

  // Form inputs for Add Crop Listing
  final _cropNameCtrl = TextEditingController();
  final _cropDescCtrl = TextEditingController();
  final _cropPriceCtrl = TextEditingController();
  final _cropQtyCtrl = TextEditingController();
  String _selectedUnit = 'kg';
  String _selectedCategory = 'vegetable';
  DateTime? _harvestDate;
  DateTime? _expiryDate;
  final _cropImgUrlCtrl = TextEditingController();

  // Form inputs for Pre-harvest Contract
  final _contractCropCtrl = TextEditingController();
  final _contractPriceCtrl = TextEditingController();
  final _contractYieldCtrl = TextEditingController();
  String _contractUnit = 'kg';
  DateTime? _contractHarvestDate;

  // Form inputs for Counter-Offer
  final _counterPriceCtrl = TextEditingController();

  // Form inputs for Bid Submission on Bulk Demand
  final _bidPriceCtrl = TextEditingController();
  final _bidQtyCtrl = TextEditingController();

  // KYC submission mock
  final _kycDocCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchDashboardData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _cropNameCtrl.dispose();
    _cropDescCtrl.dispose();
    _cropPriceCtrl.dispose();
    _cropQtyCtrl.dispose();
    _cropImgUrlCtrl.dispose();
    _contractCropCtrl.dispose();
    _contractPriceCtrl.dispose();
    _contractYieldCtrl.dispose();
    _counterPriceCtrl.dispose();
    _bidPriceCtrl.dispose();
    _bidQtyCtrl.dispose();
    _kycDocCtrl.dispose();
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

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final client = _getApiClient();
      final user = Provider.of<AuthProvider>(context, listen: false).user!;

      // Concurrently query farmer APIs
      final results = await Future.wait([
        client.get('/farmer/stats/'),
        client.get('/products/?farmer=${user['id']}'),
        client.get('/orders/'),
        client.get('/orders/quotes/'),
        client.get('/orders/bulk-requirements/'),
        client.get('/orders/farmer-offers/'),
        client.get('/orders/pre-harvest-contracts/'),
      ]);

      setState(() {
        _stats = results[0];
        _listings = results[1]['data'] ?? [];
        _orders = results[2]['data'] ?? [];
        _quotes = results[3]['data'] ?? [];
        _bulkRequirements = results[4]['data'] ?? [];
        _myOffers = results[5]['data'] ?? [];
        _contracts = results[6]['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to sync dashboard data: $e')),
      );
    }
  }

  // Listing actions
  Future<void> _addListing() async {
    if (_cropNameCtrl.text.isEmpty ||
        _cropPriceCtrl.text.isEmpty ||
        _cropQtyCtrl.text.isEmpty ||
        _harvestDate == null ||
        _expiryDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete all crop listing inputs')),
      );
      return;
    }

    try {
      final client = _getApiClient();
      await client.post('/products/', {
        'name': _cropNameCtrl.text,
        'description': _cropDescCtrl.text,
        'price_per_unit': double.parse(_cropPriceCtrl.text),
        'unit': _selectedUnit,
        'quantity': double.parse(_cropQtyCtrl.text),
        'category': _selectedCategory,
        'harvest_date': DateFormat('yyyy-MM-dd').format(_harvestDate!),
        'expiry_date': DateFormat('yyyy-MM-dd').format(_expiryDate!),
        'image_url': _cropImgUrlCtrl.text.isNotEmpty ? _cropImgUrlCtrl.text : null,
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Produce listed successfully!')),
      );
      _cropNameCtrl.clear();
      _cropDescCtrl.clear();
      _cropPriceCtrl.clear();
      _cropQtyCtrl.clear();
      _cropImgUrlCtrl.clear();
      Navigator.pop(context);
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit listing: $e')),
      );
    }
  }

  Future<void> _deleteListing(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Listing'),
        content: const Text('Delete this produce card from the marketplace?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final client = _getApiClient();
      await client.delete('/products/$id/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Produce removed.')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to delete: $e')));
    }
  }

  // Quote Negotiation actions
  Future<void> _respondQuote(int quoteId, String action, {double? counterPrice}) async {
    try {
      final client = _getApiClient();
      if (action == 'accept') {
        await client.post('/orders/quotes/$quoteId/accept-offer/');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quote accepted.')));
      } else if (action == 'reject') {
        await client.post('/orders/quotes/$quoteId/reject-offer/');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quote rejected.')));
      } else if (action == 'counter') {
        if (counterPrice == null) return;
        await client.post('/orders/quotes/$quoteId/counter-offer/', {'offered_price': counterPrice});
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Counter-offer sent.')));
      }
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
    }
  }

  // Submit Offer on Bulk Requirement
  Future<void> _submitBulkOffer(int requirementId) async {
    if (_bidPriceCtrl.text.isEmpty || _bidQtyCtrl.text.isEmpty) return;
    try {
      final client = _getApiClient();
      await client.post('/orders/farmer-offers/', {
        'requirement': requirementId,
        'offered_price': double.parse(_bidPriceCtrl.text),
        'quantity_offered': double.parse(_bidQtyCtrl.text),
      });

      _bidPriceCtrl.clear();
      _bidQtyCtrl.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Wholesale quote submitted successfully!')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Submission failed: $e')));
    }
  }

  // Create Forward Contract
  Future<void> _createContract() async {
    if (_contractCropCtrl.text.isEmpty ||
        _contractPriceCtrl.text.isEmpty ||
        _contractYieldCtrl.text.isEmpty ||
        _contractHarvestDate == null) {
      return;
    }

    try {
      final client = _getApiClient();
      await client.post('/orders/pre-harvest-contracts/', {
        'crop_name': _contractCropCtrl.text,
        'price_per_unit': double.parse(_contractPriceCtrl.text),
        'estimated_yield': double.parse(_contractYieldCtrl.text),
        'unit': _contractUnit,
        'expected_harvest_date': DateFormat('yyyy-MM-dd').format(_contractHarvestDate!),
      });

      _contractCropCtrl.clear();
      _contractPriceCtrl.clear();
      _contractYieldCtrl.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Forward contract listed!')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to listing contract: $e')));
    }
  }

  // Submit Mock KYC
  Future<void> _submitKyc() async {
    if (_kycDocCtrl.text.isEmpty) return;
    final res = await Provider.of<AuthProvider>(context, listen: false).submitKyc(_kycDocCtrl.text);
    if (res['success'] == true) {
      _kycDocCtrl.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('KYC submitted. Waiting for admin approval.')));
      _fetchDashboardData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('KYC submission error: ${res['error']}')));
    }
  }

  // --- Visuals helper ---
  Widget _buildStatCard(String title, String val, IconData icon, Color color) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.1),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(val, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Charts
  Widget _buildMandiChart() {
    // Mandi Price list representation
    final mandiData = [
      {'name': 'Tomato', 'mandi': 20.0, 'kisan': 25.0, 'retail': 40.0},
      {'name': 'Potato', 'mandi': 14.0, 'kisan': 18.0, 'retail': 30.0},
      {'name': 'Onion', 'mandi': 18.0, 'kisan': 22.0, 'retail': 35.0},
      {'name': 'Rice', 'mandi': 65.0, 'kisan': 78.0, 'retail': 110.0},
      {'name': 'Wheat', 'mandi': 22.0, 'kisan': 26.0, 'retail': 42.0},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Pricing Benchmark Index (₹/kg)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 4),
          const Text('Traditional Mandi vs KisanConnect Direct vs Retail', style: TextStyle(color: Colors.grey, fontSize: 11)),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 120,
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        if (val.toInt() >= 0 && val.toInt() < mandiData.length) {
                          return Text(mandiData[val.toInt()]['name'] as String, style: const TextStyle(fontSize: 9));
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: true, drawVerticalLine: false),
                barGroups: List.generate(mandiData.length, (idx) {
                  final data = mandiData[idx];
                  return BarChartGroupData(
                    x: idx,
                    barRods: [
                      BarChartRodData(toY: data['mandi'] as double, color: Colors.grey.shade400, width: 8, borderRadius: BorderRadius.circular(2)),
                      BarChartRodData(toY: data['kisan'] as double, color: Theme.of(context).colorScheme.secondary, width: 8, borderRadius: BorderRadius.circular(2)),
                      BarChartRodData(toY: data['retail'] as double, color: Colors.amber, width: 8, borderRadius: BorderRadius.circular(2)),
                    ],
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _legendItem('Mandi Rate', Colors.grey.shade400),
              _legendItem('KisanConnect Direct', Theme.of(context).colorScheme.secondary),
              _legendItem('Retail Store', Colors.amber),
            ],
          )
        ],
      ),
    );
  }

  Widget _legendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
      ],
    );
  }

  Widget _buildDemandForecastChart() {
    if (_stats == null) return const SizedBox();
    final List<dynamic> trends = _stats!['demand_trends'] ?? [];
    if (trends.isEmpty) {
      return const Card(child: Padding(padding: EdgeInsets.all(24), child: Text('No historical sales trends found.')));
    }

    final List<FlSpot> spots = [];
    for (int i = 0; i < trends.length; i++) {
      final double qty = double.tryParse(trends[i]['quantity']?.toString() ?? '0') ?? 0.0;
      spots.add(FlSpot(i.toDouble(), qty));
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Sales Volume Trend (Last 30 Days)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                child: Text('Rule-Based Aggregation', style: TextStyle(color: Colors.blue.shade800, fontSize: 8, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: true, drawVerticalLine: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      getTitlesWidget: (val, meta) {
                        int idx = val.toInt();
                        if (idx >= 0 && idx < trends.length && idx % 7 == 0) {
                          final date = DateTime.parse(trends[idx]['date']);
                          return Text(DateFormat('d MMM').format(date), style: const TextStyle(fontSize: 8, color: Colors.grey));
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: Colors.blue.shade600,
                    barWidth: 3,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: Colors.blue.shade600.withOpacity(0.15),
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  // Dialogue Modals
  void _showAddCropDialog() {
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
              const Text('Add Produce Listing 🍅', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Divider(),
              TextField(controller: _cropNameCtrl, decoration: const InputDecoration(labelText: 'Produce Name')),
              TextField(controller: _cropDescCtrl, decoration: const InputDecoration(labelText: 'Description')),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _cropPriceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Price per Unit (₹)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _selectedUnit,
                    onChanged: (val) => setModalState(() => _selectedUnit = val ?? 'kg'),
                    items: const [
                      DropdownMenuItem(value: 'kg', child: Text('kg')),
                      DropdownMenuItem(value: 'quintal', child: Text('quintal')),
                      DropdownMenuItem(value: 'ton', child: Text('ton')),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _cropQtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Available Quantity'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _selectedCategory,
                    onChanged: (val) => setModalState(() => _selectedCategory = val ?? 'vegetable'),
                    items: const [
                      DropdownMenuItem(value: 'vegetable', child: Text('Vegetables')),
                      DropdownMenuItem(value: 'fruit', child: Text('Fruits')),
                      DropdownMenuItem(value: 'grain', child: Text('Grains')),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_harvestDate == null
                      ? 'Harvest Date: Unselected'
                      : 'Harvest: ${DateFormat('dd-MM-yyyy').format(_harvestDate!)}'),
                  TextButton(
                    onPressed: () async {
                      final selected = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now().add(const Duration(days: 30)),
                      );
                      if (selected != null) setModalState(() => _harvestDate = selected);
                    },
                    child: const Text('Select Date'),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_expiryDate == null
                      ? 'Expiry Date: Unselected'
                      : 'Expiry: ${DateFormat('dd-MM-yyyy').format(_expiryDate!)}'),
                  TextButton(
                    onPressed: () async {
                      final selected = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now().add(const Duration(days: 7)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (selected != null) setModalState(() => _expiryDate = selected);
                    },
                    child: const Text('Select Date'),
                  ),
                ],
              ),
              TextField(controller: _cropImgUrlCtrl, decoration: const InputDecoration(labelText: 'Image URL (optional)')),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                  onPressed: _addListing,
                  child: const Text('Publish Listing', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showContractDialog() {
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
              const Text('Create Forward Contract 📝', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Divider(),
              TextField(controller: _contractCropCtrl, decoration: const InputDecoration(labelText: 'Crop Name')),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _contractPriceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Expected Price per Unit (₹)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _contractUnit,
                    onChanged: (val) => setModalState(() => _contractUnit = val ?? 'kg'),
                    items: const [
                      DropdownMenuItem(value: 'kg', child: Text('kg')),
                      DropdownMenuItem(value: 'quintal', child: Text('quintal')),
                      DropdownMenuItem(value: 'ton', child: Text('ton')),
                    ],
                  ),
                ],
              ),
              TextField(
                controller: _contractYieldCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Estimated Volume Yield'),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_contractHarvestDate == null
                      ? 'Harvest Date: Unselected'
                      : 'Harvest: ${DateFormat('dd-MM-yyyy').format(_contractHarvestDate!)}'),
                  TextButton(
                    onPressed: () async {
                      final selected = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now().add(const Duration(days: 30)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (selected != null) setModalState(() => _contractHarvestDate = selected);
                    },
                    child: const Text('Select Date'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                  onPressed: _createContract,
                  child: const Text('Create Contract', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCounterOfferDialog(int quoteId, double currentBidPrice) {
    _counterPriceCtrl.text = currentBidPrice.toString();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Propose Counter Offer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter your wholesale volume price counter (₹):'),
            TextField(controller: _counterPriceCtrl, keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
            onPressed: () {
              Navigator.pop(ctx);
              _respondQuote(quoteId, 'counter', counterPrice: double.tryParse(_counterPriceCtrl.text));
            },
            child: const Text('Send Counter', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showSubmitBidDialog(dynamic req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Quote Bid: ${req['crop_name']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Requirement Volume: ${req['quantity_required']} ${req['unit']}'),
            Text('Target Price: ₹${req['target_price_per_unit']} / ${req['unit']}'),
            const SizedBox(height: 12),
            TextField(
              controller: _bidPriceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Your Offered Price (₹)'),
            ),
            TextField(
              controller: _bidQtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Your Offered Quantity'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
            onPressed: () => _submitBulkOffer(req['id']),
            child: const Text('Submit Offer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Farmer Console 🌾', style: TextStyle(fontWeight: FontWeight.w900, color: Theme.of(context).primaryColor)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Theme.of(context).primaryColor,
          indicatorColor: Theme.of(context).primaryColor,
          isScrollable: true,
          tabs: const [
            Tab(text: '📈 Overview'),
            Tab(text: '📦 My Produce'),
            Tab(text: '🤝 Negotiations'),
            Tab(text: '💼 Bulk Demands'),
            Tab(text: '📝 Forward Contracts'),
            Tab(text: '📅 Subscriptions'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // OVERVIEW TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // KYC Alert Banner
                        if (user != null) ...[
                          if (user['kyc_status'] == 'unsubmitted')
                            _buildKycBanner(
                              'KYC verification is required to accept payment transfers. Propose details to verify.',
                              Colors.amber,
                              true,
                            )
                          else if (user['kyc_status'] == 'pending')
                            _buildKycBanner(
                              'KYC document pending review by admin coordinators.',
                              Colors.orange,
                              false,
                            )
                          else if (user['kyc_status'] == 'approved')
                            _buildKycBanner(
                              'KYC verified successfully. Account fully operational.',
                              Theme.of(context).colorScheme.secondary,
                              false,
                            )
                        ],
                        const SizedBox(height: 12),
                        // Stats Grid
                        if (_stats != null) ...[
                          GridView.count(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisCount: 2,
                            childAspectRatio: 2.2,
                            children: [
                              _buildStatCard('Total Earnings', '₹${_stats!['total_earnings']?.toStringAsFixed(2) ?? '0.00'}', Icons.currency_rupee, Theme.of(context).primaryColor),
                              _buildStatCard('Pending Orders', '${_stats!['total_orders_received'] ?? 0}', Icons.schedule, Colors.amber),
                              _buildStatCard('Active listings', '${_listings.length}', Icons.grass, Colors.blue),
                              _buildStatCard('Total Yield Sold', '${_stats!['total_yield_sold'] ?? 0} items', Icons.local_mall, Colors.indigo),
                            ],
                          ),
                        ],
                        const SizedBox(height: 16),
                        _buildDemandForecastChart(),
                      ],
                    ),
                  ),
                ),

                // CROP LISTINGS TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                            icon: const Icon(Icons.add, color: Colors.white),
                            label: const Text('Add Fresh Crop Listing', style: TextStyle(color: Colors.white)),
                            onPressed: _showAddCropDialog,
                          ),
                        ),
                      ),
                      Expanded(
                        child: _listings.isEmpty
                            ? const Center(child: Text('No active Listings. Publish a produce card to marketplace.'))
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                itemCount: _listings.length,
                                itemBuilder: (c, idx) {
                                  final item = _listings[idx];
                                  return Card(
                                    child: ListTile(
                                      title: Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                      subtitle: Text('₹${item['price_per_unit']} / ${item['unit']} | Stock: ${item['quantity']}'),
                                      trailing: IconButton(
                                        icon: const Icon(Icons.delete, color: Colors.red),
                                        onPressed: () => _deleteListing(item['id']),
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),

                // NEGOTIATIONS TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: _quotes.isEmpty
                      ? const Center(child: Text('No incoming wholesale quote negotiations requests.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _quotes.length,
                          itemBuilder: (c, idx) {
                            final q = _quotes[idx];
                            final status = q['status'] ?? 'pending';
                            final buyerPrice = q['buyer_offer_price'];
                            final farmerPrice = q['farmer_counter_price'];
                            final volume = q['quantity'];

                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('Quote Request #${q['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        Text(status.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                    Text('Produce: ${q['product_details']?['name'] ?? ''}'),
                                    Text('Quantity Requested: $volume'),
                                    Text('Buyer Price Bid: ₹$buyerPrice'),
                                    if (farmerPrice != null) Text('Your Counter Price: ₹$farmerPrice'),
                                    const Divider(),
                                    if (status == 'pending' || status == 'counter_offered')
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          TextButton(
                                            onPressed: () => _respondQuote(q['id'], 'reject'),
                                            child: const Text('Reject', style: TextStyle(color: Colors.red)),
                                          ),
                                          const SizedBox(width: 8),
                                          OutlinedButton(
                                            onPressed: () => _showCounterOfferDialog(q['id'], double.parse(buyerPrice.toString())),
                                            child: const Text('Counter Offer'),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                            onPressed: () => _respondQuote(q['id'], 'accept'),
                                            child: const Text('Accept', style: TextStyle(color: Colors.white)),
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

                // BULK DEMANDS TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: _bulkRequirements.isEmpty
                      ? const Center(child: Text('No active wholesale corporate requests listings.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _bulkRequirements.length,
                          itemBuilder: (c, idx) {
                            final req = _bulkRequirements[idx];
                            return Card(
                              child: ListTile(
                                title: Text(req['crop_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Required Volume: ${req['quantity_required']} ${req['unit']}'),
                                    Text('Target Price: ₹${req['target_price_per_unit']} / ${req['unit']}'),
                                    Text('Buyer: ${req['buyer_details']?['username'] ?? ''}'),
                                  ],
                                ),
                                trailing: ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                  onPressed: () => _showSubmitBidDialog(req),
                                  child: const Text('Bid/Offer', style: TextStyle(color: Colors.white, fontSize: 11)),
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // FORWARD CONTRACTS TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                            icon: const Icon(Icons.edit_note, color: Colors.white),
                            label: const Text('Create Pre-Harvest Forward Contract', style: TextStyle(color: Colors.white)),
                            onPressed: _showContractDialog,
                          ),
                        ),
                      ),
                      Expanded(
                        child: _contracts.isEmpty
                            ? const Center(child: Text('No pre-harvest contracts listed.'))
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                itemCount: _contracts.length,
                                itemBuilder: (c, idx) {
                                  final con = _contracts[idx];
                                  final isReserved = con['is_reserved'] ?? false;
                                  return Card(
                                    child: ListTile(
                                      title: Text(con['crop_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                      subtitle: Text(
                                          'Yield: ${con['estimated_yield']} ${con['unit']} | Price: ₹${con['price_per_unit']}\nHarvest expected: ${con['expected_harvest_date']}'),
                                      trailing: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                            color: isReserved ? Colors.amber.shade50 : Colors.blue.shade50,
                                            borderRadius: BorderRadius.circular(8)),
                                        child: Text(
                                          isReserved ? 'RESERVED' : 'AVAILABLE',
                                          style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: isReserved ? Colors.amber.shade800 : Colors.blue.shade800),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
                
                // SUBSCRIPTIONS TAB
                const SingleChildScrollView(
                  padding: EdgeInsets.all(16),
                  child: SubscriptionPanel(role: 'farmer'),
                ),
              ],
            ),
    );
  }

  Widget _buildKycBanner(String text, Color color, bool actionRequired) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_user, color: color),
              const SizedBox(width: 8),
              const Text('KYC Verification Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 6),
          Text(text, style: const TextStyle(fontSize: 12)),
          if (actionRequired) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _kycDocCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Enter Document Reference (e.g. Aadhaar / PAN)',
                      contentPadding: EdgeInsets.all(8),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                  onPressed: _submitKyc,
                  child: const Text('Verify', style: TextStyle(color: Colors.white)),
                )
              ],
            )
          ]
        ],
      ),
    );
  }
}
