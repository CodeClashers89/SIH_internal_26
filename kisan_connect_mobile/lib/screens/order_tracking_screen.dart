import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/api_client.dart';

class OrderTrackingScreen extends StatefulWidget {
  final int orderId;
  final ApiClient apiClient;

  const OrderTrackingScreen({Key? key, required this.orderId, required this.apiClient}) : super(key: key);

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _routeData;
  Map<String, dynamic>? _orderData;
  String _errorMessage = '';

  List<LatLng> _routePoints = [];
  LatLng? _pickupCoords;
  LatLng? _destCoords;
  List<Map<String, dynamic>> _weatherCheckpoints = [];
  String _shipmentStatus = 'placed';
  int? _shipmentId;
  String? _deliveryOtp;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      // 1. Fetch Order to get Shipment details
      final orderRes = await widget.apiClient.get('/orders/${widget.orderId}/');
      _orderData = orderRes;
      
      final shipment = orderRes['shipment'];
      if (shipment == null) {
        setState(() {
          _shipmentStatus = orderRes['status'] ?? 'placed';
          _isLoading = false;
        });
        return;
      }

      _shipmentId = shipment['id'];
      _shipmentStatus = shipment['status'] ?? 'placed';
      _deliveryOtp = shipment['delivery_otp']?.toString();

      // 2. Fetch active Route Plan using shipment ID
      final routeRes = await widget.apiClient.get('/route-planning/shipments/$_shipmentId/route/');
      _routeData = routeRes;

      // Extract coordinates
      final pickup = routeRes['pickup_coordinates'];
      if (pickup != null && pickup[0] != null && pickup[1] != null) {
        _pickupCoords = LatLng(double.parse(pickup[0].toString()), double.parse(pickup[1].toString()));
      }

      final dest = routeRes['destination_coordinates'];
      if (dest != null && dest[0] != null && dest[1] != null) {
        _destCoords = LatLng(double.parse(dest[0].toString()), double.parse(dest[1].toString()));
      }

      // Extract geometry points
      final routeMap = routeRes['route'] ?? {};
      final List<dynamic> geom = routeMap['route_geometry'] ?? routeMap['geometry'] ?? [];
      _routePoints = geom.map((pt) {
        return LatLng(double.parse(pt[0].toString()), double.parse(pt[1].toString()));
      }).toList();

      // Weather checkpoints
      final List<dynamic> checkpoints = routeMap['weather_checkpoints'] ?? [];
      _weatherCheckpoints = checkpoints.map((item) => item as Map<String, dynamic>).toList();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _recalculateRoute() async {
    if (_shipmentId == null) return;
    setState(() {
      _isLoading = true;
    });

    try {
      await widget.apiClient.post('/route-planning/shipments/$_shipmentId/recalculate-route/');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Route recalculated successfully!')),
      );
      _fetchDetails();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Recalculation failed: $e')),
      );
    }
  }

  Color _getRiskColor(String risk) {
    switch (risk.toUpperCase()) {
      case 'LOW':
        return Colors.green;
      case 'MEDIUM':
        return Colors.yellow.shade700;
      case 'HIGH':
        return Colors.orange;
      case 'CRITICAL':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildStepper() {
    final statusSteps = ['placed', 'confirmed', 'packed', 'in_transit', 'delivered'];
    final statusLabels = {
      'placed': 'Placed',
      'confirmed': 'Confirmed',
      'packed': 'Packed',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
    };

    int currentIdx = statusSteps.indexOf(_shipmentStatus);
    if (currentIdx == -1) currentIdx = 0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(statusSteps.length, (idx) {
              final step = statusSteps[idx];
              final label = statusLabels[step]!;
              final isDone = idx <= currentIdx;
              final isCurrent = idx == currentIdx;

              return Column(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: isCurrent
                        ? Theme.of(context).primaryColor
                        : isDone
                            ? Theme.of(context).primaryColor.withOpacity(0.5)
                            : Colors.grey.shade300,
                    child: Icon(
                      isDone ? Icons.check : Icons.circle,
                      size: 12,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(label, style: TextStyle(fontSize: 9, fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    LatLng mapCenter = _pickupCoords ?? const LatLng(20.5937, 78.9629);

    return Scaffold(
      appBar: AppBar(
        title: Text('Track Shipment #${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchDetails,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
              ? Center(child: Text('Error loading route: $_errorMessage'))
              : Column(
                  children: [
                    // Stepper status banner
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: _buildStepper(),
                    ),

                    // OTP display box (only if paid)
                    if (_deliveryOtp != null && _orderData?['payment_status'] == 'paid' && _shipmentStatus != 'delivered')
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: const [
                                      Icon(Icons.vpn_key, size: 16, color: Colors.amber),
                                      SizedBox(width: 4),
                                      Text('YOUR DELIVERY OTP', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber)),
                                    ],
                                  ),
                                  const Text('Share only upon inspecting delivery.', style: TextStyle(fontSize: 9, color: Colors.black54)),
                                ],
                              ),
                              Text(
                                _deliveryOtp!,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 2.0, color: Colors.amber),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Map View
                    Expanded(
                      child: Stack(
                        children: [
                          FlutterMap(
                            options: MapOptions(
                              initialCenter: mapCenter,
                              initialZoom: 8.0,
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.kisanconnect.marketplace',
                              ),
                              if (_routePoints.isNotEmpty)
                                PolylineLayer(
                                  polylines: [
                                    Polyline(
                                      points: _routePoints,
                                      color: Colors.blue.shade600,
                                      strokeWidth: 5.0,
                                    ),
                                  ],
                                ),
                              MarkerLayer(
                                markers: [
                                  // Pickup Marker
                                  if (_pickupCoords != null)
                                    Marker(
                                      point: _pickupCoords!,
                                      width: 40,
                                      height: 40,
                                      child: Icon(Icons.location_on, color: Theme.of(context).colorScheme.secondary, size: 36),
                                    ),
                                  // Destination Marker
                                  if (_destCoords != null)
                                    Marker(
                                      point: _destCoords!,
                                      width: 40,
                                      height: 40,
                                      child: const Icon(Icons.flag, color: Colors.red, size: 36),
                                    ),
                                  // Weather Risk Checkpoints
                                  ..._weatherCheckpoints.map((cp) {
                                    final coords = cp['coordinates'] ?? [];
                                    if (coords.length < 2) return const Marker(point: LatLng(0,0), child: SizedBox());
                                    final lat = double.tryParse(coords[0].toString()) ?? 0.0;
                                    final lng = double.tryParse(coords[1].toString()) ?? 0.0;
                                    final risk = cp['risk_level'] ?? 'LOW';
                                    return Marker(
                                      point: LatLng(lat, lng),
                                      width: 32,
                                      height: 32,
                                      child: Tooltip(
                                        message: 'Weather risk: $risk',
                                        child: CircleAvatar(
                                          backgroundColor: _getRiskColor(risk),
                                          radius: 12,
                                          child: const Icon(Icons.cloud, size: 12, color: Colors.white),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ],
                              ),
                            ],
                          ),
                          
                          // Floating Recalculate Button
                          if (_shipmentStatus != 'delivered' && _shipmentStatus != 'cancelled' && _shipmentId != null)
                            Positioned(
                              bottom: 16,
                              right: 16,
                              child: FloatingActionButton.extended(
                                backgroundColor: Theme.of(context).primaryColor,
                                icon: const Icon(Icons.alt_route, color: Colors.white),
                                label: const Text('Recalculate Route', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                onPressed: _recalculateRoute,
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
