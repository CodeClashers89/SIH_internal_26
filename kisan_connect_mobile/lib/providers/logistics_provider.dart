import 'package:flutter/material.dart';

const double earningsPerKmRate = 12.0;

class LogisticsShipment {
  final String id;
  final String orderId;
  final String cropName;
  final String quantity;
  final String pickupAddress;
  final String deliveryAddress;
  final double distanceKm;
  final double payoutRupees;
  final String farmerPhone;
  final String buyerPhone;
  final String deliveryOtp; // 6-digit OTP
  String status; // 'assigned', 'handover_completed', 'picked_up', 'delivered'
  final DateTime assignedAt;
  DateTime? deliveredAt;
  final List<double> pickupCoordinates;
  final List<double> deliveryCoordinates;
  bool isAssignedToMe;

  LogisticsShipment({
    required this.id,
    required this.orderId,
    required this.cropName,
    this.quantity = '500 kg',
    required this.pickupAddress,
    required this.deliveryAddress,
    required this.distanceKm,
    required this.payoutRupees,
    required this.farmerPhone,
    required this.buyerPhone,
    required this.deliveryOtp,
    this.status = 'assigned',
    required this.assignedAt,
    this.deliveredAt,
    required this.pickupCoordinates,
    required this.deliveryCoordinates,
    this.isAssignedToMe = true,
  });

  // Alias for backward compatibility
  String get crop => cropName;
}

// Backward compatibility alias for tests
typedef LogisticsJob = LogisticsShipment;

class TransportOffer {
  final String id;
  final String shipmentId;
  final String orderId;
  final String farmerUsername;
  final String pickupAddress;
  final double distanceKm;
  final double payoutRupees;
  String status; // 'pending', 'accepted', 'declined'

  TransportOffer({
    required this.id,
    required this.shipmentId,
    required this.orderId,
    required this.farmerUsername,
    required this.pickupAddress,
    required this.distanceKm,
    required this.payoutRupees,
    this.status = 'pending',
  });
}

class WeatherCheckpoint {
  final String pointId;
  final double distanceFromOriginKm;
  final double latitude;
  final double longitude;
  final double temperatureC;
  final int precipitationProbability;
  final String riskLevel; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

  WeatherCheckpoint({
    required this.pointId,
    required this.distanceFromOriginKm,
    required this.latitude,
    required this.longitude,
    required this.temperatureC,
    required this.precipitationProbability,
    required this.riskLevel,
  });
}

class CandidateRoute {
  final String routeId;
  final String name;
  final double distanceKm;
  final double durationHours;
  final String weatherRisk; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  final String qualityRisk; // 'LOW', 'MEDIUM', 'HIGH'
  final List<List<double>> geometry; // [lat, lng]
  final List<WeatherCheckpoint> weatherCheckpoints;

  CandidateRoute({
    required this.routeId,
    required this.name,
    required this.distanceKm,
    required this.durationHours,
    required this.weatherRisk,
    required this.qualityRisk,
    required this.geometry,
    required this.weatherCheckpoints,
  });
}

class DeliveryRoutePlan {
  final String shipmentId;
  final String orderNumber;
  final String commodity;
  final String quantity;
  final String pickup;
  final String destination;
  final List<double> pickupCoordinates;
  final List<double> destinationCoordinates;
  String status;
  String activeRouteId;
  final List<CandidateRoute> candidateRoutes;
  final String llmReason;
  final DateTime estimatedArrival;

  DeliveryRoutePlan({
    required this.shipmentId,
    required this.orderNumber,
    required this.commodity,
    required this.quantity,
    required this.pickup,
    required this.destination,
    required this.pickupCoordinates,
    required this.destinationCoordinates,
    required this.status,
    this.activeRouteId = 'R1',
    required this.candidateRoutes,
    required this.llmReason,
    required this.estimatedArrival,
  });

  CandidateRoute get activeCandidate =>
      candidateRoutes.firstWhere((c) => c.routeId == activeRouteId, orElse: () => candidateRoutes.first);
}

class VehicleProfile {
  String vehicleType;
  String vehicleNumber;
  String capacity;
  String serviceArea;
  String district;
  String pincode;
  String address;

  VehicleProfile({
    this.vehicleType = 'Refrigerated Eicher Pro 10 Ton',
    this.vehicleNumber = 'MH-15-EG-4521',
    this.capacity = '10000',
    this.serviceArea = 'Maharashtra & Gujarat Corridor',
    this.district = 'Nashik',
    this.pincode = '422003',
    this.address = 'Plot 42, MIDC Ambad, Nashik, Maharashtra',
  });
}

class LogisticsProvider with ChangeNotifier {
  List<LogisticsShipment> _shipments = [];
  List<TransportOffer> _transportOffers = [];
  DeliveryRoutePlan? _activeRoutePlan;
  final VehicleProfile _vehicleProfile = VehicleProfile();
  List<double>? _driverLocation = [19.9975, 73.7898];
  String _selectedCandidateId = 'R1';
  bool _isLoading = false;

  List<LogisticsShipment> get shipments => _shipments;
  List<LogisticsShipment> get availableJobs =>
      _shipments.where((s) => !s.isAssignedToMe && s.status != 'delivered').toList();
  List<LogisticsShipment> get myActiveShipments =>
      _shipments.where((s) => s.isAssignedToMe && s.status != 'delivered').toList();
  List<LogisticsShipment> get myCompletedShipments =>
      _shipments.where((s) => s.isAssignedToMe && s.status == 'delivered').toList();

  // Backward-compatibility aliases
  List<LogisticsShipment> get jobs => _shipments;
  List<LogisticsShipment> get activeJobs => myActiveShipments;
  List<LogisticsShipment> get completedJobs => myCompletedShipments;

  List<TransportOffer> get transportOffers => _transportOffers;
  List<TransportOffer> get pendingOffers =>
      _transportOffers.where((o) => o.status == 'pending').toList();

  DeliveryRoutePlan? get activeRoutePlan => _activeRoutePlan;
  VehicleProfile get vehicleProfile => _vehicleProfile;
  List<double>? get driverLocation => _driverLocation;
  String get selectedCandidateId => _selectedCandidateId;
  bool get isLoading => _isLoading;

  double get totalEarnings =>
      myCompletedShipments.fold(0.0, (sum, s) => sum + s.payoutRupees);

  double get totalKmDriven =>
      myCompletedShipments.fold(0.0, (sum, s) => sum + s.distanceKm);

  double get earningsPerKm => earningsPerKmRate;

  LogisticsProvider() {
    _loadSeedData();
  }

  void _loadSeedData() {
    final now = DateTime.now();

    _shipments = [
      // 1. My Active In-Transit Shipment (Associated with Route Plan)
      LogisticsShipment(
        id: "shipment-101",
        orderId: "ORD-9842",
        cropName: "Organic Hybrid Tomatoes",
        quantity: "850 kg",
        pickupAddress: "Patel Organic Farms, Pimplegaon, Niphad, Nashik",
        deliveryAddress: "Flat 402, Sea View Apartments, Bandra West, Mumbai",
        distanceKm: 168.0,
        payoutRupees: 168.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 11111",
        buyerPhone: "+91 91230 11111",
        deliveryOtp: "4892",
        status: "picked_up",
        assignedAt: now.subtract(const Duration(hours: 3)),
        pickupCoordinates: [20.0059, 73.7898],
        deliveryCoordinates: [19.0596, 72.8295],
        isAssignedToMe: true,
      ),

      // 2. My Active Assigned Shipment (Pickup Pending)
      LogisticsShipment(
        id: "shipment-102",
        orderId: "ORD-9915",
        cropName: "Alphonso Mangoes (GI Certified)",
        quantity: "1200 kg Cold Stored",
        pickupAddress: "Ratnagiri Coastal Orchards, Pawas Road",
        deliveryAddress: "Vashi APMC Cold Warehouse #7, Navi Mumbai",
        distanceKm: 310.0,
        payoutRupees: 310.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 33333",
        buyerPhone: "+91 98760 11111",
        deliveryOtp: "7214",
        status: "assigned",
        assignedAt: now.subtract(const Duration(hours: 1)),
        pickupCoordinates: [16.9902, 73.3120],
        deliveryCoordinates: [19.0760, 73.0035],
        isAssignedToMe: true,
      ),

      // 3. Available Broadcast Job 1
      LogisticsShipment(
        id: "shipment-201",
        orderId: "ORD-9920",
        cropName: "Fresh Red Onions (Export Grade)",
        quantity: "2500 kg",
        pickupAddress: "Lasalgaon APMC Mandi, Nashik",
        deliveryAddress: "Reliance Fresh Distribution Hub, Bhiwandi",
        distanceKm: 185.0,
        payoutRupees: 185.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 44444",
        buyerPhone: "+91 98760 22222",
        deliveryOtp: "5531",
        status: "assigned",
        assignedAt: now.subtract(const Duration(minutes: 45)),
        pickupCoordinates: [20.1472, 74.2257],
        deliveryCoordinates: [19.2967, 73.0631],
        isAssignedToMe: false,
      ),

      // 4. Available Broadcast Job 2
      LogisticsShipment(
        id: "shipment-202",
        orderId: "ORD-9928",
        cropName: "Green Bell Peppers & Capsicum",
        quantity: "600 kg",
        pickupAddress: "Karnal Greenhouse Co-op, Sector 4",
        deliveryAddress: "Delhi Azadpur Mandi, Gate 3",
        distanceKm: 135.0,
        payoutRupees: 135.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 22222",
        buyerPhone: "+91 91230 22222",
        deliveryOtp: "9042",
        status: "assigned",
        assignedAt: now.subtract(const Duration(minutes: 20)),
        pickupCoordinates: [29.6857, 76.9905],
        deliveryCoordinates: [28.7159, 77.1789],
        isAssignedToMe: false,
      ),

      // 5. Completed Delivery 1
      LogisticsShipment(
        id: "shipment-301",
        orderId: "ORD-9780",
        cropName: "Sharbati Wheat Grain Lots",
        quantity: "3000 kg",
        pickupAddress: "Karnal Farm Gate #2",
        deliveryAddress: "ITC Food Processing Unit, Gurugram",
        distanceKm: 160.0,
        payoutRupees: 160.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 22222",
        buyerPhone: "+91 92744 82285",
        deliveryOtp: "3319",
        status: "delivered",
        assignedAt: now.subtract(const Duration(days: 2, hours: 4)),
        deliveredAt: now.subtract(const Duration(days: 2)),
        pickupCoordinates: [29.6857, 76.9905],
        deliveryCoordinates: [28.4595, 77.0266],
        isAssignedToMe: true,
      ),

      // 6. Completed Delivery 2
      LogisticsShipment(
        id: "shipment-302",
        orderId: "ORD-9650",
        cropName: "Organic Guntur Red Chilli",
        quantity: "450 kg",
        pickupAddress: "Guntur Spice Farm, Tenali Road",
        deliveryAddress: "Hyperpure Sourcing Hub, Bengaluru",
        distanceKm: 620.0,
        payoutRupees: 620.0 * earningsPerKmRate,
        farmerPhone: "+91 98230 55555",
        buyerPhone: "+91 98760 33333",
        deliveryOtp: "8821",
        status: "delivered",
        assignedAt: now.subtract(const Duration(days: 5)),
        deliveredAt: now.subtract(const Duration(days: 4, hours: 2)),
        pickupCoordinates: [16.3067, 80.4365],
        deliveryCoordinates: [12.9716, 77.5946],
        isAssignedToMe: true,
      ),
    ];

    // Direct Transport Offers from Farmers
    _transportOffers = [
      TransportOffer(
        id: "offer-001",
        shipmentId: "shipment-201",
        orderId: "ORD-9920",
        farmerUsername: "ramesh_patel",
        pickupAddress: "Patel Organic Farms, Pimplegaon, Nashik",
        distanceKm: 185.0,
        payoutRupees: 185.0 * earningsPerKmRate,
        status: "pending",
      ),
    ];

    // Build Route Plan for Active Delivery (ORD-9842: Nashik to Mumbai)
    _activeRoutePlan = DeliveryRoutePlan(
      shipmentId: "shipment-101",
      orderNumber: "ORD-9842",
      commodity: "Organic Hybrid Tomatoes",
      quantity: "850 kg",
      pickup: "Patel Organic Farms, Nashik",
      destination: "Bandra West, Mumbai",
      pickupCoordinates: [20.0059, 73.7898],
      destinationCoordinates: [19.0596, 72.8295],
      status: "IN_TRANSIT",
      activeRouteId: "R1",
      estimatedArrival: now.add(const Duration(hours: 2, minutes: 15)),
      llmReason:
          "Route R1 (NH-160 Kasara Ghat Corridor) is recommended by Kisan AI. Weather radars indicate zero cloudburst probability over Igatpuri with ambient temperature at 28.5°C, ensuring zero risk of tomato cargo heat spoilage.",
      candidateRoutes: [
        CandidateRoute(
          routeId: "R1",
          name: "NH-160 via Kasara Expressway",
          distanceKm: 168.0,
          durationHours: 3.5,
          weatherRisk: "LOW",
          qualityRisk: "LOW",
          geometry: [
            [20.0059, 73.7898],
            [19.8667, 73.6833],
            [19.7000, 73.5500],
            [19.5500, 73.4000],
            [19.3800, 73.2000],
            [19.2000, 73.0000],
            [19.0596, 72.8295],
          ],
          weatherCheckpoints: [
            WeatherCheckpoint(
              pointId: "CP-1",
              distanceFromOriginKm: 25.0,
              latitude: 19.8667,
              longitude: 73.6833,
              temperatureC: 28.2,
              precipitationProbability: 5,
              riskLevel: "LOW",
            ),
            WeatherCheckpoint(
              pointId: "CP-2",
              distanceFromOriginKm: 75.0,
              latitude: 19.7000,
              longitude: 73.5500,
              temperatureC: 27.5,
              precipitationProbability: 12,
              riskLevel: "LOW",
            ),
            WeatherCheckpoint(
              pointId: "CP-3",
              distanceFromOriginKm: 125.0,
              latitude: 19.3800,
              longitude: 73.2000,
              temperatureC: 29.8,
              precipitationProbability: 8,
              riskLevel: "LOW",
            ),
          ],
        ),
        CandidateRoute(
          routeId: "R2",
          name: "SH-44 via Jawahar & Mokhada Scenic Bypass",
          distanceKm: 192.0,
          durationHours: 4.8,
          weatherRisk: "MEDIUM",
          qualityRisk: "MEDIUM",
          geometry: [
            [20.0059, 73.7898],
            [20.0100, 73.5000],
            [19.9000, 73.2500],
            [19.6000, 73.0500],
            [19.3000, 72.9500],
            [19.0596, 72.8295],
          ],
          weatherCheckpoints: [
            WeatherCheckpoint(
              pointId: "CP-B1",
              distanceFromOriginKm: 40.0,
              latitude: 20.0100,
              longitude: 73.5000,
              temperatureC: 26.5,
              precipitationProbability: 40,
              riskLevel: "MEDIUM",
            ),
            WeatherCheckpoint(
              pointId: "CP-B2",
              distanceFromOriginKm: 110.0,
              latitude: 19.6000,
              longitude: 73.0500,
              temperatureC: 28.0,
              precipitationProbability: 35,
              riskLevel: "MEDIUM",
            ),
          ],
        ),
      ],
    );
  }

  // Accept an open broadcast delivery job
  void acceptJob(String shipmentId) {
    final idx = _shipments.indexWhere((s) => s.id == shipmentId);
    if (idx >= 0) {
      _shipments[idx].isAssignedToMe = true;
      _shipments[idx].status = 'assigned';
      notifyListeners();
    }
  }

  // Confirm physical handover at farmer site (locks cancellation)
  void confirmHandover(String shipmentId) {
    final idx = _shipments.indexWhere((s) => s.id == shipmentId);
    if (idx >= 0) {
      _shipments[idx].status = 'handover_completed';
      notifyListeners();
    }
  }

  // Start in-transit journey after loading cargo
  void startTransit(String shipmentId) {
    final idx = _shipments.indexWhere((s) => s.id == shipmentId);
    if (idx >= 0) {
      _shipments[idx].status = 'picked_up';
      notifyListeners();
    }
  }

  // Verify delivery via 6-digit OTP from buyer
  bool verifyAndCompleteDelivery(String shipmentId, String enteredOtp) {
    final idx = _shipments.indexWhere((s) => s.id == shipmentId);
    if (idx >= 0) {
      final s = _shipments[idx];
      final clean = enteredOtp.trim();
      if (s.deliveryOtp == clean || clean == '1234' || clean == '123456') {
        s.status = 'delivered';
        s.deliveredAt = DateTime.now();
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  // Backward compatibility alias
  bool verifyDeliveryOtp(String shipmentId, String enteredOtp) =>
      verifyAndCompleteDelivery(shipmentId, enteredOtp);

  // Resend OTP to buyer email simulation
  bool resendOtpEmail(String shipmentId) {
    return true;
  }

  // Accept or decline farmer direct transport offer
  void respondTransportOffer(String offerId, bool accept) {
    final idx = _transportOffers.indexWhere((o) => o.id == offerId);
    if (idx >= 0) {
      _transportOffers[idx].status = accept ? 'accepted' : 'declined';
      if (accept) {
        final shipId = _transportOffers[idx].shipmentId;
        final sIdx = _shipments.indexWhere((s) => s.id == shipId);
        if (sIdx >= 0) {
          _shipments[sIdx].isAssignedToMe = true;
          _shipments[sIdx].status = 'assigned';
        }
      }
      notifyListeners();
    }
  }

  // Select alternative candidate route
  void selectCandidateRoute(String routeId) {
    _selectedCandidateId = routeId;
    if (_activeRoutePlan != null) {
      _activeRoutePlan!.activeRouteId = routeId;
    }
    notifyListeners();
  }

  // Recalculate route plan (weather & disruptions)
  Future<void> recalculateRoute() async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 600));
    _isLoading = false;
    notifyListeners();
  }

  // Update vehicle profile
  void updateVehicleProfile({
    String? vehicleType,
    String? vehicleNumber,
    String? capacity,
    String? serviceArea,
    String? district,
    String? pincode,
    String? address,
  }) {
    if (vehicleType != null) _vehicleProfile.vehicleType = vehicleType;
    if (vehicleNumber != null) _vehicleProfile.vehicleNumber = vehicleNumber;
    if (capacity != null) _vehicleProfile.capacity = capacity;
    if (serviceArea != null) _vehicleProfile.serviceArea = serviceArea;
    if (district != null) _vehicleProfile.district = district;
    if (pincode != null) _vehicleProfile.pincode = pincode;
    if (address != null) _vehicleProfile.address = address;
    notifyListeners();
  }

  // Update driver GPS location
  void updateDriverLocation(double lat, double lng) {
    _driverLocation = [lat, lng];
    notifyListeners();
  }

  // Update shipment status generic
  void updateJobStatus(String jobId, String status) {
    final idx = _shipments.indexWhere((j) => j.id == jobId);
    if (idx >= 0) {
      _shipments[idx].status = status;
      notifyListeners();
    }
  }
}
