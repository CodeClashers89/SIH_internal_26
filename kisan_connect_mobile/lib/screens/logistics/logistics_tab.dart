import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../providers/logistics_provider.dart';
import '../../providers/auth_provider.dart';

class LogisticsTab extends StatefulWidget {
  const LogisticsTab({super.key});

  @override
  State<LogisticsTab> createState() => _LogisticsTabState();
}

class _LogisticsTabState extends State<LogisticsTab> {
  String _activeTab = 'overview'; // 'overview', 'available', 'active', 'delivery_map', 'completed', 'vehicle'
  final Map<String, TextEditingController> _otpControllers = {};
  final Map<String, String> _otpErrors = {};
  String? _handoverLoadingId;

  // Vehicle Profile Edit state
  bool _isEditingVehicle = false;
  late TextEditingController _vehicleTypeCtrl;
  late TextEditingController _vehicleNumberCtrl;
  late TextEditingController _capacityCtrl;
  late TextEditingController _serviceAreaCtrl;
  late TextEditingController _districtCtrl;
  late TextEditingController _pincodeCtrl;
  late TextEditingController _addressCtrl;

  // Route map expansion state
  bool _showAiReason = true;
  bool _showWeatherCheckpoints = false;

  @override
  void initState() {
    super.initState();
    _vehicleTypeCtrl = TextEditingController();
    _vehicleNumberCtrl = TextEditingController();
    _capacityCtrl = TextEditingController();
    _serviceAreaCtrl = TextEditingController();
    _districtCtrl = TextEditingController();
    _pincodeCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final logistics = Provider.of<LogisticsProvider>(context, listen: false);
    _initVehicleControllers(logistics.vehicleProfile);
  }

  void _initVehicleControllers(VehicleProfile profile) {
    _vehicleTypeCtrl.text = profile.vehicleType;
    _vehicleNumberCtrl.text = profile.vehicleNumber;
    _capacityCtrl.text = profile.capacity;
    _serviceAreaCtrl.text = profile.serviceArea;
    _districtCtrl.text = profile.district;
    _pincodeCtrl.text = profile.pincode;
    _addressCtrl.text = profile.address;
  }

  @override
  void dispose() {
    for (var c in _otpControllers.values) {
      c.dispose();
    }
    _vehicleTypeCtrl.dispose();
    _vehicleNumberCtrl.dispose();
    _capacityCtrl.dispose();
    _serviceAreaCtrl.dispose();
    _districtCtrl.dispose();
    _pincodeCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  TextEditingController _getOtpController(String shipmentId) {
    if (!_otpControllers.containsKey(shipmentId)) {
      _otpControllers[shipmentId] = TextEditingController();
    }
    return _otpControllers[shipmentId]!;
  }

  @override
  Widget build(BuildContext context) {
    final logistics = Provider.of<LogisticsProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // Top Header & Sub-Navigation Pills
            _buildTopConsoleHeader(logistics, auth, isDark),
            _buildSubNavPills(logistics, isDark),

            // Tab Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_activeTab == 'overview') _buildOverviewTab(logistics, isDark),
                    if (_activeTab == 'available') _buildAvailableJobsTab(logistics, isDark),
                    if (_activeTab == 'active') _buildActiveShipmentsTab(logistics, isDark),
                    if (_activeTab == 'delivery_map') _buildDeliveryMapTab(logistics, isDark),
                    if (_activeTab == 'completed') _buildCompletedTab(logistics, isDark),
                    if (_activeTab == 'vehicle') _buildVehicleProfileTab(logistics, auth, isDark),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Top Console Header & Sub-Navigation
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildTopConsoleHeader(LogisticsProvider logistics, AuthProvider auth, bool isDark) {
    final profile = logistics.vehicleProfile;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(bottom: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF0D9488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF059669).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(Icons.local_shipping, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          "Driver Hub Console",
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                          ),
                          child: const Text(
                            "ONLINE 🟢",
                            style: TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Welcome, ${auth.currentUser.name} (${auth.currentUser.username})",
                      style: TextStyle(fontSize: 11, color: isDark ? Colors.white70 : const Color(0xFF64748B)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("🔄 Refreshed driver jobs and GPS telemetry"),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                tooltip: "Refresh Feed",
                icon: const Icon(Icons.refresh, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Vehicle info chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildInfoChip(Icons.airport_shuttle, "${profile.vehicleType} · ${profile.vehicleNumber}", const Color(0xFF059669)),
                const SizedBox(width: 8),
                _buildInfoChip(Icons.fitness_center, "Cap: ${profile.capacity} kg", const Color(0xFF2563EB)),
                const SizedBox(width: 8),
                _buildInfoChip(Icons.location_on, profile.serviceArea.isNotEmpty ? profile.serviceArea : profile.district, const Color(0xFF9333EA)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildSubNavPills(LogisticsProvider logistics, bool isDark) {
    final tabs = [
      {'key': 'overview', 'label': 'Overview', 'icon': Icons.bar_chart_rounded, 'badge': 0},
      {'key': 'available', 'label': 'Available Jobs', 'icon': Icons.bolt_rounded, 'badge': logistics.availableJobs.length},
      {'key': 'active', 'label': 'Active Shipments', 'icon': Icons.local_shipping_rounded, 'badge': logistics.myActiveShipments.length},
      {'key': 'delivery_map', 'label': 'Delivery Map & Route', 'icon': Icons.alt_route_rounded, 'badge': logistics.activeRoutePlan != null ? 1 : 0},
      {'key': 'completed', 'label': 'Completed', 'icon': Icons.check_circle_rounded, 'badge': 0},
      {'key': 'vehicle', 'label': 'Vehicle Profile', 'icon': Icons.settings_rounded, 'badge': 0},
    ];

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(bottom: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
      ),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        scrollDirection: Axis.horizontal,
        itemCount: tabs.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, idx) {
          final tab = tabs[idx];
          final isSelected = _activeTab == tab['key'];
          final badge = tab['badge'] as int;

          return InkWell(
            key: ValueKey('subnav_${tab['key']}'),
            onTap: () => setState(() => _activeTab = tab['key'] as String),
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF059669)
                    : (isDark ? const Color(0xFF334155).withValues(alpha: 0.5) : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF059669)
                      : (isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1)),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    tab['icon'] as IconData,
                    size: 15,
                    color: isSelected ? Colors.white : (isDark ? Colors.white70 : const Color(0xFF475569)),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    tab['label'] as String,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? Colors.white : (isDark ? Colors.white70 : const Color(0xFF334155)),
                    ),
                  ),
                  if (badge > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white : const Color(0xFF059669),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        "$badge",
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: isSelected ? const Color(0xFF059669) : Colors.white,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 1: OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildOverviewTab(LogisticsProvider logistics, bool isDark) {
    final pendingOffers = logistics.pendingOffers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Pending Transport Offers Banner from Farmers
        if (pendingOffers.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.mark_email_unread_outlined, color: Color(0xFF2563EB), size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      "Direct Transport Offer",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF1E3A8A)),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text("NEW", style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  "Farmer ${pendingOffers.first.farmerUsername} offered you a pickup job for Order #${pendingOffers.first.orderId}.",
                  style: const TextStyle(fontSize: 12, color: Color(0xFF1E40AF)),
                ),
                Text(
                  "📍 Pickup: ${pendingOffers.first.pickupAddress} (${pendingOffers.first.distanceKm} km · ₹${pendingOffers.first.payoutRupees.toStringAsFixed(0)})",
                  style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6), fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ElevatedButton(
                      onPressed: () {
                        logistics.respondTransportOffer(pendingOffers.first.id, true);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("🎉 Transport offer accepted! Added to Active Shipments."), backgroundColor: Color(0xFF059669)),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text("Accept Offer", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () {
                        logistics.respondTransportOffer(pendingOffers.first.id, false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Offer declined."), backgroundColor: Color(0xFF64748B)),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text("Decline", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Lifetime Earnings Hero Gradient Banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF059669), Color(0xFF0D9488)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF059669).withValues(alpha: 0.25),
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
                  const Text(
                    "Total Lifetime Earnings",
                    style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "Rate: ₹${logistics.earningsPerKm.toStringAsFixed(0)}/km",
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                "₹${logistics.totalEarnings.toStringAsFixed(0)}",
                style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                "${logistics.completedJobs.length} deliveries done · ${logistics.totalKmDriven.toStringAsFixed(0)} km driven",
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 6 KPI Stat Cards Grid
        const Text("Dispatch Performance Metrics", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),

        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.5,
          children: [
            _buildStatCard(
              "Total Earnings",
              "₹${logistics.totalEarnings.toStringAsFixed(0)}",
              "@₹${logistics.earningsPerKm.toStringAsFixed(0)}/km",
              Icons.currency_rupee,
              const Color(0xFF059669),
              isDark,
            ),
            _buildStatCard(
              "Deliveries Done",
              "${logistics.completedJobs.length}",
              "Successfully fulfilled",
              Icons.inventory_2,
              const Color(0xFF2563EB),
              isDark,
            ),
            _buildStatCard(
              "Total KM Driven",
              "${logistics.totalKmDriven.toStringAsFixed(0)} km",
              "Across deliveries",
              Icons.route,
              const Color(0xFF9333EA),
              isDark,
            ),
            _buildStatCard(
              "Active Shipments",
              "${logistics.activeJobs.length}",
              "In transit / assigned",
              Icons.local_shipping,
              const Color(0xFFEA580C),
              isDark,
            ),
            _buildStatCard(
              "Available Jobs",
              "${logistics.availableJobs.length}",
              "Waiting for pickup",
              Icons.bolt,
              const Color(0xFFE11D48),
              isDark,
            ),
            _buildStatCard(
              "Avg per Delivery",
              logistics.completedJobs.isNotEmpty
                  ? "₹${(logistics.totalEarnings / logistics.completedJobs.length).toStringAsFixed(0)}"
                  : "₹0",
              "Earnings average",
              Icons.trending_up,
              const Color(0xFF0D9488),
              isDark,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Quick Alert: Available Jobs Waiting
        if (logistics.availableJobs.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                const Text("🔔", style: TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${logistics.availableJobs.length} New Delivery Jobs Available",
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF92400E)),
                      ),
                      const Text(
                        "Accept now to add to your daily earnings",
                        style: TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => setState(() => _activeTab = 'available'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text("View Jobs", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                      Icon(Icons.chevron_right, size: 14, color: Colors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatCard(String label, String value, String sub, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: color),
              ),
            ],
          ),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)),
          ),
          Text(
            sub,
            style: TextStyle(fontSize: 10, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 2: AVAILABLE JOBS
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildAvailableJobsTab(LogisticsProvider logistics, bool isDark) {
    final available = logistics.availableJobs;

    if (available.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              Icon(Icons.inventory_2_outlined, size: 48, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
              const SizedBox(height: 12),
              const Text("No delivery jobs available right now", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("Jobs appear when farmers pack fresh orders.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Broadcast Delivery Feed (${available.length})", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),

        ...available.map((job) => _buildAvailableJobCard(job, logistics, isDark)),
      ],
    );
  }

  Widget _buildAvailableJobCard(LogisticsShipment job, LogisticsProvider logistics, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Orange top accent
          Container(
            height: 4,
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEA580C)]),
              borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: const Text("📋 NEW JOB", style: TextStyle(color: Color(0xFFB45309), fontSize: 10, fontWeight: FontWeight.w900)),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text("${job.distanceKm} km", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                        Text("≈ ₹${job.payoutRupees.toStringAsFixed(0)} payout", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "Order #${job.orderId} Delivery",
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                Text(
                  "Cargo: ${job.cropName} (${job.quantity})",
                  style: TextStyle(fontSize: 12, color: isDark ? Colors.white70 : const Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),

                // Route Suggestion Box
                _buildRouteSuggestionBox(job.pickupAddress, job.deliveryAddress, job.distanceKm, job.payoutRupees, isDark),

                const SizedBox(height: 14),

                ElevatedButton(
                  onPressed: () {
                    logistics.acceptJob(job.id);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("🎉 Accepted Job #${job.orderId}! Switched to Active Shipments."),
                        backgroundColor: const Color(0xFF059669),
                      ),
                    );
                    setState(() => _activeTab = 'active');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    minimumSize: const Size.fromHeight(44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bolt, size: 16, color: Colors.white),
                      SizedBox(width: 6),
                      Text("Accept Delivery Job", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward, size: 14, color: Colors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRouteSuggestionBox(String pickup, String drop, double km, double estEarnings, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.navigation, size: 13, color: Color(0xFF16A34A)),
              SizedBox(width: 4),
              Text("Route Suggestion", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.circle, size: 8, color: Color(0xFF16A34A)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(fontSize: 11, color: isDark ? Colors.white70 : const Color(0xFF334155)),
                    children: [
                      const TextSpan(text: "Pickup: ", style: TextStyle(fontWeight: FontWeight.bold)),
                      TextSpan(text: pickup),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 3),
            child: Container(
              height: 14,
              width: 2,
              color: const Color(0xFF86EFAC),
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.circle, size: 8, color: Color(0xFF2563EB)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(fontSize: 11, color: isDark ? Colors.white70 : const Color(0xFF334155)),
                    children: [
                      const TextSpan(text: "Drop: ", style: TextStyle(fontWeight: FontWeight.bold)),
                      TextSpan(text: drop),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: Color(0xFFDCFCE7)),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("$km km estimated", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
              Text("₹${estEarnings.toStringAsFixed(0)} est. payout", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
            ],
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 3: ACTIVE SHIPMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildActiveShipmentsTab(LogisticsProvider logistics, bool isDark) {
    final active = logistics.myActiveShipments;

    if (active.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              Icon(Icons.local_shipping_outlined, size: 48, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
              const SizedBox(height: 12),
              const Text("No active shipments right now", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("Accept a broadcast job to start delivering.", style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => setState(() => _activeTab = 'available'),
                icon: const Icon(Icons.bolt, size: 16),
                label: const Text("Browse Available Jobs"),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669)),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Active Assigned Shipments (${active.length})", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),

        ...active.map((job) => _buildActiveShipmentCard(job, logistics, isDark)),
      ],
    );
  }

  Widget _buildActiveShipmentCard(LogisticsShipment job, LogisticsProvider logistics, bool isDark) {
    final isInTransit = job.status == 'picked_up';
    final isHandoverCompleted = job.status == 'handover_completed';
    final isAssigned = job.status == 'assigned';
    final otpCtrl = _getOtpController(job.id);
    final errorMsg = _otpErrors[job.id];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isInTransit ? const Color(0xFF3B82F6) : const Color(0xFF10B981), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Colored accent header bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isInTransit
                  ? const Color(0xFFEFF6FF)
                  : const Color(0xFFECFDF5),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isInTransit ? const Color(0xFF2563EB) : const Color(0xFF059669),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isInTransit ? "🚚 IN TRANSIT" : (isHandoverCompleted ? "🤝 HANDOVER DONE" : "📋 ASSIGNED"),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  "Order #${job.orderId}",
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: isDark ? Colors.black87 : const Color(0xFF0F172A)),
                ),
              ],
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(job.cropName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                          Text("Cargo Load: ${job.quantity}", style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : const Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text("${job.distanceKm} km", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                        Text("Payout: ₹${job.payoutRupees.toStringAsFixed(0)}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3-Step Milestone Stepper
                _buildShipmentStepper(job.status, isDark),
                const SizedBox(height: 14),

                // Route box
                _buildRouteSuggestionBox(job.pickupAddress, job.deliveryAddress, job.distanceKm, job.payoutRupees, isDark),
                const SizedBox(height: 14),

                // Action Step 1: Assigned -> Confirm Physical Handover
                if (isAssigned) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline, size: 14, color: Color(0xFFD97706)),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            "Head to farmer's location, verify cargo quality, and tap below to confirm physical handover.",
                            style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: _handoverLoadingId == job.id
                        ? null
                        : () async {
                            setState(() => _handoverLoadingId = job.id);
                            await Future.delayed(const Duration(milliseconds: 600));
                            logistics.confirmHandover(job.id);
                            setState(() => _handoverLoadingId = null);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("🤝 Physical handover confirmed! Order cancellation locked."),
                                  backgroundColor: Color(0xFF059669),
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      minimumSize: const Size.fromHeight(44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _handoverLoadingId == job.id
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.handshake_outlined, size: 16, color: Colors.white),
                              SizedBox(width: 6),
                              Text("Confirm Physical Handover", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                            ],
                          ),
                  ),
                ],

                // Action Step 2: Handover Completed -> Start Transit
                if (isHandoverCompleted) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline, size: 14, color: Color(0xFF2563EB)),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            "Cargo safely loaded in vehicle. Tap Start Transit to notify buyer with their delivery OTP.",
                            style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    onPressed: () {
                      logistics.startTransit(job.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("🚚 Marked as In Transit! Delivery OTP sent to consumer."),
                          backgroundColor: Color(0xFF2563EB),
                        ),
                      );
                    },
                    icon: const Icon(Icons.local_shipping, size: 16, color: Colors.white),
                    label: const Text("Start Transit (Pick Up)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      minimumSize: const Size.fromHeight(44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],

                // Action Step 3: In Transit -> OTP Verification
                if (isInTransit) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.mark_email_read_outlined, size: 16, color: Color(0xFF059669)),
                            SizedBox(width: 6),
                            Text("Delivery OTP sent to Buyer's Email", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF065F46))),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Ask the recipient for the 4-6 digit code. (Demo Helper OTP: ${job.deliveryOtp} or '1234')",
                          style: const TextStyle(fontSize: 11, color: Color(0xFF047857)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: otpCtrl,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 4),
                          decoration: InputDecoration(
                            counterText: "",
                            hintText: "● ● ● ● ● ●",
                            hintStyle: const TextStyle(letterSpacing: 4),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF059669), width: 2)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: () {
                          final code = otpCtrl.text.trim();
                          if (code.isEmpty) {
                            setState(() => _otpErrors[job.id] = "Please enter delivery OTP");
                            return;
                          }

                          final success = logistics.verifyAndCompleteDelivery(job.id, code);
                          if (success) {
                            setState(() => _otpErrors[job.id] = "");
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("🎉 OTP Verified! Order #${job.orderId} delivered. ₹${job.payoutRupees.toStringAsFixed(0)} credited."),
                                backgroundColor: const Color(0xFF059669),
                              ),
                            );
                          } else {
                            setState(() => _otpErrors[job.id] = "Invalid OTP. Use ${job.deliveryOtp} or 1234.");
                          }
                        },
                        icon: const Icon(Icons.verified, size: 16, color: Colors.white),
                        label: const Text("Verify", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          minimumSize: const Size(100, 48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),

                  if (errorMsg != null && errorMsg.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(errorMsg, style: const TextStyle(color: Color(0xFFE11D48), fontSize: 11, fontWeight: FontWeight.bold)),
                  ],

                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () {
                      logistics.resendOtpEmail(job.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("📧 Resent delivery OTP to consumer's registered email.")),
                      );
                    },
                    icon: const Icon(Icons.send_outlined, size: 13, color: Color(0xFF059669)),
                    label: const Text("Resend OTP to Consumer Email", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShipmentStepper(String status, bool isDark) {
    int currentStep = 0;
    if (status == 'assigned') currentStep = 1;
    if (status == 'handover_completed') currentStep = 1;
    if (status == 'picked_up') currentStep = 2;
    if (status == 'delivered') currentStep = 3;

    final steps = ['Assigned', 'Picked Up', 'Delivered'];

    return Row(
      children: List.generate(steps.length * 2 - 1, (index) {
        if (index.isOdd) {
          final stepIndex = (index ~/ 2) + 1;
          final isCompleted = currentStep >= stepIndex;
          return Expanded(
            child: Container(
              height: 2,
              color: isCompleted ? const Color(0xFF059669) : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
          );
        }

        final stepIndex = (index ~/ 2) + 1;
        final isCompleted = currentStep > stepIndex;
        final isCurrent = currentStep == stepIndex;

        return Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted || isCurrent ? const Color(0xFF059669) : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                border: isCurrent ? Border.all(color: const Color(0xFFA7F3D0), width: 3) : null,
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : Text("$stepIndex", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isCurrent ? Colors.white : Colors.grey)),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              steps[stepIndex - 1],
              style: TextStyle(
                fontSize: 10,
                fontWeight: isCurrent || isCompleted ? FontWeight.bold : FontWeight.normal,
                color: isCurrent || isCompleted ? const Color(0xFF059669) : Colors.grey,
              ),
            ),
          ],
        );
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 4: DELIVERY MAP & ROUTE
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildDeliveryMapTab(LogisticsProvider logistics, bool isDark) {
    final routePlan = logistics.activeRoutePlan;

    if (routePlan == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              Icon(Icons.alt_route, size: 48, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
              const SizedBox(height: 12),
              const Text("No active delivery route", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("Your live route will appear once a shipment is in progress.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    final activeCandidate = routePlan.activeCandidate;
    final primaryPolyline = activeCandidate.geometry
        .map((g) => LatLng(g[0], g[1]))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Active Delivery Header
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      "ACTIVE DELIVERY: ${routePlan.orderNumber}",
                      style: const TextStyle(color: Color(0xFF2563EB), fontSize: 10, fontWeight: FontWeight.w900),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      routePlan.status,
                      style: const TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "${routePlan.commodity} (${routePlan.quantity})",
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 2),
              Text(
                "📍 ${routePlan.pickup} ➔ 🏁 ${routePlan.destination}",
                style: TextStyle(fontSize: 11, color: isDark ? Colors.white70 : const Color(0xFF64748B)),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () {
                      logistics.updateDriverLocation(19.8667, 73.6833);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("📍 Driver GPS telemetry updated on route map.")),
                      );
                    },
                    icon: const Icon(Icons.my_location, size: 14),
                    label: const Text("Locate Me", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    "Selected: ${activeCandidate.name}",
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Interactive FlutterMap
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Container(
            height: 320,
            decoration: BoxDecoration(
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(routePlan.pickupCoordinates[0], routePlan.pickupCoordinates[1]),
                initialZoom: 7.8,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'org.kisanconnect.mobile',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: primaryPolyline,
                      color: const Color(0xFF2563EB),
                      strokeWidth: 5.0,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    // Pickup Marker
                    Marker(
                      point: LatLng(routePlan.pickupCoordinates[0], routePlan.pickupCoordinates[1]),
                      width: 32,
                      height: 32,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF059669),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Center(child: Text("P", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
                      ),
                    ),
                    // Destination Marker
                    Marker(
                      point: LatLng(routePlan.destinationCoordinates[0], routePlan.destinationCoordinates[1]),
                      width: 32,
                      height: 32,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFE11D48),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Center(child: Text("D", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
                      ),
                    ),
                    // Driver GPS Marker
                    if (logistics.driverLocation != null)
                      Marker(
                        point: LatLng(logistics.driverLocation![0], logistics.driverLocation![1]),
                        width: 34,
                        height: 34,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFEA580C),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.local_shipping, color: Colors.white, size: 18),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Candidate Routes Selector
        Text(
          "Available Candidate Routes (${routePlan.candidateRoutes.length})",
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),

        ...routePlan.candidateRoutes.map((candidate) {
          final isSelected = candidate.routeId == routePlan.activeRouteId;
          return InkWell(
            onTap: () => logistics.selectCandidateRoute(candidate.routeId),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.3) : const Color(0xFFEFF6FF))
                    : (isDark ? const Color(0xFF1E293B) : Colors.white),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? const Color(0xFF2563EB) : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                    color: isSelected ? const Color(0xFF2563EB) : Colors.grey,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              "${candidate.routeId}: ${candidate.name}",
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            if (candidate.routeId == 'R1') ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text("RECOMMENDED", style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900)),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          "📏 ${candidate.distanceKm} km · ⏱️ ${candidate.durationHours} hrs · Weather Risk: ${candidate.weatherRisk}",
                          style: TextStyle(fontSize: 11, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 12),

        // Primary Metrics Grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.2,
          children: [
            _buildMetricCell("Distance", "${activeCandidate.distanceKm} km", Icons.straighten, const Color(0xFF2563EB), isDark),
            _buildMetricCell("Est Duration", "${activeCandidate.durationHours} hrs", Icons.schedule, const Color(0xFF059669), isDark),
            _buildMetricCell(
              "ETA",
              "${routePlan.estimatedArrival.hour.toString().padLeft(2, '0')}:${routePlan.estimatedArrival.minute.toString().padLeft(2, '0')}",
              Icons.flag_outlined,
              const Color(0xFF9333EA),
              isDark,
            ),
            _buildMetricCell("Cargo Risk", activeCandidate.qualityRisk, Icons.security, const Color(0xFFD97706), isDark),
          ],
        ),
        const SizedBox(height: 14),

        // AI Route Recommendation Accordion
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              ListTile(
                dense: true,
                onTap: () => setState(() => _showAiReason = !_showAiReason),
                leading: const Icon(Icons.psychology, color: Color(0xFF2563EB), size: 20),
                title: const Text("AI Route Recommendation Reasoning", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                trailing: Icon(_showAiReason ? Icons.expand_less : Icons.expand_more, size: 18),
              ),
              if (_showAiReason)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  child: Text(
                    routePlan.llmReason,
                    style: TextStyle(fontSize: 11, height: 1.4, color: isDark ? Colors.white70 : const Color(0xFF475569)),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Weather Forecast Checkpoints Accordion
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              ListTile(
                dense: true,
                onTap: () => setState(() => _showWeatherCheckpoints = !_showWeatherCheckpoints),
                leading: const Icon(Icons.cloud_outlined, color: Color(0xFF0D9488), size: 20),
                title: Text(
                  "Weather Forecast Checkpoints (${activeCandidate.weatherCheckpoints.length})",
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                trailing: Icon(_showWeatherCheckpoints ? Icons.expand_less : Icons.expand_more, size: 18),
              ),
              if (_showWeatherCheckpoints)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Column(
                    children: activeCandidate.weatherCheckpoints.map((cp) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Icon(Icons.circle, size: 8, color: cp.riskLevel == 'LOW' ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
                            const SizedBox(width: 8),
                            Text("${cp.pointId} (${cp.distanceFromOriginKm} km)", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            const Spacer(),
                            Text("🌡️ ${cp.temperatureC}°C", style: const TextStyle(fontSize: 11)),
                            const SizedBox(width: 8),
                            Text("🌧️ ${cp.precipitationProbability}%", style: const TextStyle(fontSize: 11)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: cp.riskLevel == 'LOW' ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(cp.riskLevel, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: cp.riskLevel == 'LOW' ? const Color(0xFF059669) : const Color(0xFFD97706))),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Recalculate Route Action
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: () async {
              await logistics.recalculateRoute();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("🔄 Route recalculated with latest weather and radar updates!")),
                );
              }
            },
            icon: const Icon(Icons.refresh, size: 15, color: Color(0xFF2563EB)),
            label: const Text("Recalculate Routes (Weather / Disruption)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCell(String label, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: TextStyle(fontSize: 10, color: isDark ? Colors.white60 : const Color(0xFF64748B))),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
            ],
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 5: COMPLETED SHIPMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTab(LogisticsProvider logistics, bool isDark) {
    final completed = logistics.myCompletedShipments;

    if (completed.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              Icon(Icons.star_outline_rounded, size: 48, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
              const SizedBox(height: 12),
              const Text("No completed deliveries yet", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("Deliveries verified with buyer OTP appear here.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Completed Earnings Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Total Completed", style: TextStyle(color: Colors.white70, fontSize: 11)),
                  Text("${completed.length} deliveries", style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text("Total Payout Earned", style: TextStyle(color: Colors.white70, fontSize: 11)),
                  Text("₹${logistics.totalEarnings.toStringAsFixed(0)}", style: const TextStyle(color: Color(0xFF34D399), fontSize: 20, fontWeight: FontWeight.w900)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Text("Fulfillment History (${completed.length})", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),

        ...completed.map((job) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.check_circle, size: 10, color: Color(0xFF059669)),
                                SizedBox(width: 4),
                                Text("Delivered", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text("Order #${job.orderId}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text("📍 ${job.deliveryAddress}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Text(
                        "📏 ${job.distanceKm} km · ${job.cropName} (${job.quantity})",
                        style: TextStyle(fontSize: 11, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("₹${job.payoutRupees.toStringAsFixed(0)}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                    const Text("earned", style: TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 6: VEHICLE PROFILE
  // ─────────────────────────────────────────────────────────────────────────────
  Widget _buildVehicleProfileTab(LogisticsProvider logistics, AuthProvider auth, bool isDark) {
    final profile = logistics.vehicleProfile;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Vehicle & Fleet Registration", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                Text("Required for algorithmic job dispatch", style: TextStyle(fontSize: 11, color: isDark ? Colors.white60 : const Color(0xFF64748B))),
              ],
            ),
            if (!_isEditingVehicle)
              ElevatedButton.icon(
                onPressed: () {
                  _initVehicleControllers(profile);
                  setState(() => _isEditingVehicle = true);
                },
                icon: const Icon(Icons.edit, size: 14, color: Colors.white),
                label: const Text("Edit Profile", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),

        if (!_isEditingVehicle) ...[
          // View Mode: Cards Grid
          _buildProfileAttrCard("🚛 Vehicle Type", profile.vehicleType, isDark),
          _buildProfileAttrCard("🔢 Vehicle Number", profile.vehicleNumber, isDark),
          _buildProfileAttrCard("⚖️ Load Capacity", "${profile.capacity} kg", isDark),
          _buildProfileAttrCard("📍 Service Area", profile.serviceArea, isDark),
          _buildProfileAttrCard("🏙️ District", profile.district, isDark),
          _buildProfileAttrCard("📮 Pincode", profile.pincode, isDark),
          _buildProfileAttrCard("🏠 Base Address", profile.address, isDark),
        ] else ...[
          // Edit Mode Form
          _buildEditField("Vehicle Type", _vehicleTypeCtrl, "e.g. Refrigerated Eicher Pro 10 Ton", isDark),
          _buildEditField("Vehicle Number", _vehicleNumberCtrl, "e.g. MH-15-EG-4521", isDark),
          _buildEditField("Capacity (kg)", _capacityCtrl, "e.g. 10000", isDark),
          _buildEditField("Service Area", _serviceAreaCtrl, "e.g. Maharashtra & Gujarat Corridor", isDark),
          _buildEditField("District", _districtCtrl, "e.g. Nashik", isDark),
          _buildEditField("Pincode", _pincodeCtrl, "e.g. 422003", isDark),
          _buildEditField("Base Operational Address", _addressCtrl, "e.g. Plot 42, MIDC Ambad", isDark, maxLines: 2),

          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _isEditingVehicle = false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text("Cancel"),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    logistics.updateVehicleProfile(
                      vehicleType: _vehicleTypeCtrl.text.trim(),
                      vehicleNumber: _vehicleNumberCtrl.text.trim(),
                      capacity: _capacityCtrl.text.trim(),
                      serviceArea: _serviceAreaCtrl.text.trim(),
                      district: _districtCtrl.text.trim(),
                      pincode: _pincodeCtrl.text.trim(),
                      address: _addressCtrl.text.trim(),
                    );

                    auth.updateUserProfile(
                      auth.currentUser.copyWith(
                        vehicleType: _vehicleTypeCtrl.text.trim(),
                        vehicleNumber: _vehicleNumberCtrl.text.trim(),
                        capacity: _capacityCtrl.text.trim(),
                        serviceArea: _serviceAreaCtrl.text.trim(),
                        district: _districtCtrl.text.trim(),
                        pincode: _pincodeCtrl.text.trim(),
                        address: _addressCtrl.text.trim(),
                      ),
                    );

                    setState(() => _isEditingVehicle = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("🚗 Vehicle and fleet profile saved successfully!"),
                        backgroundColor: Color(0xFF059669),
                      ),
                    );
                  },
                  icon: const Icon(Icons.save, size: 16, color: Colors.white),
                  label: const Text("Save Changes", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],

        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  "ℹ️ How job matching works: Your district and pincode are indexed by Kisan Connect dispatch engines to match you with nearby harvest shipments with highest payout per km.",
                  style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF), height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProfileAttrCard(String label, String value, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? Colors.white60 : const Color(0xFF64748B))),
          Flexible(
            child: Text(
              value.isNotEmpty ? value : "Not set",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: value.isNotEmpty ? (isDark ? Colors.white : const Color(0xFF0F172A)) : Colors.grey),
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditField(String label, TextEditingController ctrl, String hint, bool isDark, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          TextField(
            controller: ctrl,
            maxLines: maxLines,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: hint,
              filled: true,
              fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
            ),
          ),
        ],
      ),
    );
  }
}
