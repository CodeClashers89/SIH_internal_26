import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/b2b_provider.dart';
import '../../providers/auth_provider.dart';

class BulkBuyerTab extends StatefulWidget {
  const BulkBuyerTab({super.key});

  @override
  State<BulkBuyerTab> createState() => _BulkBuyerTabState();
}

class _BulkBuyerTabState extends State<BulkBuyerTab> {
  String _activeTab = 'dashboard'; // 'dashboard', 'quotes', 'reverse', 'contracts', 'subscriptions'
  bool _isSyncing = false;

  // Single Crop Quote Form State
  int? _selectedProductId;
  final _quantityController = TextEditingController();
  final _targetPriceController = TextEditingController();
  String? _quoteError;
  bool _isSubmittingQuote = false;
  final Map<String, TextEditingController> _counterPriceControllers = {};

  // Autocomplete search focus/state
  final _searchFocusNode = FocusNode();
  bool _showProductSuggestions = false;

  // Reverse Sourcing Form State
  final _reqCropCtrl = TextEditingController();
  final _reqVarietyCtrl = TextEditingController();
  final _reqQtyCtrl = TextEditingController();
  String _reqUnit = 'kg';
  final _reqGrade = 'A';
  final _reqPriceMinCtrl = TextEditingController();
  final _reqPriceMaxCtrl = TextEditingController();
  final _reqDateCtrl = TextEditingController(text: '2026-10-30');
  final _reqLocationCtrl = TextEditingController(text: 'APMC Central Mandi Hub');
  bool _isSubmittingReq = false;

  // Subscription Form State
  final _subCropCtrl = TextEditingController();
  final _subQtyCtrl = TextEditingController(text: '250');
  final _subPriceCtrl = TextEditingController(text: '22');
  String _subDays = 'Daily';
  bool _isSubmittingSub = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final b2b = Provider.of<B2BProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (b2b.products.isNotEmpty && _selectedProductId == null) {
        setState(() {
          _selectedProductId = b2b.products.first.id;
        });
      }
      b2b.fetchAllData(auth.token, buyerId: auth.currentUser.id);
    });
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _targetPriceController.dispose();
    _searchFocusNode.dispose();
    _reqCropCtrl.dispose();
    _reqVarietyCtrl.dispose();
    _reqQtyCtrl.dispose();
    _reqPriceMinCtrl.dispose();
    _reqPriceMaxCtrl.dispose();
    _reqDateCtrl.dispose();
    _reqLocationCtrl.dispose();
    _subCropCtrl.dispose();
    _subQtyCtrl.dispose();
    _subPriceCtrl.dispose();
    for (final c in _counterPriceControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _handleTabChange(String tabKey) {
    setState(() {
      _activeTab = tabKey;
      _showProductSuggestions = false;
    });
  }

  Future<void> _handleSync() async {
    setState(() => _isSyncing = true);
    final b2b = Provider.of<B2BProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await b2b.fetchAllData(auth.token, buyerId: auth.currentUser.id);
    if (mounted) {
      setState(() => _isSyncing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Wholesale data synced with regional APMCs"),
          backgroundColor: Color(0xFF064E3B),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  // --- Payment Dialogs ---

  void _showRazorpaySandboxModal({
    required String orderId,
    required double totalAmount,
    required VoidCallback onSuccess,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.security_rounded, color: Color(0xFF34D399), size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Razorpay Gateway Simulator", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text("Wholesale Escrow Checkout", style: TextStyle(color: Colors.white60, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white10),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Order Reference", style: TextStyle(color: Colors.white60, fontSize: 12)),
                        Text(orderId, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Payment Method", style: TextStyle(color: Colors.white60, fontSize: 12)),
                        const Text("Corporate NetBanking / Escrow", style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                    const Divider(color: Colors.white12, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Total Payable", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        Text("₹${totalAmount.toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 18)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Funds will be locked in KisanConnect Escrow until goods pass regional APMC quality inspection.",
                style: TextStyle(color: Colors.white70, fontSize: 11),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Cancel Transaction", style: TextStyle(color: Colors.redAccent)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _showEscrowVerificationModal(totalAmount: totalAmount, onSuccess: onSuccess);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text("Simulate Successful Payment"),
            ),
          ],
        );
      },
    );
  }

  void _showEscrowVerificationModal({
    required double totalAmount,
    required VoidCallback onSuccess,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setModalState) {
            return FutureBuilder(
              future: Future.delayed(const Duration(milliseconds: 1200)),
              builder: (fCtx, snapshot) {
                final isDone = snapshot.connectionState == ConnectionState.done;
                return AlertDialog(
                  backgroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  content: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: isDone ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isDone ? Icons.check_circle_rounded : Icons.hourglass_top_rounded,
                            color: isDone ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                            size: 36,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          isDone ? "Wholesale Payment Confirmed! 🎉" : "Securing Escrow Funds...",
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isDone
                              ? "₹${totalAmount.toStringAsFixed(2)} secured in KisanConnect Escrow.\nLogistics shipment created and broadcast to regional transport partners."
                              : "Verifying bank cryptographic signature with NPCI and locking funds in regional APMC escrow...",
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 20),
                        if (isDone)
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(dialogCtx);
                              onSuccess();
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(44),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            child: const Text("View Dashboard & Logistics"),
                          ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final b2b = Provider.of<B2BProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            _buildTopBar(b2b),

            // Sub Navigation Pill Bar
            _buildSubNavBar(),

            // Active Tab Content
            Expanded(
              child: RefreshIndicator(
                onRefresh: _handleSync,
                color: const Color(0xFF059669),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: _buildActiveTabContent(b2b, user.name),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- 1. Top Header Bar ---
  Widget _buildTopBar(B2BProvider b2b) {
    String title = "Bulk Buyer Dashboard";
    String subtitle = "Manage crop bids, submit reverse sourcing tenders, monitor forward contracts, and track subscriptions.";

    switch (_activeTab) {
      case 'quotes':
        title = "Single Crop Bids & Negotiations";
        subtitle = "Submit and negotiate direct wholesale crop pricing with regional farmers & FPOs.";
        break;
      case 'reverse':
        title = "Reverse Sourcing Demands";
        subtitle = "Publish customized procurement specs for verified regional growers to quote.";
        break;
      case 'contracts':
        title = "Pre-Harvest Forward Contracts";
        subtitle = "Lock guaranteed yield commitments before harvest with fixed price protections.";
        break;
      case 'subscriptions':
        title = "Recurring Produce Subscriptions";
        subtitle = "Automate recurring deliveries with custom delivery cycles and volume discounts.";
        break;
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        border: Border(bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.15))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (_activeTab != 'dashboard')
                OutlinedButton(
                  onPressed: () => _handleTabChange('dashboard'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text("← Overview", style: TextStyle(fontSize: 11)),
                ),
              const SizedBox(width: 6),
              ElevatedButton.icon(
                onPressed: _isSyncing ? null : _handleSync,
                icon: _isSyncing
                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.refresh_rounded, size: 14),
                label: const Text("Sync Data", style: TextStyle(fontSize: 11)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 2. Sub Navigation Pill Bar ---
  Widget _buildSubNavBar() {
    final navItems = [
      {'key': 'dashboard', 'label': 'Overview', 'icon': Icons.dashboard_rounded},
      {'key': 'quotes', 'label': 'Single Crop Bids', 'icon': Icons.handshake_rounded},
      {'key': 'reverse', 'label': 'Reverse Sourcing', 'icon': Icons.layers_rounded},
      {'key': 'contracts', 'label': 'Pre-Harvest Contracts', 'icon': Icons.description_rounded},
      {'key': 'subscriptions', 'label': 'Recurring Subscriptions', 'icon': Icons.autorenew_rounded},
    ];

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: navItems.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (ctx, idx) {
          final item = navItems[idx];
          final tabKey = item['key'] as String;
          final isSelected = _activeTab == tabKey;

          return InkWell(
            key: ValueKey('subnav_$tabKey'),
            onTap: () => _handleTabChange(tabKey),
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF059669) : Colors.grey.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? const Color(0xFF059669) : Colors.grey.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    item['icon'] as IconData,
                    size: 16,
                    color: isSelected ? Colors.white : Colors.grey.shade700,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    item['label'] as String,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isSelected ? Colors.white : Colors.grey.shade800,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Tab Content Router ---
  Widget _buildActiveTabContent(B2BProvider b2b, String buyerName) {
    switch (_activeTab) {
      case 'quotes':
        return _buildQuotesTab(b2b);
      case 'reverse':
        return _buildReverseTab(b2b);
      case 'contracts':
        return _buildContractsTab(b2b);
      case 'subscriptions':
        return _buildSubscriptionsTab(b2b);
      case 'dashboard':
      default:
        return _buildDashboardOverview(b2b, buyerName);
    }
  }

  // ==========================================
  // MODULE 1: DASHBOARD OVERVIEW
  // ==========================================
  Widget _buildDashboardOverview(B2BProvider b2b, String buyerName) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Welcome Hero Banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF065F46), Color(0xFF047857)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF064E3B).withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white24),
                ),
                child: const Text("B2B PROCUREMENT HUB", style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ),
              const SizedBox(height: 12),
              Text(
                "Welcome back, $buyerName 👋",
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                "Manage your active single-crop bids, post custom reverse sourcing requirements, lock pre-harvest forward contracts, and automate recurring deliveries.",
                style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                key: const ValueKey('btn_post_new_requirement_hero'),
                onPressed: () => _handleTabChange('reverse'),
                icon: const Icon(Icons.add_circle_outline, size: 16),
                label: const Text("Post New Requirement"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Quick Shortcuts Grid
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Recent Bids Summary
            Expanded(
              child: _buildOverviewSummaryCard(
                title: "Recent Active Bids",
                icon: Icons.handshake_rounded,
                iconColor: const Color(0xFF059669),
                count: b2b.quotes.length,
                onViewAll: () => _handleTabChange('quotes'),
                items: b2b.quotes.take(3).map((q) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(q.productName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                              Text("${q.quantity.toInt()} ${q.productUnit} • Target ₹${q.targetPrice}", style: const TextStyle(color: Colors.grey, fontSize: 10)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: q.status == 'accepted'
                                ? const Color(0xFFDCFCE7)
                                : q.status == 'offered'
                                    ? const Color(0xFFDBEAFE)
                                    : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            q.status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: q.status == 'accepted'
                                  ? const Color(0xFF16A34A)
                                  : q.status == 'offered'
                                      ? const Color(0xFF2563EB)
                                      : const Color(0xFFD97706),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Active Sourcing Requirements Summary
        _buildOverviewSummaryCard(
          title: "Active Sourcing Requirements",
          icon: Icons.layers_rounded,
          iconColor: const Color(0xFF0D9488),
          count: b2b.requirements.length,
          onViewAll: () => _handleTabChange('reverse'),
          items: b2b.requirements.take(3).map((r) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("${r.cropName} (${r.variety})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        Text("${r.targetQuantity.toInt()} ${r.unit} • Grade ${r.grade} • Target ₹${r.targetPriceMin}-₹${r.targetPriceMax}", style: const TextStyle(color: Colors.grey, fontSize: 10)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: r.status == 'fulfilled' ? const Color(0xFFDCFCE7) : const Color(0xFFCCFBF1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      r.status == 'fulfilled' ? 'POOLED' : '${r.offers.length} OFFERS',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: r.status == 'fulfilled' ? const Color(0xFF16A34A) : const Color(0xFF0F766E),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildOverviewSummaryCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required int count,
    required VoidCallback onViewAll,
    required List<Widget> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 18, color: iconColor),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ],
              ),
              TextButton(
                onPressed: onViewAll,
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                ),
                child: Text("View All ($count) →", style: TextStyle(color: iconColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Divider(height: 16),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text("No items available yet.", style: TextStyle(color: Colors.grey, fontSize: 11)),
              ),
            )
          else
            ...items,
        ],
      ),
    );
  }

  // ==========================================
  // MODULE 2: SINGLE CROP BIDS & NEGOTIATIONS
  // ==========================================
  Widget _buildQuotesTab(B2BProvider b2b) {
    final filtered = b2b.filteredProducts;

    // Auto-sync selected product if not in filtered list
    if (filtered.isNotEmpty && (_selectedProductId == null || !filtered.any((p) => p.id == _selectedProductId))) {
      _selectedProductId = filtered.first.id;
    }

    final selectedProduct = filtered.isNotEmpty
        ? filtered.firstWhere((p) => p.id == _selectedProductId, orElse: () => filtered.first)
        : (b2b.products.isNotEmpty ? b2b.products.first : null);

    final reqQty = double.tryParse(_quantityController.text) ?? 0.0;
    final targetBid = double.tryParse(_targetPriceController.text) ?? 0.0;
    final hasStockWarning = selectedProduct != null && reqQty > 0 && reqQty > selectedProduct.quantity;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Form Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("WHOLESALE CHANNEL", style: TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              const SizedBox(height: 2),
              const Text("Negotiate Specific Listing", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text("Filter by farmer, product, required stock, or target budget to submit direct wholesale bids.", style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 16),

              // Smart Filters Bar (Optional discovery filters)
              _buildSmartFilterBar(b2b),

              const SizedBox(height: 16),

              if (_quoteError != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, size: 16, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_quoteError!, style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.w600))),
                    ],
                  ),
                ),

              // Product Dropdown
              const Text("SELECT CROP & FARMER LISTING *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 6),
              if (filtered.isEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 18),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text("No farmer listings match your filters.", style: TextStyle(color: Color(0xFF92400E), fontSize: 11)),
                      ),
                      TextButton(
                        onPressed: () => b2b.resetFilters(),
                        child: const Text("Reset Filters", style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.bold, fontSize: 11)),
                      ),
                    ],
                  ),
                )
              else
                DropdownButtonFormField<int>(
                  initialValue: _selectedProductId,
                  isExpanded: true,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  items: filtered.map((p) {
                    return DropdownMenuItem<int>(
                      value: p.id,
                      child: Text(
                        "${p.name} • ${p.quantity.toInt()} ${p.unit} @ ₹${p.pricePerUnit}/${p.unit} (👨‍🌾 ${p.farmerUsername})",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedProductId = val;
                        _quoteError = null;
                      });
                    }
                  },
                ),

              const SizedBox(height: 12),

              // Quantity & Price Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("TARGET QUANTITY *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 6),
                        TextField(
                          key: const ValueKey('input_quote_quantity'),
                          controller: _quantityController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: "e.g. 500",
                            suffixText: selectedProduct?.unit ?? 'kg',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("TARGET BID PRICE (₹/UNIT) *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 6),
                        TextField(
                          key: const ValueKey('input_quote_price'),
                          controller: _targetPriceController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: "e.g. 20.00",
                            prefixText: "₹ ",
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Stock Warning or Target Total
              if (hasStockWarning)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFD97706)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          "Requested ($reqQty ${selectedProduct.unit}) exceeds farmer's stock (${selectedProduct.quantity} ${selectedProduct.unit}). Adjust quantity or post Reverse Sourcing requirement.",
                          style: const TextStyle(fontSize: 10, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                )
              else if (reqQty > 0 && targetBid > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    "Target Total: ₹${(reqQty * targetBid).toStringAsFixed(2)}",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF059669)),
                  ),
                ),

              const SizedBox(height: 14),

              // Selected Crop & Farmer Info Card
              if (selectedProduct != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("LISTING PRICE", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                          Text("₹${selectedProduct.pricePerUnit.toStringAsFixed(2)} / ${selectedProduct.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("AVAILABLE STOCK", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                          Text("${selectedProduct.quantity.toInt()} ${selectedProduct.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF065F46))),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: Text("👨‍🌾 ${selectedProduct.farmerUsername}\n(${selectedProduct.district})", textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 16),

              // Submit Button
              ElevatedButton.icon(
                key: const ValueKey('btn_initiate_negotiation'),
                onPressed: _isSubmittingQuote || filtered.isEmpty
                    ? null
                    : () async {
                        final qty = double.tryParse(_quantityController.text) ?? 0.0;
                        final price = double.tryParse(_targetPriceController.text) ?? 0.0;
                        if (qty <= 0 || price <= 0 || _selectedProductId == null) {
                          setState(() => _quoteError = "Please enter valid quantity and target bid price.");
                          return;
                        }

                        setState(() {
                          _isSubmittingQuote = true;
                          _quoteError = null;
                        });

                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        final res = await b2b.submitQuote(
                          productId: _selectedProductId!,
                          quantity: qty,
                          targetPrice: price,
                          token: auth.token,
                        );

                        if (mounted) {
                          setState(() => _isSubmittingQuote = false);
                          if (res['success'] == true) {
                            _quantityController.clear();
                            _targetPriceController.clear();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Wholesale quote negotiation initiated with farmer!"), backgroundColor: Color(0xFF059669)),
                            );
                          } else {
                            setState(() => _quoteError = res['error']);
                          }
                        }
                      },
                icon: _isSubmittingQuote
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.handshake_rounded, size: 18),
                label: const Text("Initiate Negotiation with Farmer"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // 2. Negotiation Log Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("NEGOTIATION PORTFOLIO", style: TextStyle(color: Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              const SizedBox(height: 2),
              const Text("Negotiation Log", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text("Review active, countered, or completed negotiations.", style: TextStyle(fontSize: 11, color: Colors.grey)),
              const Divider(height: 20),

              if (b2b.quotes.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text("No active quote negotiations.", style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: b2b.quotes.length,
                  separatorBuilder: (context, index) => const Divider(height: 16),
                  itemBuilder: (ctx, idx) {
                    final quote = b2b.quotes[idx];
                    return _buildQuoteNegotiationItem(b2b, quote);
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSmartFilterBar(B2BProvider b2b) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.tune_rounded, size: 16, color: Color(0xFF059669)),
                  SizedBox(width: 6),
                  Text("Filter Farmers & Available Crops", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
              if (b2b.isAnyFilterActive)
                TextButton.icon(
                  onPressed: () => b2b.resetFilters(),
                  icon: const Icon(Icons.close_rounded, size: 12, color: Colors.red),
                  label: const Text("Clear Filters", style: TextStyle(fontSize: 10, color: Colors.red)),
                  style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: EdgeInsets.zero),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Filters Row
          Row(
            children: [
              // Farmer Dropdown
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: b2b.filterFarmer.isEmpty ? '' : b2b.filterFarmer,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: "Select Farmer",
                    labelStyle: const TextStyle(fontSize: 11),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: [
                    DropdownMenuItem(value: '', child: Text("👨‍🌾 All Farmers (${b2b.uniqueFarmers.length})", style: const TextStyle(fontSize: 11))),
                    ...b2b.uniqueFarmers.map((f) {
                      return DropdownMenuItem(
                        value: f['id'].toString(),
                        child: Text("👨‍🌾 ${f['username']} (${f['district']})", style: const TextStyle(fontSize: 11)),
                      );
                    }),
                  ],
                  onChanged: (val) => b2b.setFilterFarmer(val ?? ''),
                ),
              ),
              const SizedBox(width: 8),

              // Search Product
              Expanded(
                child: TextField(
                  focusNode: _searchFocusNode,
                  decoration: InputDecoration(
                    hintText: "Search crop...",
                    hintStyle: const TextStyle(fontSize: 11),
                    prefixIcon: const Icon(Icons.search, size: 16),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (val) {
                    b2b.setFilterProduct(val);
                    setState(() => _showProductSuggestions = val.isNotEmpty);
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          Row(
            children: [
              Expanded(
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: "Min Stock (kg)",
                    hintStyle: const TextStyle(fontSize: 11),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (val) => b2b.setFilterMinQty(val),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: "Max Price (₹)",
                    hintStyle: const TextStyle(fontSize: 11),
                    prefixText: "₹ ",
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (val) => b2b.setFilterMaxPrice(val),
                ),
              ),
            ],
          ),

          // Autocomplete suggestions box
          if (_showProductSuggestions)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
              ),
              child: Column(
                children: b2b.searchMatchingProducts(b2b.filterProduct).map((p) {
                  return ListTile(
                    dense: true,
                    visualDensity: VisualDensity.compact,
                    title: Text(p.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    subtitle: Text("👨‍🌾 ${p.farmerUsername} (${p.district}) • ₹${p.pricePerUnit}/${p.unit}", style: const TextStyle(fontSize: 10)),
                    trailing: Text("${p.quantity.toInt()} ${p.unit}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                    onTap: () {
                      b2b.setFilterProduct(p.name);
                      setState(() {
                        _selectedProductId = p.id;
                        _showProductSuggestions = false;
                      });
                    },
                  );
                }).toList(),
              ),
            ),

          const SizedBox(height: 6),
          Text(
            "Showing ${b2b.filteredProducts.length} of ${b2b.products.length} available crop listings",
            style: const TextStyle(fontSize: 10, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildQuoteNegotiationItem(B2BProvider b2b, B2BQuote quote) {
    if (!_counterPriceControllers.containsKey(quote.id)) {
      _counterPriceControllers[quote.id] = TextEditingController();
    }
    final counterCtrl = _counterPriceControllers[quote.id]!;
    final auth = Provider.of<AuthProvider>(context, listen: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(quote.productName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: quote.status == 'accepted'
                    ? const Color(0xFFDCFCE7)
                    : quote.status == 'offered'
                        ? const Color(0xFFDBEAFE)
                        : quote.status == 'rejected'
                            ? const Color(0xFFFEE2E2)
                            : const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                quote.status == 'offered' ? 'REVIEWING' : quote.status.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: quote.status == 'accepted'
                      ? const Color(0xFF16A34A)
                      : quote.status == 'offered'
                          ? const Color(0xFF2563EB)
                          : quote.status == 'rejected'
                              ? const Color(0xFFDC2626)
                              : const Color(0xFFD97706),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text("👨‍🌾 Farmer: ${quote.farmerUsername} (${quote.district})", style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("Qty: ${quote.quantity.toInt()} ${quote.productUnit}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            Text("Your Bid: ₹${quote.targetPrice.toStringAsFixed(2)}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            Text(
              quote.offeredPrice != null ? "Farmer Counter: ₹${quote.offeredPrice!.toStringAsFixed(2)}" : "Counter: —",
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: quote.offeredPrice != null ? const Color(0xFF059669) : Colors.grey,
              ),
            ),
          ],
        ),

        // Actions per status
        if (quote.status == 'offered') ...[
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: counterCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: "Counter ₹",
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              ElevatedButton(
                key: ValueKey('btn_counter_${quote.id}'),
                onPressed: () async {
                  final price = double.tryParse(counterCtrl.text) ?? 0.0;
                  if (price <= 0) return;
                  await b2b.counterQuote(quoteId: quote.id, targetPrice: price, token: auth.token);
                  counterCtrl.clear();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Counter offer submitted to farmer!"), backgroundColor: Color(0xFFD97706)),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("Counter", style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(width: 6),
              ElevatedButton(
                key: ValueKey('btn_accept_${quote.id}'),
                onPressed: () async {
                  final res = await b2b.acceptQuote(quoteId: quote.id, token: auth.token);
                  if (res['success'] == true) {
                    final order = res['order'] as Map<String, dynamic>?;
                    final total = (order?['total_amount'] is num)
                        ? (order!['total_amount'] as num).toDouble()
                        : (quote.quantity * (quote.offeredPrice ?? quote.targetPrice));
                    _showRazorpaySandboxModal(
                      orderId: order?['id']?.toString() ?? quote.id,
                      totalAmount: total,
                      onSuccess: () => _handleTabChange('dashboard'),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("Accept", style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(width: 6),
              OutlinedButton(
                onPressed: () => b2b.rejectQuote(quoteId: quote.id, token: auth.token),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("Reject", style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ] else if (quote.status == 'accepted') ...[
          const SizedBox(height: 6),
          const Row(
            children: [
              Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF059669)),
              SizedBox(width: 4),
              Text("Contract Locked & Allocated", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
            ],
          ),
        ] else if (quote.status == 'pending') ...[
          const SizedBox(height: 4),
          const Text("Awaiting Farmer Response", style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey)),
        ] else if (quote.status == 'rejected') ...[
          const SizedBox(height: 4),
          const Text("Negotiation Closed", style: TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ],
    );
  }

  // ==========================================
  // MODULE 3: REVERSE SOURCING DEMANDS
  // ==========================================
  Widget _buildReverseTab(B2BProvider b2b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Post Bulk Requirement Form Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("REVERSE SOURCING CHANNEL", style: TextStyle(color: Color(0xFF0D9488), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              const SizedBox(height: 2),
              const Text("Post Bulk Sourcing Order", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text("Submit large buying requirements. Multiple verified regional farmers can contribute to fulfill the pool.", style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('input_req_crop'),
                      controller: _reqCropCtrl,
                      decoration: InputDecoration(
                        labelText: "Crop Name *",
                        hintText: "e.g. Tomato",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _reqVarietyCtrl,
                      decoration: InputDecoration(
                        labelText: "Variety / Grade",
                        hintText: "e.g. Hybrid / A Grade",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('input_req_qty'),
                      controller: _reqQtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Req. Quantity *",
                        hintText: "e.g. 1000",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _reqUnit,
                      decoration: InputDecoration(
                        labelText: "Unit *",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'kg', child: Text("Kilogram (kg)")),
                        DropdownMenuItem(value: 'quintal', child: Text("Quintal (100 kg)")),
                        DropdownMenuItem(value: 'ton', child: Text("Ton (1000 kg)")),
                      ],
                      onChanged: (val) => setState(() => _reqUnit = val ?? 'kg'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _reqPriceMinCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Min Price (₹/unit)",
                        hintText: "e.g. 18",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _reqPriceMaxCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Max Price (₹/unit)",
                        hintText: "e.g. 25",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _reqDateCtrl,
                      decoration: InputDecoration(
                        labelText: "Required Date",
                        hintText: "YYYY-MM-DD",
                        suffixIcon: const Icon(Icons.calendar_today, size: 16),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _reqLocationCtrl,
                      decoration: InputDecoration(
                        labelText: "Delivery Location",
                        hintText: "e.g. APMC Mandi, Pune",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              ElevatedButton.icon(
                key: const ValueKey('btn_publish_requirement'),
                onPressed: _isSubmittingReq
                    ? null
                    : () async {
                        final crop = _reqCropCtrl.text.trim();
                        final qty = double.tryParse(_reqQtyCtrl.text) ?? 0.0;
                        if (crop.isEmpty || qty <= 0) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Please fill crop name and valid quantity.")),
                          );
                          return;
                        }

                        setState(() => _isSubmittingReq = true);
                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        await b2b.postBulkRequirement(
                          crop: crop,
                          variety: _reqVarietyCtrl.text.trim().isEmpty ? 'Standard' : _reqVarietyCtrl.text.trim(),
                          quantity: qty,
                          unit: _reqUnit,
                          grade: _reqGrade,
                          priceMin: double.tryParse(_reqPriceMinCtrl.text) ?? 15.0,
                          priceMax: double.tryParse(_reqPriceMaxCtrl.text) ?? 25.0,
                          date: _reqDateCtrl.text,
                          location: _reqLocationCtrl.text,
                          token: auth.token,
                        );

                        if (mounted) {
                          setState(() => _isSubmittingReq = false);
                          _reqCropCtrl.clear();
                          _reqVarietyCtrl.clear();
                          _reqQtyCtrl.clear();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Bulk requirement published to regional farmers!"), backgroundColor: Color(0xFF0D9488)),
                          );
                        }
                      },
                icon: _isSubmittingReq
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add_circle_outline, size: 18),
                label: const Text("Publish Requirement"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D9488),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // 2. Active Buying Pools
        const Text("Your Active Buying Pools", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const Text("Track farmer contributions and offers submitted to fulfill your listings.", style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 12),

        if (b2b.requirements.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(child: Text("You have not published any sourcing requirements.", style: TextStyle(color: Colors.grey, fontSize: 12))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: b2b.requirements.length,
            separatorBuilder: (context, index) => const SizedBox(height: 14),
            itemBuilder: (ctx, idx) {
              final req = b2b.requirements[idx];
              return _buildBuyingPoolCard(b2b, req);
            },
          ),
      ],
    );
  }

  Widget _buildBuyingPoolCard(B2BProvider b2b, B2BRequirement req) {
    final progress = req.progressPercent;
    final totalTarget = req.targetQuantity;
    final totalPledged = req.totalPledged;
    final remaining = req.remainingNeeded;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("${req.cropName} (${req.variety})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text("Delivery: ${req.location} • Needed: ${req.requiredDate}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: req.status == 'fulfilled' || remaining == 0
                      ? const Color(0xFFDCFCE7)
                      : req.offers.isNotEmpty
                          ? const Color(0xFFDBEAFE)
                          : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  req.status == 'fulfilled' || remaining == 0
                      ? 'FULLY POOLED'
                      : req.offers.isNotEmpty
                          ? '${req.offers.length} OFFERS'
                          : 'AWAITING OFFERS',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: req.status == 'fulfilled' || remaining == 0
                        ? const Color(0xFF16A34A)
                        : req.offers.isNotEmpty
                            ? const Color(0xFF2563EB)
                            : const Color(0xFFD97706),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Smart Aggregation Pool Status Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.handshake_rounded, size: 14, color: Color(0xFF059669)),
                        SizedBox(width: 6),
                        Text("Order Aggregation Progress", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                    Text("$progress% Pooled", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF059669))),
                  ],
                ),
                const SizedBox(height: 8),

                // Visual Progress Bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress / 100.0,
                    minHeight: 8,
                    backgroundColor: Colors.grey.shade300,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                  ),
                ),

                const SizedBox(height: 10),

                // 3 Metric Pills
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                        child: Column(
                          children: [
                            const Text("Total Target", style: TextStyle(fontSize: 9, color: Colors.grey)),
                            Text("${totalTarget.toInt()} ${req.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                        child: Column(
                          children: [
                            const Text("Pledged / Offered", style: TextStyle(fontSize: 9, color: Color(0xFF065F46))),
                            Text("${totalPledged.toInt()} ${req.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF065F46))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        decoration: BoxDecoration(
                          color: remaining == 0 ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Text("Remaining Needed", style: TextStyle(fontSize: 9, color: remaining == 0 ? const Color(0xFF16A34A) : const Color(0xFF92400E))),
                            Text("${remaining.toInt()} ${req.unit}", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: remaining == 0 ? const Color(0xFF16A34A) : const Color(0xFF92400E))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Farmer Offers & Sourcing Contributions
          Text("Farmer Offers & Contributions (${req.offers.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 8),

          if (req.offers.isEmpty)
            const Text("No offers received from nearby farmers yet.", style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic))
          else
            ...req.offers.map((offer) {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text("🌾 ${offer.farmerUsername}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                                child: Text("${offer.quantity.toInt()} ${req.unit}", style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text("Price: ₹${offer.pricePerUnit}/${req.unit} • Delivery: ${offer.deliveryDate}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          if (offer.notes.isNotEmpty)
                            Text("\"${offer.notes}\"", style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Colors.grey)),
                        ],
                      ),
                    ),
                    if (offer.status == 'pending') ...[
                      ElevatedButton(
                        key: ValueKey('btn_accept_offer_${offer.id}'),
                        onPressed: () async {
                          final res = await b2b.acceptFarmerOffer(offerId: offer.id, requirementId: req.id, token: auth.token);
                          if (res['success'] == true) {
                            final total = offer.quantity * offer.pricePerUnit;
                            _showRazorpaySandboxModal(
                              orderId: offer.id,
                              totalAmount: total,
                              onSuccess: () => _handleTabChange('dashboard'),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text("Accept & Lock", style: TextStyle(fontSize: 10)),
                      ),
                      const SizedBox(width: 4),
                      OutlinedButton(
                        onPressed: () => b2b.rejectFarmerOffer(offerId: offer.id, requirementId: req.id, token: auth.token),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text("Reject", style: TextStyle(fontSize: 10)),
                      ),
                    ] else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: offer.status == 'accepted' ? const Color(0xFFDCFCE7) : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          offer.status == 'accepted' ? '✓ ALLOCATED' : offer.status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: offer.status == 'accepted' ? const Color(0xFF16A34A) : Colors.grey.shade700,
                          ),
                        ),
                      ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // ==========================================
  // MODULE 4: PRE-HARVEST FORWARD CONTRACTS
  // ==========================================
  Widget _buildContractsTab(B2BProvider b2b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Pre-Harvest Contract Marketplace", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const Text("Secure crops before harvest at locked prices to protect against retail market volatility.", style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 16),

        if (b2b.contracts.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(child: Text("No pre-harvest contracts are currently proposed.", style: TextStyle(color: Colors.grey, fontSize: 12))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: b2b.contracts.length,
            separatorBuilder: (context, index) => const SizedBox(height: 14),
            itemBuilder: (ctx, idx) {
              final contract = b2b.contracts[idx];
              final auth = Provider.of<AuthProvider>(context, listen: false);

              return Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top amber stripe
                    Container(
                      height: 4,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF59E0B),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(contract.cropName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  Text("👨‍🌾 Proposed by: ${contract.farmerUsername}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text("Expected Quantity", style: TextStyle(fontSize: 9, color: Colors.grey)),
                                  Text("${contract.expectedQuantity.toInt()} ${contract.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                ],
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          // 2 info chips
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text("Harvest Due Date", style: TextStyle(fontSize: 9, color: Colors.grey)),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          const Icon(Icons.calendar_today_rounded, size: 12, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text(contract.expectedHarvestDate, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text("Contract Price", style: TextStyle(fontSize: 9, color: Colors.grey)),
                                      const SizedBox(height: 2),
                                      Text("₹${contract.contractPrice.toStringAsFixed(2)} / ${contract.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF059669))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 14),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: contract.status == 'accepted' ? const Color(0xFFDCFCE7) : const Color(0xFFDBEAFE),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  contract.status == 'accepted' ? 'RESERVED' : 'AVAILABLE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: contract.status == 'accepted' ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                              if (contract.status == 'proposed')
                                ElevatedButton(
                                  key: ValueKey('btn_reserve_${contract.id}'),
                                  onPressed: () async {
                                    final buyerIntId = int.tryParse(auth.currentUser.id);
                                    final ok = await b2b.reserveContract(contractId: contract.id, buyerId: buyerIntId, token: auth.token);
                                    if (ok && mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text("Pre-harvest contract reserved successfully!"), backgroundColor: Color(0xFF059669)),
                                      );
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF059669),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  child: const Text("Reserve Contract", style: TextStyle(fontSize: 11)),
                                )
                              else
                                const Row(
                                  children: [
                                    Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF059669)),
                                    SizedBox(width: 4),
                                    Text("Reserved by You", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  // ==========================================
  // MODULE 5: RECURRING SUBSCRIPTIONS
  // ==========================================
  Widget _buildSubscriptionsTab(B2BProvider b2b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Setup Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("AUTOMATED PROCUREMENT", style: TextStyle(color: Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              const SizedBox(height: 2),
              const Text("New Produce Subscription", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text("Setup automated recurring deliveries for your business.", style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 14),

              TextField(
                key: const ValueKey('input_sub_crop'),
                controller: _subCropCtrl,
                decoration: InputDecoration(
                  labelText: "Produce Name *",
                  hintText: "e.g. Tomatoes",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('input_sub_qty'),
                      controller: _subQtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Quantity (kg) *",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _subPriceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Est. Price / kg *",
                        prefixText: "₹ ",
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              DropdownButtonFormField<String>(
                initialValue: _subDays,
                decoration: InputDecoration(
                  labelText: "Delivery Schedule *",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: const [
                  DropdownMenuItem(value: 'Daily', child: Text("Daily Deliveries")),
                  DropdownMenuItem(value: 'Monday', child: Text("Every Monday")),
                  DropdownMenuItem(value: 'Tuesday', child: Text("Every Tuesday")),
                  DropdownMenuItem(value: 'Wednesday', child: Text("Every Wednesday")),
                  DropdownMenuItem(value: 'Thursday', child: Text("Every Thursday")),
                  DropdownMenuItem(value: 'Friday', child: Text("Every Friday")),
                  DropdownMenuItem(value: 'Saturday', child: Text("Every Saturday")),
                  DropdownMenuItem(value: 'Sunday', child: Text("Every Sunday")),
                ],
                onChanged: (val) => setState(() => _subDays = val ?? 'Daily'),
              ),
              const SizedBox(height: 14),

              ElevatedButton.icon(
                key: const ValueKey('btn_create_subscription'),
                onPressed: _isSubmittingSub
                    ? null
                    : () async {
                        final crop = _subCropCtrl.text.trim();
                        final qty = double.tryParse(_subQtyCtrl.text) ?? 0.0;
                        final price = double.tryParse(_subPriceCtrl.text) ?? 0.0;
                        if (crop.isEmpty || qty <= 0 || price <= 0) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Please fill all subscription fields.")),
                          );
                          return;
                        }

                        setState(() => _isSubmittingSub = true);
                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        await b2b.createSubscription(
                          crop: crop,
                          quantity: qty,
                          pricePerUnit: price,
                          scheduleDay: _subDays,
                          buyerId: auth.currentUser.id,
                          token: auth.token,
                        );

                        if (mounted) {
                          setState(() => _isSubmittingSub = false);
                          _subCropCtrl.clear();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Recurring Subscription created successfully!"), backgroundColor: Color(0xFF059669)),
                          );
                        }
                      },
                icon: _isSubmittingSub
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.autorenew_rounded, size: 18),
                label: const Text("Create Subscription"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // 2. Active Subscriptions List
        const Text("Active Subscriptions", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),

        if (b2b.subscriptions.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(child: Text("No active recurring subscriptions found.", style: TextStyle(color: Colors.grey, fontSize: 12))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: b2b.subscriptions.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (ctx, idx) {
              final sub = b2b.subscriptions[idx];
              final auth = Provider.of<AuthProvider>(context, listen: false);

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: sub.isActive ? const Color(0xFFA7F3D0) : Colors.grey.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: sub.isActive ? const Color(0xFFDCFCE7) : Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              sub.isActive ? 'ACTIVE' : 'PAUSED',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: sub.isActive ? const Color(0xFF16A34A) : Colors.grey.shade700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text("${sub.quantity.toInt()} ${sub.unit} ${sub.commodityName}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 12, color: Colors.grey),
                              const SizedBox(width: 4),
                              Text(sub.scheduleDays.join(', '), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text("₹${sub.weeklyEstimate.toStringAsFixed(2)} / wk", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        if (sub.discountPct > 0)
                          const Text("10% Volume Discount!", style: TextStyle(fontSize: 9, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          key: ValueKey('btn_toggle_sub_${sub.id}'),
                          onPressed: () => b2b.toggleSubscription(subscriptionId: sub.id, token: auth.token),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: sub.isActive ? Colors.red : const Color(0xFF059669),
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(sub.isActive ? "Pause" : "Resume", style: const TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}
