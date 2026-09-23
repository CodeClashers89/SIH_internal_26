import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/auth_provider.dart';
import '../../providers/farmer_provider.dart';
import '../ai_assistant/farmer_ai_screen.dart';

class FarmerDashboardTab extends StatefulWidget {
  const FarmerDashboardTab({super.key});

  @override
  State<FarmerDashboardTab> createState() => _FarmerDashboardTabState();
}

class _FarmerDashboardTabState extends State<FarmerDashboardTab> {
  String _activeSection = 'overview';
  String _orderChannelFilter = 'all'; // 'all' | 'retail' | 'wholesale'
  String _orderStatusFilter = 'all';
  String _mandiSearchQuery = '';
  String _selectedCommodity = 'all';
  String? _nearestMandiInfo;

  // Navigation Items
  final List<Map<String, dynamic>> _sections = [
    {'id': 'overview', 'label': 'Overview', 'icon': LucideIcons.layoutDashboard},
    {'id': 'inventory', 'label': 'Crop Inventory', 'icon': LucideIcons.package},
    {'id': 'orders', 'label': 'Orders & Route', 'icon': LucideIcons.shoppingBag},
    {'id': 'quotes', 'label': 'Wholesale Bids', 'icon': Icons.handshake},
    {'id': 'sourcing', 'label': 'Bulk Demands', 'icon': LucideIcons.fileCheck},
    {'id': 'contracts', 'label': 'Contracts', 'icon': LucideIcons.calendar},
    {'id': 'markets', 'label': 'Mandi Rates', 'icon': LucideIcons.mapPin},
    {'id': 'profile', 'label': 'Profile & KYC', 'icon': LucideIcons.user},
    {'id': 'notifications', 'label': 'Alerts', 'icon': LucideIcons.bell},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final farmer = Provider.of<FarmerProvider>(context, listen: false);
      farmer.fetchDashboardData(auth.token);
    });
  }

  @override
  Widget build(BuildContext context) {
    final farmer = Provider.of<FarmerProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (ctx) => const FarmerAIScreen()),
          );
        },
        backgroundColor: const Color(0xFF059669),
        icon: const Icon(LucideIcons.sparkles, color: Colors.white, size: 18),
        label: const Text(
          'Kisan AI Assistant',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildHorizontalSubNav(farmer),
          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF16A34A),
              onRefresh: () async {
                final auth = Provider.of<AuthProvider>(context, listen: false);
                await farmer.fetchDashboardData(auth.token);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: _buildActiveSectionView(farmer),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- SUB NAVIGATION BAR ---
  Widget _buildHorizontalSubNav(FarmerProvider farmer) {
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
          final isNotification = item['id'] == 'notifications';

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _activeSection = item['id']),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                    if (isNotification && farmer.unreadNotificationsCount > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : const Color(0xFFE11D48),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${farmer.unreadNotificationsCount}',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? const Color(0xFF059669) : Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActiveSectionView(FarmerProvider farmer) {
    switch (_activeSection) {
      case 'overview':
        return _buildOverviewSection(farmer);
      case 'inventory':
        return _buildInventorySection(farmer);
      case 'orders':
        return _buildOrdersSection(farmer);
      case 'quotes':
        return _buildQuotesSection(farmer);
      case 'sourcing':
        return _buildSourcingSection(farmer);
      case 'contracts':
        return _buildContractsSection(farmer);
      case 'markets':
        return _buildMarketsSection(farmer);
      case 'profile':
        return _buildProfileSection(farmer);
      case 'notifications':
        return _buildNotificationsSection(farmer);
      default:
        return _buildOverviewSection(farmer);
    }
  }

  // ==========================================
  // SECTION 1: OVERVIEW & FORECASTING
  // ==========================================
  Widget _buildOverviewSection(FarmerProvider farmer) {
    final auth = Provider.of<AuthProvider>(context);
    final stats = farmer.stats;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Farmer Greeting Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF065F46), Color(0xFF059669)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF059669).withValues(alpha: 0.25),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.sprout, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Namaste, ${auth.currentUser.name} 🌾',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 12, color: Color(0xFFFEF3C7)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            auth.currentUser.location,
                            style: const TextStyle(fontSize: 12, color: Color(0xFFFEF3C7)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text('KYC OK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Freshness & Spoilage Alert Banner
        if (farmer.showFreshnessAlert) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFFE4E6)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.alertTriangle, size: 16, color: Color(0xFFE11D48)),
                        SizedBox(width: 6),
                        Text(
                          'SPOILAGE RISK DETECTED',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFBE123C)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFFBE123C)),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => farmer.dismissFreshnessAlert(),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Alphonso Mangoes harvest lot #c4 freshness dropped below 40%. Consider applying an immediate 10% discount to clear stock.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF9F1239), height: 1.3),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ElevatedButton(
                      onPressed: () {
                        farmer.updateCropPrice('c4', 162.0);
                        farmer.dismissFreshnessAlert();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('✅ Applied 10% discount to Alphonso Mangoes lot!')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE11D48),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Apply 10% Discount Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: () => farmer.dismissFreshnessAlert(),
                      child: const Text('Dismiss', style: TextStyle(fontSize: 11, color: Color(0xFF9F1239))),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Metric Stats 2x2 Grid
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.5,
          children: [
            _buildStatCard(
              title: 'Monthly Earnings',
              value: '₹${stats.totalEarnings.toStringAsFixed(0)}',
              sub: '+14.2% this month',
              icon: LucideIcons.indianRupee,
              color: const Color(0xFF059669),
            ),
            _buildStatCard(
              title: 'Active Crop Lots',
              value: '${farmer.crops.length} Lots',
              sub: 'Total 5.8 Tons',
              icon: LucideIcons.package,
              color: const Color(0xFF0284C7),
            ),
            _buildStatCard(
              title: 'Pending Bids',
              value: '${farmer.quotes.length} Quotes',
              sub: 'Needs Response',
              icon: Icons.handshake,
              color: const Color(0xFFD97706),
            ),
            _buildStatCard(
              title: 'Mandi Advantage',
              value: '+₹${stats.mandiAdvantage.toStringAsFixed(2)}/kg',
              sub: 'vs APMC Benchmark',
              icon: LucideIcons.trendingUp,
              color: const Color(0xFF7C3AED),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Demand Forecasting Line Chart Card (fl_chart)
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      '📈 4-Week Crop Demand Forecast',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'AI Predictive',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Predicted regional buyer order volumes (Tons) over next 4 weeks',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),

              // fl_chart LineChart
              SizedBox(
                height: 160,
                child: LineChart(
                  LineChartData(
                    gridData: const FlGridData(show: false),
                    titlesData: FlTitlesData(
                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 22,
                          interval: 1,
                          getTitlesWidget: (val, meta) {
                            switch (val.toInt()) {
                              case 0:
                                return const Text('Wk 1', style: TextStyle(fontSize: 10, color: Color(0xFF64748B)));
                              case 1:
                                return const Text('Wk 2', style: TextStyle(fontSize: 10, color: Color(0xFF64748B)));
                              case 2:
                                return const Text('Wk 3', style: TextStyle(fontSize: 10, color: Color(0xFF64748B)));
                              case 3:
                                return const Text('Wk 4', style: TextStyle(fontSize: 10, color: Color(0xFF64748B)));
                              default:
                                return const SizedBox();
                            }
                          },
                        ),
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    lineBarsData: [
                      // Tomato Line (Emerald)
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 3.2),
                          FlSpot(1, 4.8),
                          FlSpot(2, 6.5),
                          FlSpot(3, 8.2),
                        ],
                        isCurved: true,
                        color: const Color(0xFF059669),
                        barWidth: 3,
                        dotData: const FlDotData(show: true),
                      ),
                      // Onion Line (Blue)
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 5.0),
                          FlSpot(1, 5.5),
                          FlSpot(2, 5.1),
                          FlSpot(3, 6.0),
                        ],
                        isCurved: true,
                        color: const Color(0xFF0284C7),
                        barWidth: 2.5,
                        dotData: const FlDotData(show: true),
                      ),
                      // Wheat Line (Amber)
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 2.0),
                          FlSpot(1, 2.8),
                          FlSpot(2, 4.2),
                          FlSpot(3, 5.8),
                        ],
                        isCurved: true,
                        color: const Color(0xFFD97706),
                        barWidth: 2.5,
                        dotData: const FlDotData(show: true),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Legend
              const Center(
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 12,
                  runSpacing: 4,
                  children: [
                    _ChartLegend(color: Color(0xFF059669), label: 'Tomato (+42%)'),
                    _ChartLegend(color: Color(0xFF0284C7), label: 'Onion (Steady)'),
                    _ChartLegend(color: Color(0xFFD97706), label: 'Wheat (High)'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Quick Actions Grid
        const Text(
          'Quick Farmer Tools',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionButton(
                label: 'Add Harvest',
                icon: LucideIcons.plusCircle,
                color: const Color(0xFF059669),
                onTap: () => _showAddCropModal(context),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildQuickActionButton(
                label: 'View Orders',
                icon: LucideIcons.shoppingBag,
                color: const Color(0xFF0284C7),
                onTap: () => setState(() => _activeSection = 'orders'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildQuickActionButton(
                label: 'Mandi Rates',
                icon: LucideIcons.mapPin,
                color: const Color(0xFFD97706),
                onTap: () => setState(() => _activeSection = 'markets'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String sub,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
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
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, size: 20, color: color),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  sub,
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
          ),
          Text(
            title,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 2: CROP INVENTORY
  // ==========================================
  Widget _buildInventorySection(FarmerProvider farmer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('My Crop Listings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                Text('${farmer.crops.length} active lots for retail & wholesale', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
            ElevatedButton.icon(
              onPressed: () => _showAddCropModal(context),
              icon: const Icon(LucideIcons.plus, size: 14),
              label: const Text('Add Produce', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.crops.length,
          itemBuilder: (ctx, idx) {
            final crop = farmer.crops[idx];
            final isFresh = crop.freshnessScore >= 70;
            final isLowFreshness = crop.freshnessScore <= 40;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      crop.imageUrl,
                      width: 76,
                      height: 76,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => Container(
                        width: 76,
                        height: 76,
                        color: const Color(0xFFDCFCE7),
                        child: const Icon(LucideIcons.sprout, color: Color(0xFF059669)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          crop.title,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₹${crop.pricePerKg.toStringAsFixed(2)} / kg  •  ${crop.availableQuantityKg.toInt()} kg left',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isLowFreshness
                                    ? const Color(0xFFFFF1F2)
                                    : isFresh
                                        ? const Color(0xFFECFDF5)
                                        : const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Freshness: ${crop.freshnessScore.toInt()}%',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isLowFreshness
                                      ? const Color(0xFFE11D48)
                                      : isFresh
                                          ? const Color(0xFF059669)
                                          : const Color(0xFFD97706),
                                ),
                              ),
                            ),
                            if (crop.isColdStorage)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text('Cold Storage', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                              ),
                            Text(crop.harvestDate, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.pencil, size: 16, color: Color(0xFF059669)),
                    tooltip: 'Edit Produce',
                    onPressed: () => _showAddCropModal(context, cropToEdit: crop),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.trash2, size: 16, color: Color(0xFF94A3B8)),
                    tooltip: 'Delete Produce',
                    onPressed: () {
                      farmer.deleteCrop(crop.id, null);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Removed ${crop.title} from inventory')),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  void _showAddCropModal(BuildContext context, {FarmerCrop? cropToEdit}) {
    final titleCtrl = TextEditingController(text: cropToEdit?.title ?? '');
    final priceCtrl = TextEditingController(text: cropToEdit != null ? cropToEdit.pricePerKg.toStringAsFixed(0) : '34');
    final qtyCtrl = TextEditingController(text: cropToEdit != null ? cropToEdit.availableQuantityKg.toStringAsFixed(0) : '800');
    final harvestCtrl = TextEditingController(text: cropToEdit?.harvestDate ?? 'Harvested Today');
    final landCtrl = TextEditingController(text: cropToEdit?.sourceLand ?? 'Plot A (Drip Irrigated)');
    String category = cropToEdit?.category ?? 'Vegetables';
    bool coldStorage = cropToEdit?.isColdStorage ?? false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
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
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          cropToEdit != null ? '✏️ Edit Crop Listing' : '🌾 List New Harvest Produce',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(labelText: 'Crop Name (e.g. Organic Shimla Mirch)'),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: const [
                        DropdownMenuItem(value: 'Vegetables', child: Text('Vegetables')),
                        DropdownMenuItem(value: 'Fruits', child: Text('Fruits')),
                        DropdownMenuItem(value: 'Grains', child: Text('Grains & Cereals')),
                        DropdownMenuItem(value: 'Pulses', child: Text('Pulses & Lentils')),
                        DropdownMenuItem(value: 'Spices', child: Text('Spices & Herbs')),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => category = val);
                      },
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: priceCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Price / kg (₹)'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: qtyCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Available Qty (kg)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: harvestCtrl,
                      decoration: const InputDecoration(labelText: 'Harvest Date / Age'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: landCtrl,
                      decoration: const InputDecoration(labelText: 'Source Land / Farm Plot'),
                    ),
                    const SizedBox(height: 10),
                    SwitchListTile(
                      title: const Text('Cold Storage Stored', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Pauses freshness degradation while stored', style: TextStyle(fontSize: 11)),
                      value: coldStorage,
                      onChanged: (val) => setModalState(() => coldStorage = val),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        if (titleCtrl.text.isNotEmpty) {
                          final farmer = Provider.of<FarmerProvider>(context, listen: false);
                          final auth = Provider.of<AuthProvider>(context, listen: false);

                          if (cropToEdit != null) {
                            final updated = cropToEdit.copyWith(
                              title: titleCtrl.text.trim(),
                              category: category,
                              pricePerKg: double.tryParse(priceCtrl.text) ?? cropToEdit.pricePerKg,
                              availableQuantityKg: double.tryParse(qtyCtrl.text) ?? cropToEdit.availableQuantityKg,
                              harvestDate: harvestCtrl.text.trim(),
                              isColdStorage: coldStorage,
                              sourceLand: landCtrl.text.trim(),
                            );
                            farmer.editCrop(updated, auth.token);
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('✅ Updated ${updated.title}')),
                            );
                          } else {
                            final newCrop = FarmerCrop(
                              id: 'c_${DateTime.now().millisecondsSinceEpoch}',
                              title: titleCtrl.text.trim(),
                              category: category,
                              pricePerKg: double.tryParse(priceCtrl.text) ?? 30.0,
                              availableQuantityKg: double.tryParse(qtyCtrl.text) ?? 500.0,
                              mandiBenchmarkPrice: (double.tryParse(priceCtrl.text) ?? 30.0) * 0.9,
                              freshnessScore: 98.0,
                              harvestDate: harvestCtrl.text.trim(),
                              isColdStorage: coldStorage,
                              imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
                              sourceLand: landCtrl.text.trim(),
                            );

                            farmer.addCrop(newCrop, auth.token);
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('✅ New harvest listing published!')),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        cropToEdit != null ? 'Save Produce Changes' : 'Publish Harvest to Marketplace',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
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
  // SECTION 3: ORDERS & ROUTE DISPATCH
  // ==========================================
  Widget _buildOrdersSection(FarmerProvider farmer) {
    final filtered = farmer.orders.where((o) {
      if (_orderChannelFilter == 'retail' && o.channel != 'retail') return false;
      if (_orderChannelFilter == 'wholesale' && o.channel != 'wholesale') return false;
      if (_orderStatusFilter != 'all' && o.status != _orderStatusFilter) return false;
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Orders & Dispatch Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 12),

        // Channel Tabs
        Row(
          children: [
            _buildChannelTab('all', 'All Channels', farmer.orders.length),
            const SizedBox(width: 8),
            _buildChannelTab('retail', '🛒 Retail', farmer.orders.where((o) => o.channel == 'retail').length),
            const SizedBox(width: 8),
            _buildChannelTab('wholesale', '🏢 Wholesale', farmer.orders.where((o) => o.channel == 'wholesale').length),
          ],
        ),
        const SizedBox(height: 10),

        // Status Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildStatusFilterChip('all', 'All Statuses'),
              const SizedBox(width: 6),
              _buildStatusFilterChip('pending', 'Pending'),
              const SizedBox(width: 6),
              _buildStatusFilterChip('confirmed', 'Confirmed'),
              const SizedBox(width: 6),
              _buildStatusFilterChip('dispatched', 'Dispatched'),
              const SizedBox(width: 6),
              _buildStatusFilterChip('delivered', 'Delivered'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        if (filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text('No orders matching selected filter', style: TextStyle(color: Color(0xFF64748B))),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            itemBuilder: (ctx, idx) {
              final order = filtered[idx];
              return _buildOrderCard(order, farmer);
            },
          ),
      ],
    );
  }

  Widget _buildStatusFilterChip(String status, String label) {
    final isSelected = _orderStatusFilter == status;
    return InkWell(
      onTap: () => setState(() => _orderStatusFilter = status),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? const Color(0xFF059669) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildChannelTab(String id, String label, int count) {
    final isSelected = _orderChannelFilter == id;
    return InkWell(
      onTap: () => setState(() => _orderChannelFilter = id),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFCBD5E1)),
        ),
        child: Text(
          '$label ($count)',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildOrderCard(FarmerOrder order, FarmerProvider farmer) {
    Color statusColor;
    switch (order.status) {
      case 'confirmed':
        statusColor = const Color(0xFF0284C7);
        break;
      case 'dispatched':
        statusColor = const Color(0xFFD97706);
        break;
      case 'delivered':
        statusColor = const Color(0xFF059669);
        break;
      default:
        statusColor = const Color(0xFF64748B);
    }

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
              Text(order.id, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: order.paymentStatus == 'paid' ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: order.paymentStatus == 'paid' ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      order.paymentStatus == 'paid' ? '✅ Paid · Escrow' : '⏳ Unpaid',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: order.paymentStatus == 'paid' ? const Color(0xFF047857) : const Color(0xFFB45309),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      order.status.toUpperCase(),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(order.buyerName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          Text('📍 ${order.deliveryAddress}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${order.productTitle} (${order.quantityKg.toInt()} kg)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                Text('₹${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Stepper Indicator
          _buildDispatchStepper(order.status),
          const SizedBox(height: 10),

          // Assigned Driver Info
          Row(
            children: [
              const Icon(LucideIcons.truck, size: 14, color: Color(0xFF059669)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Driver: ${order.driverName} (${order.driverPhone})',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Action Buttons
          Row(
            children: [
              if (order.status == 'pending' || order.status == 'placed') ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      farmer.updateOrderStatus(order.id, 'confirmed', null);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('✅ Confirmed order ${order.id}')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Confirm Order', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 6),
                OutlinedButton(
                  onPressed: () {
                    farmer.updateOrderStatus(order.id, 'cancelled', null);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Order ${order.id} cancelled')),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFE11D48),
                    side: const BorderSide(color: Color(0xFFFDA4AF)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Cancel', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 6),
              ],
              if (order.status == 'confirmed') ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      farmer.updateOrderStatus(order.id, 'packed', null);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('📦 Marked order ${order.id} as packed')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Mark Packed', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 6),
                OutlinedButton(
                  onPressed: () {
                    farmer.updateOrderStatus(order.id, 'cancelled', null);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFE11D48),
                    side: const BorderSide(color: Color(0xFFFDA4AF)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Cancel', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 6),
              ],
              if (order.status == 'packed') ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      farmer.updateOrderStatus(order.id, 'dispatched', null);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('🚚 Dispatched lot for order ${order.id}')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Dispatch Lot', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              if (order.status == 'dispatched' || order.status == 'in_transit') ...[
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3E8FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE9D5FF)),
                    ),
                    child: const Center(
                      child: Text('🚚 In Transit — Driver Handled', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF7E22CE))),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              if (order.status == 'delivered') ...[
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Center(
                      child: Text('✅ Delivered via OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              OutlinedButton.icon(
                onPressed: () {
                  _showRouteTrackingModal(context, order);
                },
                icon: const Icon(Icons.alt_route, size: 14),
                label: const Text('Route Map', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF059669),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDispatchStepper(String status) {
    if (status == 'cancelled') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F2),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFFFE4E6)),
        ),
        child: const Row(
          children: [
            Icon(LucideIcons.alertCircle, size: 14, color: Color(0xFFE11D48)),
            SizedBox(width: 6),
            Text('This order has been cancelled', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFBE123C))),
          ],
        ),
      );
    }

    int activeStep = 0;
    if (status == 'confirmed') activeStep = 1;
    if (status == 'packed') activeStep = 2;
    if (status == 'dispatched' || status == 'in_transit') activeStep = 3;
    if (status == 'delivered') activeStep = 4;

    final steps = ['Placed', 'Confirmed', 'Packed', 'In Transit', 'Delivered'];

    return Row(
      children: List.generate(steps.length, (idx) {
        final isPassed = idx <= activeStep;
        return Expanded(
          child: Row(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: isPassed ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                  shape: BoxShape.circle,
                ),
                child: isPassed
                    ? const Icon(LucideIcons.check, size: 9, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 3),
              Text(
                steps[idx],
                style: TextStyle(
                  fontSize: 8.5,
                  fontWeight: isPassed ? FontWeight.bold : FontWeight.normal,
                  color: isPassed ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                ),
              ),
              if (idx < steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    color: idx < activeStep ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  void _showRouteTrackingModal(BuildContext context, FarmerOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('🚚 Delivery Route: ${order.id}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(LucideIcons.navigation, size: 18, color: Color(0xFF059669)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Origin: Nashik Farm Hub (20.0059, 73.7898) → Destination: Pune Central Hub\nDistance: 38.4 km • Est. Transit: 52 mins',
                      style: TextStyle(fontSize: 11, color: Color(0xFF065F46), height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.map, size: 48, color: Color(0xFF059669)),
                      SizedBox(height: 8),
                      Text('Live Route GPS Tracking Active', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      Text('Assigned Transport: Suresh Logistics Driver GJT-88', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 4: WHOLESALE BIDS (QUOTES)
  // ==========================================
  Widget _buildQuotesSection(FarmerProvider farmer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Wholesale Bids & Negotiations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 4),
        const Text('Direct wholesale buy quotes received from bulk buyers & processors.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 16),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.quotes.length,
          itemBuilder: (ctx, idx) {
            final quote = farmer.quotes[idx];
            final counterController = TextEditingController(text: (quote.offeredPricePerKg + 1.5).toStringAsFixed(2));

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
                      Text(quote.buyerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: quote.status == 'accepted'
                              ? const Color(0xFFECFDF5)
                              : quote.status == 'countered'
                                  ? const Color(0xFFEFF6FF)
                                  : const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          quote.status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: quote.status == 'accepted'
                                ? const Color(0xFF059669)
                                : quote.status == 'countered'
                                    ? const Color(0xFF0284C7)
                                    : const Color(0xFFD97706),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Crop: ${quote.cropName} • Volume: ${quote.requestedQuantityKg.toInt()} kg', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('OFFERED PRICE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                              Text('₹${quote.offeredPricePerKg.toStringAsFixed(2)} / kg', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('YOUR LISTED PRICE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                              Text('₹${quote.marketPricePerKg.toStringAsFixed(2)} / kg', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (quote.status == 'pending') ...[
                    Row(
                      children: [
                        SizedBox(
                          width: 100,
                          child: TextField(
                            controller: counterController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Counter (₹)',
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              final price = double.tryParse(counterController.text) ?? quote.offeredPricePerKg;
                              farmer.counterQuote(quote.id, price, null);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('✅ Sent counter-offer of ₹$price/kg')),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0284C7),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Counter Offer', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () {
                            farmer.acceptQuote(quote.id, null);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('✅ Accepted wholesale bid!')),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text('Accept', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  // ==========================================
  // SECTION 5: BULK DEMANDS (REVERSE SOURCING)
  // ==========================================
  Widget _buildSourcingSection(FarmerProvider farmer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Bulk Procurement Demands', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 4),
        const Text('Reverse Sourcing: Wholesale buyers actively looking for crop volume.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 16),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.bulkDemands.length,
          itemBuilder: (ctx, idx) {
            final demand = farmer.bulkDemands[idx];
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
                      Text(demand.buyerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('Target: ₹${demand.targetPricePerKg.toStringAsFixed(2)}/kg', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Needed: ${demand.cropName} • Volume: ${demand.targetQuantityKg.toInt()} kg', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                  const SizedBox(height: 4),
                  Text('📍 Delivery Hub: ${demand.deliveryLocation}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  Text('📅 Deadline: ${demand.deadline}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  if (demand.notes.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text('Specs: ${demand.notes}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF475569))),
                  ],
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => _showSubmitOfferModal(context, demand),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      minimumSize: const Size.fromHeight(40),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Submit My Supply Offer', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            );
          },
        ),

        const SizedBox(height: 16),
        const Text('My Submitted Offers', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 8),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.myOffers.length,
          itemBuilder: (ctx, idx) {
            final offer = farmer.myOffers[idx];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(offer.cropName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      Text('${offer.proposedQtyKg.toInt()} kg @ ₹${offer.proposedPricePerKg.toStringAsFixed(2)}/kg', style: const TextStyle(fontSize: 12, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(offer.status.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  void _showSubmitOfferModal(BuildContext context, BulkDemand demand) {
    final qtyCtrl = TextEditingController(text: (demand.targetQuantityKg / 2).toStringAsFixed(0));
    final priceCtrl = TextEditingController(text: demand.targetPricePerKg.toStringAsFixed(2));
    final dateCtrl = TextEditingController(text: demand.deadline);
    final notesCtrl = TextEditingController(text: 'Grade A sorting, moisture < 8%, direct farm origin.');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(top: 20, left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Propose Supply Offer for ${demand.cropName}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Offered Volume (kg)')),
            const SizedBox(height: 10),
            TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Proposed Price / kg (₹)')),
            const SizedBox(height: 10),
            TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Delivery Date')),
            const SizedBox(height: 10),
            TextField(controller: notesCtrl, decoration: const InputDecoration(labelText: 'Quality Notes / Specs for Wholesaler')),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                final farmer = Provider.of<FarmerProvider>(context, listen: false);
                farmer.submitOffer(
                  demandId: demand.id,
                  cropName: demand.cropName,
                  proposedQty: double.tryParse(qtyCtrl.text) ?? 1000.0,
                  proposedPrice: double.tryParse(priceCtrl.text) ?? 30.0,
                  deliveryDate: dateCtrl.text,
                );
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✅ Supply offer sent to bulk buyer!')),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), padding: const EdgeInsets.symmetric(vertical: 14)),
              child: const Text('Send Formal Offer', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 6: PRE-HARVEST CONTRACTS
  // ==========================================
  Widget _buildContractsSection(FarmerProvider farmer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Pre-Harvest Contracts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            ElevatedButton(
              onPressed: () => _showProposeContractModal(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Propose Contract', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text('Guaranteed buyback agreements with locked MSP & escrow advance.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 16),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.contracts.length,
          itemBuilder: (ctx, idx) {
            final contract = farmer.contracts[idx];
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
                      Text(contract.cropName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(contract.status.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Buyer: ${contract.buyerName}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Guaranteed Rate: ₹${contract.guaranteedPricePerKg.toStringAsFixed(2)} / kg',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                        ),
                      ),
                      Text('Volume: ${contract.quantityKg.toInt()} kg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF0284C7)),
                        const SizedBox(width: 6),
                        Text(contract.advancePaymentStatus, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF))),
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

  void _showProposeContractModal(BuildContext context) {
    final cropCtrl = TextEditingController(text: 'Mustard / Sarson');
    final qtyCtrl = TextEditingController(text: '3000');
    final priceCtrl = TextEditingController(text: '56');
    final dateCtrl = TextEditingController(text: 'Nov 30, 2026');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(top: 20, left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Propose New Pre-Harvest Contract', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(controller: cropCtrl, decoration: const InputDecoration(labelText: 'Crop Lot')),
            const SizedBox(height: 10),
            TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Estimated Quantity (kg)')),
            const SizedBox(height: 10),
            TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Guaranteed Minimum Rate (₹/kg)')),
            const SizedBox(height: 10),
            TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Target Harvest Date')),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                final farmer = Provider.of<FarmerProvider>(context, listen: false);
                farmer.proposeContract(
                  cropName: cropCtrl.text,
                  quantity: double.tryParse(qtyCtrl.text) ?? 2000.0,
                  guaranteedPrice: double.tryParse(priceCtrl.text) ?? 50.0,
                  harvestDate: dateCtrl.text,
                );
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✅ Contract proposal published!')),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), padding: const EdgeInsets.symmetric(vertical: 14)),
              child: const Text('Post Contract Proposal', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 7: MANDI RATES & EXPLORER
  // ==========================================
  Widget _buildMarketsSection(FarmerProvider farmer) {
    final filteredMarkets = farmer.mandiPrices.where((m) {
      if (_selectedCommodity != 'all') {
        final crop = m.cropName.toLowerCase();
        final sel = _selectedCommodity.toLowerCase();
        if (!crop.contains(sel)) return false;
      }
      if (_mandiSearchQuery.isEmpty) return true;
      final q = _mandiSearchQuery.toLowerCase();
      return m.cropName.toLowerCase().contains(q) ||
          m.mandiName.toLowerCase().contains(q) ||
          m.district.toLowerCase().contains(q);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('APMC Mandi Rates & Nearest Explorer', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 4),
        const Text('Live arrival rates from nearby agricultural market committees with distance.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        const SizedBox(height: 12),

        // GPS Nearest Mandi Finder Banner (matches NearestMandiExplorer.jsx)
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.mapPin, color: Color(0xFF059669), size: 16),
                      SizedBox(width: 6),
                      Text('Nearest APMC Mandi Finder', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _nearestMandiInfo = '📍 Closest: Pune APMC (Gultekdi) · 14.5 km away';
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('📍 Nearest Mandi: Pune APMC (14.5 km, ~28 mins away)')),
                      );
                    },
                    icon: const Icon(Icons.my_location, size: 12),
                    label: const Text('Find Nearest (GPS)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
              if (_nearestMandiInfo != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF6EE7B7)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.checkCircle2, color: Color(0xFF059669), size: 15),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _nearestMandiInfo!,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Search Bar
        TextField(
          decoration: InputDecoration(
            hintText: 'Search mandi rate by crop (e.g. Tomato, Onion, Wheat)',
            prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF059669)),
            suffixIcon: _mandiSearchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () => setState(() => _mandiSearchQuery = ''),
                  )
                : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
          ),
          onChanged: (val) => setState(() => _mandiSearchQuery = val),
        ),
        const SizedBox(height: 10),

        // Commodity Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildCommodityChip('all', 'All Commodities'),
              const SizedBox(width: 6),
              _buildCommodityChip('tomato', '🍅 Tomatoes'),
              const SizedBox(width: 6),
              _buildCommodityChip('onion', '🧅 Red Onions'),
              const SizedBox(width: 6),
              _buildCommodityChip('wheat', '🌾 Sharbati Wheat'),
              const SizedBox(width: 6),
              _buildCommodityChip('mango', '🥭 Alphonso Mangoes'),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (filteredMarkets.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Center(
              child: Text('No APMC mandi matching search criteria', style: TextStyle(color: Color(0xFF64748B))),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filteredMarkets.length,
            itemBuilder: (ctx, idx) {
              final mandi = filteredMarkets[idx];
              final isUp = mandi.priceTrend == 'up';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(mandi.mandiName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6)),
                              child: Text('${mandi.distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('Commodity: ${mandi.cropName}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text('Min: ₹${mandi.minPrice.toStringAsFixed(0)} • Max: ₹${mandi.maxPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('₹${mandi.modalPrice.toStringAsFixed(2)} / kg', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                        Row(
                          children: [
                            Icon(isUp ? LucideIcons.trendingUp : LucideIcons.trendingDown, size: 12, color: isUp ? const Color(0xFF059669) : const Color(0xFFE11D48)),
                            const SizedBox(width: 4),
                            Text(mandi.date, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          ],
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

  Widget _buildCommodityChip(String id, String label) {
    final isSelected = _selectedCommodity == id;
    return InkWell(
      onTap: () => setState(() => _selectedCommodity = id),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 8: FARM PROFILE & KYC
  // ==========================================
  Widget _buildProfileSection(FarmerProvider farmer) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Farmer Farm Profile & KYC', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            OutlinedButton.icon(
              onPressed: () => _showEditProfileModal(context, farmer),
              icon: const Icon(LucideIcons.pencil, size: 13),
              label: const Text('Edit Profile', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF059669),
                side: const BorderSide(color: Color(0xFF059669)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Farm Identity Card
        Container(
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
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: const Color(0xFFDCFCE7),
                    child: const Icon(LucideIcons.user, color: Color(0xFF059669), size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                        Text(user.phone, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              _buildProfileRow('Farm Name', farmer.profile.farmName),
              _buildProfileRow('Farm Location', user.location),
              _buildProfileRow('Total Holding', '${farmer.profile.totalAcres.toStringAsFixed(1)} Acres (${farmer.profile.irrigationMethod})'),
              _buildProfileRow('Primary Crops', farmer.profile.primaryCrops),
              _buildProfileRow('GPS Coordinates', farmer.profile.gpsCoordinates),
              _buildProfileRow('Soil Type', farmer.profile.soilType),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Bank Settlement Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Direct Bank Settlement & Escrow', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                  Icon(LucideIcons.banknote, color: Color(0xFF059669), size: 18),
                ],
              ),
              const SizedBox(height: 12),
              _buildProfileRow('Bank Account', farmer.profile.bankAccountNumber),
              _buildProfileRow('IFSC Code', farmer.profile.bankIfsc),
              _buildProfileRow('UPI VPA', farmer.profile.upiId),
              _buildProfileRow('Trust Score', '${farmer.stats.trustScore}% (Verified FPO Producer)'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // KYC Verification Status
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFD1FAE5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.shieldCheck, color: Color(0xFF059669), size: 20),
                      SizedBox(width: 8),
                      Text('KYC Verification Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                    ],
                  ),
                  Text('VERIFIED ✓', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Government KCC, 7-12 Extract, and landholding documents verified by platform administrators. Full access to wholesale tenders enabled.',
                style: TextStyle(fontSize: 11, color: Color(0xFF047857), height: 1.3),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _showKycUploadModal(context, farmer),
                icon: const Icon(LucideIcons.upload, size: 14),
                label: const Text('Update / Renew KYC Documents', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF059669),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showEditProfileModal(BuildContext context, FarmerProvider farmer) {
    final nameCtrl = TextEditingController(text: farmer.profile.farmName);
    final acresCtrl = TextEditingController(text: farmer.profile.totalAcres.toStringAsFixed(1));
    final cropsCtrl = TextEditingController(text: farmer.profile.primaryCrops);
    final irrigationCtrl = TextEditingController(text: farmer.profile.irrigationMethod);
    final soilCtrl = TextEditingController(text: farmer.profile.soilType);
    final bankCtrl = TextEditingController(text: farmer.profile.bankAccountNumber);
    final ifscCtrl = TextEditingController(text: farmer.profile.bankIfsc);
    final upiCtrl = TextEditingController(text: farmer.profile.upiId);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          top: 20,
          left: 20,
          right: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('✏️ Edit Farm Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Farm / Estate Name')),
              const SizedBox(height: 10),
              TextField(controller: acresCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Holding (Acres)')),
              const SizedBox(height: 10),
              TextField(controller: irrigationCtrl, decoration: const InputDecoration(labelText: 'Irrigation Methods (e.g. Drip & Borewell)')),
              const SizedBox(height: 10),
              TextField(controller: soilCtrl, decoration: const InputDecoration(labelText: 'Soil Type (e.g. Black Loamy Soil)')),
              const SizedBox(height: 10),
              TextField(controller: cropsCtrl, decoration: const InputDecoration(labelText: 'Primary Crops Grown')),
              const SizedBox(height: 10),
              TextField(controller: bankCtrl, decoration: const InputDecoration(labelText: 'Settlement Bank Account')),
              const SizedBox(height: 10),
              TextField(controller: ifscCtrl, decoration: const InputDecoration(labelText: 'Bank IFSC Code')),
              const SizedBox(height: 10),
              TextField(controller: upiCtrl, decoration: const InputDecoration(labelText: 'Instant UPI ID')),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  farmer.updateFarmProfile(
                    farmName: nameCtrl.text.trim(),
                    totalAcres: double.tryParse(acresCtrl.text) ?? farmer.profile.totalAcres,
                    irrigationMethod: irrigationCtrl.text.trim(),
                    soilType: soilCtrl.text.trim(),
                    primaryCrops: cropsCtrl.text.trim(),
                    bankAccount: bankCtrl.text.trim(),
                    ifsc: ifscCtrl.text.trim(),
                    upi: upiCtrl.text.trim(),
                  );
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✅ Farm profile updated successfully!')),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Save Profile Changes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showKycUploadModal(BuildContext context, FarmerProvider farmer) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    String selectedDoc = '7-12 Land Registry Extract';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('📜 Upload KYC Verification Document', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Select verification document type to upload for administrative clearance:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: selectedDoc,
                decoration: const InputDecoration(labelText: 'Document Type'),
                items: const [
                  DropdownMenuItem(value: '7-12 Land Registry Extract', child: Text('7-12 Land Registry Extract')),
                  DropdownMenuItem(value: 'Aadhaar Card / Farmer ID', child: Text('Aadhaar Card / Farmer ID')),
                  DropdownMenuItem(value: 'FPO Membership Certificate', child: Text('FPO Membership Certificate')),
                  DropdownMenuItem(value: 'Soil Health Card', child: Text('Soil Health Card')),
                ],
                onChanged: (val) {
                  if (val != null) setModalState(() => selectedDoc = val);
                },
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                ),
                child: const Column(
                  children: [
                    Icon(LucideIcons.fileCheck, size: 36, color: Color(0xFF059669)),
                    SizedBox(height: 6),
                    Text('Ready to attach: Document_Scanned_Verified.pdf', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    Text('Supported: PDF, JPG, PNG (Max 10 MB)', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  farmer.submitKyc(selectedDoc, auth.token);
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('✅ $selectedDoc submitted to verification queue!')),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Submit Document to Queue', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 9: NOTIFICATIONS
  // ==========================================
  Widget _buildNotificationsSection(FarmerProvider farmer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Notifications & Alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            TextButton(
              onPressed: () => farmer.markAllNotificationsAsRead(),
              child: const Text('Mark all read', style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 10),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: farmer.notifications.length,
          itemBuilder: (ctx, idx) {
            final item = farmer.notifications[idx];
            IconData icon;
            Color iconColor;

            switch (item.type) {
              case 'offer':
                icon = Icons.handshake;
                iconColor = const Color(0xFF059669);
                break;
              case 'dispatch':
                icon = LucideIcons.truck;
                iconColor = const Color(0xFF0284C7);
                break;
              case 'contract':
                icon = LucideIcons.calendar;
                iconColor = const Color(0xFF7C3AED);
                break;
              default:
                icon = LucideIcons.cloudRain;
                iconColor = const Color(0xFFD97706);
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: item.isRead ? Colors.white : const Color(0xFFECFDF5).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: item.isRead ? const Color(0xFFE2E8F0) : const Color(0xFFA7F3D0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: iconColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 18, color: iconColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(item.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                            Text(item.time, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(item.message, style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.3)),
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
}

class _ChartLegend extends StatelessWidget {
  final Color color;
  final String label;

  const _ChartLegend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
      ],
    );
  }
}
