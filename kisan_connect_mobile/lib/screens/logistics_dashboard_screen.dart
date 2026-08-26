import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/api_config_provider.dart';
import '../services/api_client.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class LogisticsDashboardScreen extends StatefulWidget {
  const LogisticsDashboardScreen({Key? key}) : super(key: key);

  @override
  State<LogisticsDashboardScreen> createState() => _LogisticsDashboardScreenState();
}

class _LogisticsDashboardScreenState extends State<LogisticsDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  List<dynamic> _assignedJobs = [];
  Map<String, dynamic>? _activeDelivery;
  Map<String, dynamic>? _activeRoutePlan;
  List<LatLng> _routePoints = [];
  LatLng? _pickupCoords;
  LatLng? _destCoords;
  List<dynamic> _weatherCheckpoints = [];

  // Profile Form Controllers
  final _plateCtrl = TextEditingController();
  final _capacityCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  String _selectedVehicleType = 'tempo';

  // OTP Verification Controller
  final _otpCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchDashboardData();
      _initializeProfileFields();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _plateCtrl.dispose();
    _capacityCtrl.dispose();
    _areaCtrl.dispose();
    _otpCtrl.dispose();
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

  void _initializeProfileFields() {
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    if (user != null) {
      _plateCtrl.text = user['vehicle_number'] ?? '';
      _capacityCtrl.text = user['capacity']?.toString() ?? '';
      _areaCtrl.text = user['service_area'] ?? '';
      _selectedVehicleType = user['vehicle_type'] ?? 'tempo';
    }
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final client = _getApiClient();
      
      // 1. Get assigned shipments
      final jobsRes = await client.get('/logistics/shipments/');
      final allShipments = jobsRes['data'] ?? [];
      _assignedJobs = allShipments.where((s) => s['status'] == 'assigned').toList();

      // 2. Get active delivery for driver
      try {
        final activeRes = await client.get('/route-planning/driver/active-delivery/');
        final activeData = activeRes['active_delivery'] ?? activeRes['shipment'];
        
        if (activeData != null) {
          _activeDelivery = Map<String, dynamic>.from(activeData);
          if (!_activeDelivery!.containsKey('id') && _activeDelivery!.containsKey('shipment_id')) {
            _activeDelivery!['id'] = _activeDelivery!['shipment_id'];
          }
        } else {
          _activeDelivery = null;
        }
        
        if (_activeDelivery != null && _activeDelivery!['id'] != null) {
          final shipmentId = _activeDelivery!['id'];
          // Fetch route geometry for mapping
          final routeRes = await client.get('/route-planning/shipments/$shipmentId/route/');
          _activeRoutePlan = routeRes;

          final pickup = routeRes['pickup_coordinates'];
          if (pickup != null && pickup[0] != null && pickup[1] != null) {
            _pickupCoords = LatLng(double.parse(pickup[0].toString()), double.parse(pickup[1].toString()));
          }

          final dest = routeRes['destination_coordinates'];
          if (dest != null && dest[0] != null && dest[1] != null) {
            _destCoords = LatLng(double.parse(dest[0].toString()), double.parse(dest[1].toString()));
          }

          final routeMap = routeRes['route'] ?? {};
          final List<dynamic> geom = routeMap['route_geometry'] ?? routeMap['geometry'] ?? [];
          _routePoints = geom.map((pt) {
            return LatLng(double.parse(pt[0].toString()), double.parse(pt[1].toString()));
          }).toList();

          _weatherCheckpoints = routeMap['weather_checkpoints'] ?? routeMap['weather_snapshot'] ?? [];
        } else {
          _activeDelivery = null;
          _activeRoutePlan = null;
          _routePoints = [];
          _pickupCoords = null;
          _destCoords = null;
          _weatherCheckpoints = [];
        }
      } catch (err, stack) {
        debugPrint('ACTIVE DELIVERY ERROR: $err\n$stack');
        // No active delivery
        _activeDelivery = null;
        _activeRoutePlan = null;
        _routePoints = [];
        _pickupCoords = null;
        _destCoords = null;
        _weatherCheckpoints = [];
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading logistics data: $e')),
      );
    }
  }

  // Job alert acceptance
  Future<void> _acceptJob(int shipmentId) async {
    try {
      final client = _getApiClient();
      await client.post('/logistics/shipments/$shipmentId/accept-job/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Job accepted! Routing generated.')));
      _fetchDashboardData();
      _tabController.animateTo(1);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Accept job failed: $e')));
    }
  }

  // Active Shipment status actions
  Future<void> _updateStatusPickedUp(int shipmentId) async {
    try {
      final client = _getApiClient();
      await client.post('/logistics/shipments/$shipmentId/update-status/', {'status': 'picked_up'});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shipment status updated: PICKED UP')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
    }
  }

  Future<void> _confirmHandover(int shipmentId) async {
    try {
      final client = _getApiClient();
      await client.post('/logistics/shipments/$shipmentId/confirm-handover/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Physical handover confirmed!')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Handover confirmation failed: $e')));
    }
  }

  Future<void> _sendOtpEmail(int shipmentId) async {
    try {
      final client = _getApiClient();
      await client.post('/logistics/shipments/$shipmentId/send-otp-email/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP code email sent to consumer.')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to send OTP code: $e')));
    }
  }

  Future<void> _verifyOtpDelivery(int shipmentId) async {
    if (_otpCtrl.text.isEmpty) return;
    try {
      final client = _getApiClient();
      await client.post('/logistics/shipments/$shipmentId/verify-otp/', {'otp': _otpCtrl.text});
      _otpCtrl.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP Verified successfully. Delivery completed!')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('OTP verification failed: $e')));
    }
  }

  Future<void> _recalculateRoute(int shipmentId) async {
    try {
      final client = _getApiClient();
      await client.post('/route-planning/shipments/$shipmentId/recalculate-route/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Active route recalculated!')));
      _fetchDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Recalculation failed: $e')));
    }
  }

  // Update vehicle profile
  Future<void> _updateProfile() async {
    try {
      final client = _getApiClient();
      await client.patch('/logistics/vehicle/update/', {
        'vehicle_number': _plateCtrl.text,
        'vehicle_type': _selectedVehicleType,
        'capacity': double.tryParse(_capacityCtrl.text) ?? 0.0,
        'service_area': _areaCtrl.text,
      });

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vehicle profile updated!')));
      
      // Update session info
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final updatedUser = Map<String, dynamic>.from(auth.user!);
      updatedUser['vehicle_number'] = _plateCtrl.text;
      updatedUser['vehicle_type'] = _selectedVehicleType;
      updatedUser['capacity'] = double.tryParse(_capacityCtrl.text) ?? 0.0;
      updatedUser['service_area'] = _areaCtrl.text;
      await auth.prefs.setString('user', auth.user.toString());
      auth.notifyListeners();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update profile: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Logistics Console 🚚', style: TextStyle(fontWeight: FontWeight.w900, color: Theme.of(context).primaryColor)),
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
          tabs: const [
            Tab(text: '🔔 Job Alerts'),
            Tab(text: '🚚 Active Route'),
            Tab(text: '👤 Driver Profile'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // JOB ALERTS TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: _assignedJobs.isEmpty
                      ? const Center(child: Text('No active job requests available in your area.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _assignedJobs.length,
                          itemBuilder: (c, idx) {
                            final job = _assignedJobs[idx];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Shipment Job #${job['id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                    const SizedBox(height: 6),
                                    Text('Pickup Address: ${job['pickup_address'] ?? ''}'),
                                    Text('Delivery Address: ${job['delivery_address'] ?? ''}'),
                                    const Divider(),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                          onPressed: () => _acceptJob(job['id']),
                                          child: const Text('Accept Job', style: TextStyle(color: Colors.white)),
                                        )
                                      ],
                                    )
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // ACTIVE DELIVERY ROUTING MAP TAB
                RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: _activeDelivery == null
                      ? const Center(child: Text('No active delivery shipment in progress.'))
                      : Column(
                          children: [
                            // Status update controller panel
                            Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.grey.shade100),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Active Shipment #${_activeDelivery!['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text('Delivery status: ${_activeDelivery!['status']?.toUpperCase()}', style: const TextStyle(color: Colors.blue, fontSize: 12)),
                                    const Divider(),
                                    if (_activeDelivery!['status'] == 'assigned')
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                          onPressed: () => _confirmHandover(_activeDelivery!['id']),
                                          child: const Text('Confirm Physical Handover', style: TextStyle(color: Colors.white)),
                                        ),
                                      )
                                    else if (_activeDelivery!['status'] == 'handover_completed')
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade600),
                                          onPressed: () => _updateStatusPickedUp(_activeDelivery!['id']),
                                          child: const Text('Start Transit (Pick Up)', style: TextStyle(color: Colors.white)),
                                        ),
                                      )
                                    else if (_activeDelivery!['status'] == 'picked_up' || _activeDelivery!['status'] == 'in_transit')
                                      Column(
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: TextField(
                                                  controller: _otpCtrl,
                                                  keyboardType: TextInputType.number,
                                                  decoration: const InputDecoration(
                                                    border: OutlineInputBorder(),
                                                    labelText: 'Verify Delivery OTP',
                                                    contentPadding: EdgeInsets.all(8),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              ElevatedButton(
                                                style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                                                onPressed: () => _verifyOtpDelivery(_activeDelivery!['id']),
                                                child: const Text('Confirm', style: TextStyle(color: Colors.white)),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          TextButton(
                                            onPressed: () => _sendOtpEmail(_activeDelivery!['id']),
                                            child: const Text('Resend OTP Email to Consumer', style: TextStyle(color: Colors.blue)),
                                          )
                                        ],
                                      )
                                  ],
                                ),
                              ),
                            ),

                            // Map rendering
                            Expanded(
                              child: Stack(
                                children: [
                                  FlutterMap(
                                    options: MapOptions(
                                      initialCenter: _pickupCoords ?? const LatLng(20.5937, 78.9629),
                                      initialZoom: 8.0,
                                    ),
                                    children: [
                                      TileLayer(
                                        urlTemplate: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                                        userAgentPackageName: 'com.kisanconnect.marketplace',
                                      ),
                                      if (_routePoints.isNotEmpty)
                                        PolylineLayer(
                                          polylines: [
                                            Polyline(
                                              points: _routePoints,
                                              color: Colors.blue.shade600,
                                              strokeWidth: 4.5,
                                            ),
                                          ],
                                        ),
                                      MarkerLayer(
                                        markers: [
                                          if (_pickupCoords != null)
                                            Marker(
                                              point: _pickupCoords!,
                                              width: 32,
                                              height: 32,
                                              child: Icon(Icons.location_on, color: Theme.of(context).colorScheme.secondary, size: 30),
                                            ),
                                          if (_destCoords != null)
                                            Marker(
                                              point: _destCoords!,
                                              width: 32,
                                              height: 32,
                                              child: const Icon(Icons.flag, color: Colors.red, size: 30),
                                            ),
                                          // Weather checkpoints
                                          ..._weatherCheckpoints.map((cp) {
                                            double? lat;
                                            double? lng;
                                            if (cp['coordinates'] != null) {
                                              final coords = cp['coordinates'] as List;
                                              if (coords.length >= 2) {
                                                lat = double.tryParse(coords[0].toString());
                                                lng = double.tryParse(coords[1].toString());
                                              }
                                            } else {
                                              lat = double.tryParse(cp['latitude']?.toString() ?? '');
                                              lng = double.tryParse(cp['longitude']?.toString() ?? '');
                                            }
                                            if (lat == null || lng == null) {
                                              return const Marker(point: LatLng(0, 0), child: SizedBox());
                                            }
                                            return Marker(
                                              point: LatLng(lat, lng),
                                              child: const CircleAvatar(
                                                backgroundColor: Colors.orange,
                                                radius: 8,
                                                child: Icon(Icons.cloud, size: 8, color: Colors.white),
                                              ),
                                            );
                                          }).toList(),
                                        ],
                                      ),
                                    ],
                                  ),
                                  
                                  // Recalculate overlay
                                  Positioned(
                                    bottom: 12,
                                    right: 12,
                                    child: FloatingActionButton.extended(
                                      backgroundColor: Theme.of(context).primaryColor,
                                      icon: const Icon(Icons.alt_route, color: Colors.white),
                                      label: const Text('Recalculate Route', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      onPressed: () => _recalculateRoute(_activeDelivery!['id']),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                ),

                // DRIVER PROFILE SETTINGS TAB
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Update Vehicle Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const Divider(),
                      TextField(
                        controller: _plateCtrl,
                        decoration: const InputDecoration(labelText: 'License Plate Number'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _selectedVehicleType,
                        decoration: const InputDecoration(labelText: 'Vehicle Type'),
                        items: const [
                          DropdownMenuItem(value: 'tempo', child: Text('Tempo')),
                          DropdownMenuItem(value: 'truck', child: Text('Truck')),
                          DropdownMenuItem(value: 'reefer', child: Text('Reefer')),
                          DropdownMenuItem(value: 'motorcycle', child: Text('Motorcycle')),
                        ],
                        onChanged: (val) => setState(() => _selectedVehicleType = val ?? 'tempo'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _capacityCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Load Capacity (kg)'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _areaCtrl,
                        decoration: const InputDecoration(labelText: 'Service Pincodes / Area'),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                          onPressed: _updateProfile,
                          child: const Text('Save Details', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
