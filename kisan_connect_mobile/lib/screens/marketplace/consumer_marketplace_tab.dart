import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/marketplace_provider.dart';
import '../../providers/auth_provider.dart';

class ConsumerMarketplaceTab extends StatefulWidget {
  const ConsumerMarketplaceTab({super.key});

  @override
  State<ConsumerMarketplaceTab> createState() => _ConsumerMarketplaceTabState();
}

class _ConsumerMarketplaceTabState extends State<ConsumerMarketplaceTab> {
  String _activeSection = 'dashboard'; // 'dashboard', 'browse', 'orders', 'subscriptions'
  String _orderStatusFilter = 'all';

  final List<Map<String, dynamic>> _sections = [
    {'id': 'dashboard', 'label': 'Dashboard', 'icon': LucideIcons.layoutDashboard},
    {'id': 'browse', 'label': 'Browse Produce', 'icon': LucideIcons.shoppingBag},
    {'id': 'orders', 'label': 'One Time Orders', 'icon': LucideIcons.package},
    {'id': 'subscriptions', 'label': 'Recurring Orders', 'icon': LucideIcons.repeat},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final marketplace = Provider.of<MarketplaceProvider>(context, listen: false);
      marketplace.fetchConsumerDashboardData(auth.token);
    });
  }

  @override
  Widget build(BuildContext context) {
    final marketplace = Provider.of<MarketplaceProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: marketplace.cartCount > 0
          ? FloatingActionButton.extended(
              onPressed: () => _showCartDrawer(context, marketplace),
              backgroundColor: const Color(0xFF059669),
              icon: const Icon(LucideIcons.shoppingBag, color: Colors.white, size: 20),
              label: Text(
                'Basket (${marketplace.cartCount} kg · ₹${marketplace.cartTotalPrice.toStringAsFixed(0)})',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
              ),
            )
          : null,
      body: Column(
        children: [
          _buildHorizontalSubNav(),
          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF059669),
              onRefresh: () async {
                final auth = Provider.of<AuthProvider>(context, listen: false);
                await marketplace.fetchConsumerDashboardData(auth.token);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: _buildActiveSectionView(marketplace),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- SUB NAVIGATION BAR ---
  Widget _buildHorizontalSubNav() {
    return Container(
      height: 54,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _sections.length,
        itemBuilder: (ctx, idx) {
          final item = _sections[idx];
          final isSelected = _activeSection == item['id'];

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _activeSection = item['id']),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      item['icon'] as IconData,
                      size: 15,
                      color: isSelected ? Colors.white : const Color(0xFF475569),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item['label'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActiveSectionView(MarketplaceProvider marketplace) {
    switch (_activeSection) {
      case 'dashboard':
        return _buildDashboardSection(marketplace);
      case 'browse':
        return _buildBrowseSection(marketplace);
      case 'orders':
        return _buildOrdersSection(marketplace);
      case 'subscriptions':
        return _buildSubscriptionsSection(marketplace);
      default:
        return _buildDashboardSection(marketplace);
    }
  }

  // ==========================================
  // SECTION 1: CONSUMER DASHBOARD
  // ==========================================
  Widget _buildDashboardSection(MarketplaceProvider marketplace) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final activeOrder = marketplace.activeOrder;
    final unpaidOrder = marketplace.unpaidOrder;
    final activeSub = marketplace.activeSubscription;

    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Hero Greeting Banner
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF0F766E), Color(0xFF065F46)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF059669).withValues(alpha: 0.25),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.shoppingBag, size: 12, color: Colors.white),
                        SizedBox(width: 5),
                        Text('CONSUMER HUB', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.mapPin, size: 11, color: Color(0xFF34D399)),
                        const SizedBox(width: 4),
                        Text(user.location.isNotEmpty ? user.location : 'Pune, Maharashtra', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '$greeting, ${user.name} 👋',
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: -0.5),
              ),
              const SizedBox(height: 4),
              const Text(
                'Track active fresh produce drops, manage recurring delivery schedules, and view direct farmer savings.',
                style: TextStyle(color: Color(0xFFD1FAE5), fontSize: 12, height: 1.3),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => setState(() => _activeSection = 'browse'),
                      icon: const Icon(LucideIcons.shoppingBag, size: 14, color: Color(0xFF064E3B)),
                      label: const Text('Go to Marketplace', style: TextStyle(color: Color(0xFF064E3B), fontWeight: FontWeight.bold, fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF34D399),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 4 KPI Summary Cards
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                title: 'Active Drop',
                value: activeOrder != null ? activeOrder.id : 'No Drop',
                subtitle: activeOrder != null
                    ? (activeOrder.status == 'in_transit' ? 'Out for delivery' : activeOrder.status.toUpperCase())
                    : 'Browse crops',
                icon: LucideIcons.truck,
                color: const Color(0xFF059669),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                title: 'Payment Status',
                value: unpaidOrder != null ? '₹${unpaidOrder.totalAmount.toStringAsFixed(0)}' : 'All Settled',
                subtitle: unpaidOrder != null ? 'Action: Unpaid' : '100% Paid',
                icon: unpaidOrder != null ? LucideIcons.alertCircle : LucideIcons.shieldCheck,
                color: unpaidOrder != null ? const Color(0xFFE11D48) : const Color(0xFF0284C7),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                title: 'Direct Savings',
                value: '₹${marketplace.calculatedSavings}',
                subtitle: 'vs Retail Markups',
                icon: LucideIcons.banknote,
                color: const Color(0xFFD97706),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                title: 'Scheduled Drops',
                value: '${marketplace.subscriptions.length} Plans',
                subtitle: activeSub != null ? 'Next: ${activeSub.deliveryDay}' : 'No schedule',
                icon: LucideIcons.repeat,
                color: const Color(0xFF7C3AED),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Action Banner: Unpaid Order (if any)
        if (unpaidOrder != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F2),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFFECDD3), width: 1.5),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.alertCircle, color: Color(0xFFE11D48), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Payment Required: ${unpaidOrder.id}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF9F1239))),
                      Text('₹${unpaidOrder.totalAmount.toStringAsFixed(2)} • Complete payment to unlock delivery OTP', style: const TextStyle(fontSize: 11, color: Color(0xFFBE123C))),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => _showPaymentVerificationDialog(context, unpaidOrder, marketplace),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE11D48),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Pay Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Active Order Tracker Card
        if (activeOrder != null) ...[
          _buildActiveOrderTrackerCard(activeOrder, marketplace),
          const SizedBox(height: 16),
        ],

        // Transparency Index & Farm-to-Fork Impact
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF042F2E), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('🌾 Farm-to-Fork Transparency Index', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                    child: const Text('Direct D2C', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _buildImpactBox('Direct Farmer Payout', '88% of Total', const Color(0xFF34D399)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildImpactBox('Middleman Cut', '₹0.00 (0%)', Colors.white),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildImpactBox('Avg Distance', '~14 km', const Color(0xFF6EE7B7)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Fresh Harvest Near You Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Text('🌱', style: TextStyle(fontSize: 18)),
                SizedBox(width: 6),
                Text('Fresh Harvest Near You', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              ],
            ),
            TextButton(
              onPressed: () => setState(() => _activeSection = 'browse'),
              child: const Text('View All >', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.72,
          ),
          itemCount: marketplace.freshNearYou.take(4).length,
          itemBuilder: (ctx, idx) {
            final product = marketplace.freshNearYou[idx];
            return _buildProductCard(product, marketplace);
          },
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildImpactBox(String label, String value, Color valColor) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: valColor, fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildActiveOrderTrackerCard(ConsumerOrder order, MarketplaceProvider marketplace) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.truck, color: Color(0xFF059669), size: 18),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            order.status == 'in_transit' ? '🚚 OUT FOR DELIVERY TODAY' : '📦 ORDER STATUS',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669), letterSpacing: 0.5),
                          ),
                          if (order.isSubscription) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(4)),
                              child: const Text('AUTO-DELIVERY', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        'Order #${order.id} • ${order.items.length} Items',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Expected Delivery', style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                  Text(
                    order.status == 'delivered' ? 'Delivered' : 'Today, 10 AM – 12 PM',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 5-Step Stepper
          _buildMilestoneStepper(order.status),
          const SizedBox(height: 14),

          // Produce Items in drop
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PRODUCE IN THIS DROP', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                const SizedBox(height: 6),
                ...order.items.map((it) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('• ${it.name}', style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155), fontWeight: FontWeight.w600)),
                      Text('${it.quantityKg} kg (₹${it.totalPrice.toStringAsFixed(0)})', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Courier & OTP Telemetry Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(LucideIcons.shieldCheck, size: 15, color: Color(0xFF059669)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Driver: ${order.driverName}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              if (order.deliveryOtp != null && order.paymentStatus == 'paid') ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.key, size: 12, color: Color(0xFFB45309)),
                      const SizedBox(width: 4),
                      Text('OTP: ${order.deliveryOtp}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                    ],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: () => setState(() => _activeSection = 'orders'),
                icon: const Icon(LucideIcons.truck, size: 13),
                label: const Text('Track & View All Deliveries', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF059669),
                  side: const BorderSide(color: Color(0xFF059669)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMilestoneStepper(String status) {
    int activeIdx = 0;
    if (status == 'confirmed') activeIdx = 1;
    if (status == 'packed') activeIdx = 2;
    if (status == 'in_transit') activeIdx = 3;
    if (status == 'delivered') activeIdx = 4;

    final steps = ['Placed', 'Confirmed', 'Packed', 'Transit', 'Delivered'];

    return Row(
      children: List.generate(steps.length, (idx) {
        final isPassed = idx <= activeIdx;
        return Expanded(
          child: Row(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: isPassed ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                  shape: BoxShape.circle,
                ),
                child: isPassed
                    ? const Icon(LucideIcons.check, size: 9, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 3),
              Flexible(
                child: Text(
                  steps[idx],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 8.5,
                    fontWeight: isPassed ? FontWeight.bold : FontWeight.normal,
                    color: isPassed ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                  ),
                ),
              ),
              if (idx < steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    color: idx < activeIdx ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  // ==========================================
  // SECTION 2: BROWSE PRODUCE (MARKETPLACE)
  // ==========================================
  Widget _buildBrowseSection(MarketplaceProvider marketplace) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Search & Location Bar
        TextField(
          onChanged: (val) => marketplace.setSearchQuery(val),
          decoration: InputDecoration(
            hintText: 'Search farm fresh tomatoes, mangoes, onions...',
            prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF059669)),
            suffixIcon: marketplace.searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () => marketplace.setSearchQuery(''),
                  )
                : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
          ),
        ),
        const SizedBox(height: 10),

        // Categories Pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: MarketplaceProvider.categories.map((cat) {
              final isSelected = marketplace.selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  selectedColor: const Color(0xFF059669),
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                  onSelected: (_) => marketplace.setSelectedCategory(cat),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 10),

        // District Filter & Sort Filter Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              DropdownButton<String>(
                value: marketplace.selectedDistrict,
                underline: const SizedBox(),
                icon: const Icon(LucideIcons.mapPin, size: 14, color: Color(0xFF059669)),
                items: MarketplaceProvider.districts.map((d) {
                  return DropdownMenuItem(value: d, child: Text('District: $d', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)));
                }).toList(),
                onChanged: (val) {
                  if (val != null) marketplace.setSelectedDistrict(val);
                },
              ),
              const SizedBox(width: 14),
              DropdownButton<String>(
                value: marketplace.sortBy,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'newest', child: Text('Newest Harvest', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'freshness', child: Text('Freshness Score', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'price-low', child: Text('Price: Low to High', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'price-high', child: Text('Price: High to Low', style: TextStyle(fontSize: 12))),
                ],
                onChanged: (val) {
                  if (val != null) marketplace.setSortBy(val);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Product Catalog Grid
        if (marketplace.filteredProducts.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Center(
              child: Text('No farm produce matching filter criteria.', style: TextStyle(color: Color(0xFF64748B))),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.72,
            ),
            itemCount: marketplace.filteredProducts.length,
            itemBuilder: (ctx, idx) {
              final product = marketplace.filteredProducts[idx];
              return _buildProductCard(product, marketplace);
            },
          ),
      ],
    );
  }

  Widget _buildProductCard(CropProduct product, MarketplaceProvider marketplace) {
    return GestureDetector(
      onTap: () => _showCropDetailsModal(context, product, marketplace),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: Image.network(
                    product.imageUrl,
                    height: 105,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 105,
                      color: const Color(0xFFDCFCE7),
                      child: const Icon(Icons.grass, color: Color(0xFF059669), size: 36),
                    ),
                  ),
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: product.freshnessScore >= 70 ? const Color(0xFF059669) : const Color(0xFFD97706),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${product.freshnessScore.toInt()}% Fresh',
                      style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                if (product.isColdStorage) ...[
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('Cold Stored', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${product.farmerName} • ⭐ ${product.farmerRating}',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('₹${product.pricePerKg.toStringAsFixed(0)}/kg', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                          Text('Mandi: ₹${product.mandiBenchmarkPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
                        ],
                      ),
                      IconButton.filledTonal(
                        icon: const Icon(LucideIcons.shoppingBag, size: 15, color: Color(0xFF059669)),
                        onPressed: () {
                          marketplace.addToCart(product, qty: 5);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('✅ Added 5 kg ${product.title} to Basket!'), duration: const Duration(seconds: 1)),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCropDetailsModal(BuildContext context, CropProduct product, MarketplaceProvider marketplace) {
    int qtyToBuy = 5;
    String orderType = 'onetime';
    String deliveryDay = 'Monday';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final unitPrice = product.pricePerKg;
            final subtotal = unitPrice * qtyToBuy;
            final discounted = orderType == 'subscription' ? subtotal * 0.95 : subtotal;

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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(product.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                        ),
                        IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        product.imageUrl,
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          height: 160,
                          color: const Color(0xFFDCFCE7),
                          child: const Icon(Icons.grass, color: Color(0xFF059669), size: 48),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                          child: Text('Freshness Score: ${product.freshnessScore.toInt()}%', style: const TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.bold, fontSize: 11)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('Harvested: ${product.harvestDate}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11), overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Direct from: ${product.farmerName} (${product.farmerLocation})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                    const SizedBox(height: 4),
                    Text(product.description, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                    const SizedBox(height: 14),

                    // Order Type Toggle: One Time vs Auto-Delivery
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setModalState(() => orderType = 'onetime'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: orderType == 'onetime' ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: orderType == 'onetime' ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)] : null,
                                ),
                                child: const Center(
                                  child: Text('One-Time Purchase', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setModalState(() => orderType = 'subscription'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: orderType == 'subscription' ? const Color(0xFF059669) : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'Auto-Delivery (Save 5%)',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: orderType == 'subscription' ? Colors.white : const Color(0xFF475569)),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (orderType == 'subscription') ...[
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Weekly Delivery Day:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                          DropdownButton<String>(
                            value: deliveryDay,
                            underline: const SizedBox(),
                            items: const [
                              DropdownMenuItem(value: 'Monday', child: Text('Every Monday', style: TextStyle(fontSize: 12))),
                              DropdownMenuItem(value: 'Wednesday', child: Text('Every Wednesday', style: TextStyle(fontSize: 12))),
                              DropdownMenuItem(value: 'Friday', child: Text('Every Friday', style: TextStyle(fontSize: 12))),
                              DropdownMenuItem(value: 'Sunday', child: Text('Every Sunday', style: TextStyle(fontSize: 12))),
                            ],
                            onChanged: (val) {
                              if (val != null) setModalState(() => deliveryDay = val);
                            },
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),

                    // Quantity Stepper
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Quantity to Buy', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            Text('₹${unitPrice.toStringAsFixed(0)} / kg', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton.filledTonal(
                              icon: const Icon(LucideIcons.minus, size: 14),
                              onPressed: () {
                                if (qtyToBuy > 1) setModalState(() => qtyToBuy--);
                              },
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Text('$qtyToBuy kg', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                            ),
                            IconButton.filledTonal(
                              icon: const Icon(LucideIcons.plus, size: 14),
                              onPressed: () => setModalState(() => qtyToBuy++),
                            ),
                          ],
                        ),
                      ],
                    ),
                    // Farmer Rating & Reviews Widget (Parity with ReviewWidget.jsx)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.star, color: Color(0xFFF59E0B), size: 16),
                                  const SizedBox(width: 4),
                                  Text('${product.farmerRating} Rating', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                                ],
                              ),
                              const Text('18 Verified Reviews', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            '"Fresh farm produce delivered in pristine condition. Highly recommended for daily organic needs!"',
                            style: TextStyle(fontSize: 10.5, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    ElevatedButton(
                      onPressed: () {
                        marketplace.addToCart(
                          product,
                          qty: qtyToBuy,
                          orderType: orderType,
                          deliveryDay: deliveryDay,
                        );
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('✅ Added $qtyToBuy kg ${product.title} to Basket!')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        'Add to Basket • ₹${discounted.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                      ),
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

  // ==========================================
  // SECTION 3: ONE-TIME ORDERS & TRACKING
  // ==========================================
  Widget _buildOrdersSection(MarketplaceProvider marketplace) {
    final filtered = marketplace.orders.where((o) {
      if (_orderStatusFilter == 'all') return true;
      return o.status == _orderStatusFilter;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('One Time Orders & Delivery Tracking', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 4),
        const Text('Track real-time direct farmer shipments with OTP verification.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 12),

        // Status Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildOrderStatusChip('all', 'All Orders'),
              const SizedBox(width: 6),
              _buildOrderStatusChip('placed', 'Placed'),
              const SizedBox(width: 6),
              _buildOrderStatusChip('confirmed', 'Confirmed'),
              const SizedBox(width: 6),
              _buildOrderStatusChip('in_transit', 'Out for Delivery'),
              const SizedBox(width: 6),
              _buildOrderStatusChip('delivered', 'Delivered'),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Center(
              child: Text('No orders matching the selected filter.', style: TextStyle(color: Color(0xFF64748B))),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            itemBuilder: (ctx, idx) {
              final order = filtered[idx];
              return _buildOrderCard(order, marketplace);
            },
          ),
      ],
    );
  }

  Widget _buildOrderStatusChip(String id, String label) {
    final isSelected = _orderStatusFilter == id;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color(0xFF059669),
      labelStyle: TextStyle(
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : const Color(0xFF475569),
      ),
      onSelected: (_) => setState(() => _orderStatusFilter = id),
    );
  }

  Widget _buildOrderCard(ConsumerOrder order, MarketplaceProvider marketplace) {
    Color statusColor = const Color(0xFF059669);
    if (order.status == 'placed') statusColor = const Color(0xFFD97706);
    if (order.status == 'confirmed') statusColor = const Color(0xFF0284C7);
    if (order.status == 'in_transit') statusColor = const Color(0xFF7C3AED);
    if (order.status == 'cancelled') statusColor = const Color(0xFFE11D48);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(order.id, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: order.paymentStatus == 'paid' ? const Color(0xFFECFDF5) : const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: order.paymentStatus == 'paid' ? const Color(0xFFA7F3D0) : const Color(0xFFFECDD3)),
                    ),
                    child: Text(
                      order.paymentStatus == 'paid' ? 'Paid ✓' : 'Unpaid !',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: order.paymentStatus == 'paid' ? const Color(0xFF059669) : const Color(0xFFE11D48),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      order.status.toUpperCase(),
                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // 5-Step Stepper
          _buildMilestoneStepper(order.status),
          const SizedBox(height: 10),

          // Items summary
          ...order.items.map((it) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('• ${it.name} (${it.quantityKg} kg)', style: const TextStyle(fontSize: 12, color: Color(0xFF334155))),
                Text('₹${it.totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          )),
          const Divider(height: 16),

          // Detailed Bill Breakdown (parity with ConsumerMarketplace.jsx)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Produce Subtotal', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              Text('₹${(order.totalAmount > 40 ? order.totalAmount - 40 : order.totalAmount).toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ],
          ),
          const SizedBox(height: 2),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('🚚 Direct Farmer Delivery', style: TextStyle(fontSize: 11, color: Color(0xFF059669))),
              Text('+ ₹40.00', style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total ${order.paymentStatus == "paid" ? "Paid" : "Due"}: ₹${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              Text(order.createdDate, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
            ],
          ),
          const SizedBox(height: 8),

          Row(
            children: [
              const Icon(LucideIcons.mapPin, size: 13, color: Color(0xFF64748B)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(order.deliveryAddress, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 6),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Driver: ${order.driverName}', style: const TextStyle(fontSize: 10.5, color: Color(0xFF475569))),
              if (order.deliveryOtp != null && order.paymentStatus == 'paid') ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                  child: Text('OTP: ${order.deliveryOtp}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),

          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (order.paymentStatus == 'pending') ...[
                ElevatedButton.icon(
                  onPressed: () => _showPaymentVerificationDialog(context, order, marketplace),
                  icon: const Icon(LucideIcons.creditCard, size: 13),
                  label: const Text('Pay Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE11D48), foregroundColor: Colors.white),
                ),
                const SizedBox(width: 8),
              ],
              if (order.status == 'placed' || order.status == 'confirmed') ...[
                OutlinedButton(
                  onPressed: () {
                    marketplace.cancelOrder(order.id, null);
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order ${order.id} cancelled')));
                  },
                  style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFE11D48)),
                  child: const Text('Cancel Order', style: TextStyle(fontSize: 11)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 4: RECURRING ORDERS (SUBSCRIPTIONS)
  // ==========================================
  Widget _buildSubscriptionsSection(MarketplaceProvider marketplace) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Recurring Deliveries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            ElevatedButton(
              onPressed: () => _showCustomSubscriptionModal(context, marketplace),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('+ New Schedule', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text('Auto-delivery schedules direct from local farms with 5% subscriber savings.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 14),

        if (marketplace.subscriptions.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Center(
              child: Text('No active subscriptions yet. Set up auto-delivery from marketplace!', style: TextStyle(color: Color(0xFF64748B))),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: marketplace.subscriptions.length,
            itemBuilder: (ctx, idx) {
              final sub = marketplace.subscriptions[idx];
              final isActive = sub.status == 'active';

              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isActive ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.repeat, size: 16, color: Color(0xFF059669)),
                            const SizedBox(width: 6),
                            Text('Every ${sub.deliveryDay}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isActive ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            sub.status.toUpperCase(),
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: isActive ? const Color(0xFF059669) : const Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(sub.planTitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                    Text('Next Drop: ${sub.nextDeliveryDate}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 10),

                    // Progress bar
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: sub.completedDeliveries / (sub.totalDeliveries > 0 ? sub.totalDeliveries : 1),
                            minHeight: 6,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${sub.completedDeliveries} / ${sub.totalDeliveries} Drops Completed', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                            Text('₹${sub.perDeliveryTotal.toStringAsFixed(2)} / drop', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                          ],
                        ),
                      ],
                    ),

                    // Week-Wise Delivery Tracker Grid (Parity with ConsumerMarketplace.jsx)
                    _buildWeekTracker(sub),
                    const Divider(height: 20),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () {
                            if (isActive) {
                              marketplace.pauseSubscription(sub.id, null);
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription paused')));
                            } else {
                              marketplace.resumeSubscription(sub.id, null);
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription resumed')));
                            }
                          },
                          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF059669)),
                          child: Text(isActive ? 'Pause Plan' : 'Resume Plan', style: const TextStyle(fontSize: 11)),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () {
                            marketplace.cancelSubscription(sub.id, null);
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription cancelled')));
                          },
                          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFE11D48)),
                          child: const Text('Cancel', style: TextStyle(fontSize: 11)),
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

  Widget _buildWeekTracker(ConsumerSubscription sub) {
    final total = sub.totalDeliveries > 0 ? sub.totalDeliveries : 8;
    final completed = sub.completedDeliveries;

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('📅 Week-Wise Delivery Tracker', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
              Text('$completed/$total Drops', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(total, (idx) {
                final weekNum = idx + 1;
                final isDelivered = weekNum <= completed;
                final isNext = weekNum == completed + 1 && sub.status == 'active';

                return Container(
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDelivered
                        ? const Color(0xFFECFDF5)
                        : isNext
                            ? const Color(0xFFFEF3C7)
                            : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDelivered
                          ? const Color(0xFFA7F3D0)
                          : isNext
                              ? const Color(0xFFFCD34D)
                              : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    children: [
                      Text('Wk $weekNum', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isDelivered ? const Color(0xFF065F46) : const Color(0xFF64748B))),
                      const SizedBox(height: 2),
                      Icon(
                        isDelivered
                            ? LucideIcons.checkCircle2
                            : isNext
                                ? LucideIcons.truck
                                : LucideIcons.calendar,
                        size: 13,
                        color: isDelivered
                            ? const Color(0xFF059669)
                            : isNext
                                ? const Color(0xFFD97706)
                                : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isDelivered
                            ? 'Done'
                            : isNext
                                ? 'Next'
                                : 'Pending',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          color: isDelivered
                              ? const Color(0xFF059669)
                              : isNext
                                  ? const Color(0xFFB45309)
                                  : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  void _showCustomSubscriptionModal(BuildContext context, MarketplaceProvider marketplace) {
    String selectedCropId = marketplace.products.isNotEmpty ? marketplace.products.first.id : 'p1';
    String selectedFreq = 'Weekly';
    int weeklyKg = 5;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final crop = marketplace.products.firstWhere((p) => p.id == selectedCropId, orElse: () => marketplace.products.first);
            final perDropEst = crop.pricePerKg * weeklyKg * 0.95;

            return Padding(
              padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('➕ Custom Farm Schedule Proposal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Direct contract sourcing: automated local harvest drops with 5% guaranteed price lock.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 14),

                  const Text('Select Produce Commodity', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFCBD5E1)), borderRadius: BorderRadius.circular(12)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedCropId,
                        isExpanded: true,
                        items: marketplace.products.map((p) => DropdownMenuItem(value: p.id, child: Text('${p.title} (₹${p.pricePerKg.toStringAsFixed(0)}/kg)', style: const TextStyle(fontSize: 12)))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedCropId = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Delivery Frequency', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(border: Border.all(color: const Color(0xFFCBD5E1)), borderRadius: BorderRadius.circular(12)),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: selectedFreq,
                                  isExpanded: true,
                                  items: ['Weekly', 'Twice Weekly', 'Daily'].map((f) => DropdownMenuItem(value: f, child: Text(f, style: const TextStyle(fontSize: 12)))).toList(),
                                  onChanged: (val) {
                                    if (val != null) setModalState(() => selectedFreq = val);
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Drop Quantity', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                IconButton.filledTonal(
                                  icon: const Icon(LucideIcons.minus, size: 14),
                                  onPressed: () { if (weeklyKg > 1) setModalState(() => weeklyKg--); },
                                ),
                                Text('$weeklyKg kg', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                IconButton.filledTonal(
                                  icon: const Icon(LucideIcons.plus, size: 14),
                                  onPressed: () { setModalState(() => weeklyKg++); },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFA7F3D0))),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Estimated Per-Drop Total', style: TextStyle(fontSize: 11, color: Color(0xFF065F46))),
                            Text('Includes 5% Direct-Farmer Discount', style: TextStyle(fontSize: 9.5, color: Color(0xFF059669))),
                          ],
                        ),
                        Text('₹${perDropEst.toStringAsFixed(2)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      marketplace.addCustomSubscription(
                        planTitle: '$selectedFreq $weeklyKg kg ${crop.title}',
                        deliveryDay: 'Monday',
                        deliveryTimeSlot: 'morning',
                        perDeliveryTotal: perDropEst,
                        itemsSummary: '$weeklyKg kg ${crop.title}',
                      );
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Custom Subscription proposal activated!')));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Confirm & Activate Recurring Plan', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ==========================================
  // CART DRAWER & CHECKOUT
  // ==========================================
  void _showCartDrawer(BuildContext context, MarketplaceProvider marketplace) {
    final addressCtrl = TextEditingController(text: 'Flat 402, Green Meadows, Shivajinagar, Pune');
    final pincodeCtrl = TextEditingController(text: '411001');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setCartState) {
            final isSub = marketplace.subscriptionConfig.orderType == 'subscription';

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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('🛒 Fresh Basket (${marketplace.cartCount} kg)', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                        IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Order Type Switcher
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setCartState(() => marketplace.setSubscriptionConfig(orderType: 'onetime')),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: !isSub ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: !isSub ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)] : null,
                                ),
                                child: const Center(
                                  child: Text('One-Time Order', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setCartState(() => marketplace.setSubscriptionConfig(orderType: 'subscription')),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSub ? const Color(0xFF059669) : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'Auto-Delivery (Save 5%)',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSub ? Colors.white : const Color(0xFF475569)),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Subscription Schedule options
                    if (isSub) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFA7F3D0))),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('⚡ Auto-Delivery Schedule Config', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Delivery Day:', style: TextStyle(fontSize: 11)),
                                DropdownButton<String>(
                                  value: marketplace.subscriptionConfig.deliveryDay,
                                  underline: const SizedBox(),
                                  items: const [
                                    DropdownMenuItem(value: 'Monday', child: Text('Monday', style: TextStyle(fontSize: 11))),
                                    DropdownMenuItem(value: 'Wednesday', child: Text('Wednesday', style: TextStyle(fontSize: 11))),
                                    DropdownMenuItem(value: 'Friday', child: Text('Friday', style: TextStyle(fontSize: 11))),
                                    DropdownMenuItem(value: 'Sunday', child: Text('Sunday', style: TextStyle(fontSize: 11))),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) setCartState(() => marketplace.setSubscriptionConfig(deliveryDay: val));
                                  },
                                ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Time Slot:', style: TextStyle(fontSize: 11)),
                                DropdownButton<String>(
                                  value: marketplace.subscriptionConfig.deliveryTimeSlot,
                                  underline: const SizedBox(),
                                  items: const [
                                    DropdownMenuItem(value: 'morning', child: Text('Morning (6-9 AM)', style: TextStyle(fontSize: 11))),
                                    DropdownMenuItem(value: 'afternoon', child: Text('Afternoon (12-3 PM)', style: TextStyle(fontSize: 11))),
                                    DropdownMenuItem(value: 'evening', child: Text('Evening (5-8 PM)', style: TextStyle(fontSize: 11))),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) setCartState(() => marketplace.setSubscriptionConfig(deliveryTimeSlot: val));
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Cart Items List
                    ...marketplace.cart.map((it) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              it.product.imageUrl,
                              width: 44,
                              height: 44,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 44,
                                height: 44,
                                color: const Color(0xFFDCFCE7),
                                child: const Icon(Icons.grass, color: Color(0xFF059669), size: 20),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(it.product.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('₹${it.product.pricePerKg.toStringAsFixed(0)} / kg', style: const TextStyle(fontSize: 11, color: Color(0xFF059669))),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(LucideIcons.minus, size: 14),
                                onPressed: () => setCartState(() => marketplace.updateCartQty(it.product.id, it.quantityKg - 1)),
                              ),
                              Text('${it.quantityKg} kg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              IconButton(
                                icon: const Icon(LucideIcons.plus, size: 14),
                                onPressed: () => setCartState(() => marketplace.updateCartQty(it.product.id, it.quantityKg + 1)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )),
                    const Divider(height: 20),

                    // Address Fields
                    TextField(controller: addressCtrl, decoration: const InputDecoration(labelText: 'Delivery Address')),
                    const SizedBox(height: 8),
                    TextField(controller: pincodeCtrl, decoration: const InputDecoration(labelText: 'Pincode')),
                    const SizedBox(height: 14),

                    // Price Breakdown
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Produce Subtotal:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text('₹${marketplace.cartBaseTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    if (isSub) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('5% Auto-Delivery Discount:', style: TextStyle(fontSize: 12, color: Color(0xFF059669))),
                          Text('-₹${marketplace.cartSubscriberDiscount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Delivery Courier Fee:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text('FREE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(isSub ? 'Per-Drop Total:' : 'Total Payable:', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                        Text('₹${marketplace.cartTotalPrice.toStringAsFixed(2)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ],
                    ),
                    const SizedBox(height: 16),

                    ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        final order = await marketplace.placeOrder(
                          address: addressCtrl.text.trim(),
                          pincode: pincodeCtrl.text.trim(),
                          token: auth.token,
                        );
                        if (context.mounted) {
                          _showPaymentVerificationDialog(context, order, marketplace);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Place Order & Pay via UPI / Razorpay', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
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

  // ==========================================
  // PAYMENT VERIFICATION MODAL
  // ==========================================
  void _showPaymentVerificationDialog(BuildContext context, ConsumerOrder order, MarketplaceProvider marketplace) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return FutureBuilder(
          future: Future.delayed(const Duration(milliseconds: 1400)),
          builder: (ctx, snapshot) {
            final isDone = snapshot.connectionState == ConnectionState.done;

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isDone) ...[
                      const SizedBox(
                        width: 52,
                        height: 52,
                        child: CircularProgressIndicator(color: Color(0xFF059669), strokeWidth: 3),
                      ),
                      const SizedBox(height: 18),
                      const Text('Verifying Payment with Bank...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      const SizedBox(height: 6),
                      const Text('Razorpay & Direct UPI Escrow Authorization', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ] else ...[
                      Container(
                        width: 56,
                        height: 56,
                        decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
                        child: const Icon(LucideIcons.checkCircle2, color: Color(0xFF059669), size: 32),
                      ),
                      const SizedBox(height: 16),
                      const Text('Payment Verified Successfully! 🎉', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      const SizedBox(height: 4),
                      Text('Amount Settled: ₹${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                        child: Column(
                          children: [
                            Text('Order ID: ${order.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            const SizedBox(height: 4),
                            Text('🔑 Delivery OTP: ${order.deliveryOtp ?? "4892"}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFB45309), fontSize: 13)),
                            const SizedBox(height: 4),
                            const Text('Provide this OTP to the driver at doorstep.', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          setState(() => _activeSection = 'orders');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(42),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('View Delivery Live Tracking', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
