import 'package:flutter/material.dart';
import '../services/api_service.dart';

// --- MODELS ---

class FarmerStats {
  final double totalEarnings;
  final int activeListingsCount;
  final int totalOrdersCount;
  final int pendingQuotesCount;
  final int trustScore;
  final double mandiAdvantage;

  FarmerStats({
    required this.totalEarnings,
    required this.activeListingsCount,
    required this.totalOrdersCount,
    required this.pendingQuotesCount,
    this.trustScore = 96,
    this.mandiAdvantage = 3.50,
  });

  factory FarmerStats.fromJson(Map<String, dynamic> json) {
    return FarmerStats(
      totalEarnings: (json['total_earnings'] ?? json['revenue'] ?? 84250.0).toDouble(),
      activeListingsCount: json['active_listings_count'] ?? json['active_listings'] ?? 5,
      totalOrdersCount: json['total_orders_count'] ?? json['orders_count'] ?? 14,
      pendingQuotesCount: json['pending_quotes_count'] ?? json['quotes_count'] ?? 4,
      trustScore: json['trust_score'] ?? 96,
      mandiAdvantage: (json['mandi_advantage'] ?? 3.50).toDouble(),
    );
  }
}

class FarmerCrop {
  final String id;
  final String title;
  final String category;
  final double pricePerKg;
  final double availableQuantityKg;
  final double mandiBenchmarkPrice;
  final double freshnessScore;
  final String harvestDate;
  final bool isColdStorage;
  final String imageUrl;
  final String description;
  final String sourceLand;

  FarmerCrop({
    required this.id,
    required this.title,
    required this.category,
    required this.pricePerKg,
    required this.availableQuantityKg,
    required this.mandiBenchmarkPrice,
    required this.freshnessScore,
    required this.harvestDate,
    this.isColdStorage = false,
    required this.imageUrl,
    this.description = '',
    this.sourceLand = '',
  });

  FarmerCrop copyWith({
    String? id,
    String? title,
    String? category,
    double? pricePerKg,
    double? availableQuantityKg,
    double? mandiBenchmarkPrice,
    double? freshnessScore,
    String? harvestDate,
    bool? isColdStorage,
    String? imageUrl,
    String? description,
    String? sourceLand,
  }) {
    return FarmerCrop(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      pricePerKg: pricePerKg ?? this.pricePerKg,
      availableQuantityKg: availableQuantityKg ?? this.availableQuantityKg,
      mandiBenchmarkPrice: mandiBenchmarkPrice ?? this.mandiBenchmarkPrice,
      freshnessScore: freshnessScore ?? this.freshnessScore,
      harvestDate: harvestDate ?? this.harvestDate,
      isColdStorage: isColdStorage ?? this.isColdStorage,
      imageUrl: imageUrl ?? this.imageUrl,
      description: description ?? this.description,
      sourceLand: sourceLand ?? this.sourceLand,
    );
  }

  factory FarmerCrop.fromJson(Map<String, dynamic> json) {
    return FarmerCrop(
      id: json['id']?.toString() ?? 'c_${DateTime.now().millisecondsSinceEpoch}',
      title: json['name'] ?? json['title'] ?? 'Crop',
      category: json['category'] ?? 'Vegetables',
      pricePerKg: (json['price'] ?? json['price_per_kg'] ?? 30.0).toDouble(),
      availableQuantityKg: (json['quantity'] ?? json['available_quantity'] ?? 100.0).toDouble(),
      mandiBenchmarkPrice: (json['mandi_benchmark_price'] ?? (json['price'] ?? 30.0) * 0.9).toDouble(),
      freshnessScore: (json['freshness_score'] ?? 95.0).toDouble(),
      harvestDate: json['harvest_date'] ?? 'Fresh Harvest',
      isColdStorage: json['is_cold_storage'] ?? false,
      imageUrl: json['image'] ?? json['image_url'] ?? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
      description: json['description'] ?? '',
      sourceLand: json['source_land'] ?? '',
    );
  }
}

class FarmerOrder {
  final String id;
  final String buyerName;
  final String buyerPhone;
  final String buyerRole; // 'consumer' | 'bulk_buyer'
  final String channel; // 'retail' | 'wholesale'
  final String productTitle;
  final double quantityKg;
  final double totalAmount;
  String status; // 'pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'
  final String date;
  final String deliveryAddress;
  final String driverName;
  final String driverPhone;
  final String paymentStatus; // 'paid' | 'pending'

  FarmerOrder({
    required this.id,
    required this.buyerName,
    required this.buyerPhone,
    required this.buyerRole,
    required this.channel,
    required this.productTitle,
    required this.quantityKg,
    required this.totalAmount,
    required this.status,
    required this.date,
    required this.deliveryAddress,
    this.driverName = 'Suresh Driver (GJT-88)',
    this.driverPhone = '+91 97766 55443',
    this.paymentStatus = 'paid',
  });

  factory FarmerOrder.fromJson(Map<String, dynamic> json) {
    final buyer = json['buyer'] ?? {};
    final isWholesale = json['channel'] == 'wholesale' || buyer['role'] == 'bulk_buyer';

    return FarmerOrder(
      id: json['id']?.toString() ?? 'ord_101',
      buyerName: buyer['name'] ?? buyer['username'] ?? 'Shopper Buyer',
      buyerPhone: buyer['phone'] ?? '+91 98765 00000',
      buyerRole: isWholesale ? 'bulk_buyer' : 'consumer',
      channel: isWholesale ? 'wholesale' : 'retail',
      productTitle: json['product_title'] ?? 'Organic Tomatoes',
      quantityKg: (json['quantity'] ?? 50.0).toDouble(),
      totalAmount: (json['total_amount'] ?? 1600.0).toDouble(),
      status: json['status'] ?? 'pending',
      date: json['created_at']?.toString().split('T').first ?? 'Today',
      deliveryAddress: json['delivery_address'] ?? 'Pune, Maharashtra',
      driverName: json['driver_name'] ?? 'Suresh Logistics Driver',
      driverPhone: json['driver_phone'] ?? '+91 97766 55443',
      paymentStatus: json['payment_status'] ?? 'paid',
    );
  }
}

class WholesaleQuote {
  final String id;
  final String buyerName;
  final String cropName;
  final double requestedQuantityKg;
  final double offeredPricePerKg;
  final double marketPricePerKg;
  String status; // 'pending' | 'accepted' | 'rejected' | 'countered'
  double? counterPrice;
  final String deliveryDeadline;

  WholesaleQuote({
    required this.id,
    required this.buyerName,
    required this.cropName,
    required this.requestedQuantityKg,
    required this.offeredPricePerKg,
    required this.marketPricePerKg,
    this.status = 'pending',
    this.counterPrice,
    required this.deliveryDeadline,
  });

  factory WholesaleQuote.fromJson(Map<String, dynamic> json) {
    return WholesaleQuote(
      id: json['id']?.toString() ?? 'q_1',
      buyerName: json['buyer_name'] ?? 'Reliance Fresh Wholesale',
      cropName: json['crop_name'] ?? 'Organic Tomatoes',
      requestedQuantityKg: (json['quantity'] ?? 1000.0).toDouble(),
      offeredPricePerKg: (json['offered_price'] ?? 28.0).toDouble(),
      marketPricePerKg: (json['market_price'] ?? 32.0).toDouble(),
      status: json['status'] ?? 'pending',
      counterPrice: json['counter_price'] != null ? (json['counter_price']).toDouble() : null,
      deliveryDeadline: json['deadline'] ?? '3 Days',
    );
  }
}

class BulkDemand {
  final String id;
  final String buyerName;
  final String cropName;
  final double targetQuantityKg;
  final double targetPricePerKg;
  final String deadline;
  final String deliveryLocation;
  final String notes;

  BulkDemand({
    required this.id,
    required this.buyerName,
    required this.cropName,
    required this.targetQuantityKg,
    required this.targetPricePerKg,
    required this.deadline,
    required this.deliveryLocation,
    this.notes = '',
  });

  factory BulkDemand.fromJson(Map<String, dynamic> json) {
    return BulkDemand(
      id: json['id']?.toString() ?? 'bd_1',
      buyerName: json['buyer_name'] ?? 'BigBasket Regional Hub',
      cropName: json['crop_name'] ?? 'Red Onions',
      targetQuantityKg: (json['quantity_required'] ?? 2500.0).toDouble(),
      targetPricePerKg: (json['target_price'] ?? 26.50).toDouble(),
      deadline: json['delivery_deadline'] ?? 'Oct 15, 2026',
      deliveryLocation: json['location'] ?? 'Vashi APMC Mandi, Mumbai',
      notes: json['notes'] ?? 'Grade A uniform size required',
    );
  }
}

class FarmerOffer {
  final String id;
  final String demandId;
  final String cropName;
  final double proposedQtyKg;
  final double proposedPricePerKg;
  final String deliveryDate;
  String status; // 'pending' | 'accepted' | 'rejected'

  FarmerOffer({
    required this.id,
    required this.demandId,
    required this.cropName,
    required this.proposedQtyKg,
    required this.proposedPricePerKg,
    required this.deliveryDate,
    this.status = 'pending',
  });

  factory FarmerOffer.fromJson(Map<String, dynamic> json) {
    return FarmerOffer(
      id: json['id']?.toString() ?? 'fo_1',
      demandId: json['requirement']?.toString() ?? 'bd_1',
      cropName: json['crop_name'] ?? 'Red Onions',
      proposedQtyKg: (json['offered_quantity'] ?? 1500.0).toDouble(),
      proposedPricePerKg: (json['offered_price'] ?? 27.0).toDouble(),
      deliveryDate: json['proposed_delivery_date'] ?? 'Oct 12, 2026',
      status: json['status'] ?? 'pending',
    );
  }
}

class PreHarvestContract {
  final String id;
  final String buyerName;
  final String cropName;
  final double quantityKg;
  final double guaranteedPricePerKg;
  final String deliveryDate;
  final String advancePaymentStatus;
  String status;

  PreHarvestContract({
    required this.id,
    required this.buyerName,
    required this.cropName,
    required this.quantityKg,
    required this.guaranteedPricePerKg,
    required this.deliveryDate,
    required this.advancePaymentStatus,
    this.status = 'active',
  });

  factory PreHarvestContract.fromJson(Map<String, dynamic> json) {
    return PreHarvestContract(
      id: json['id']?.toString() ?? 'c_1',
      buyerName: json['buyer_name'] ?? 'ITC Agri Business Division',
      cropName: json['crop_name'] ?? 'Sharbati Wheat (Grade 1)',
      quantityKg: (json['contract_quantity'] ?? 5000.0).toDouble(),
      guaranteedPricePerKg: (json['guaranteed_price'] ?? 34.0).toDouble(),
      deliveryDate: json['harvest_delivery_date'] ?? 'Nov 20, 2026',
      advancePaymentStatus: json['advance_status'] ?? 'Paid 30% Advance',
      status: json['status'] ?? 'active',
    );
  }
}

class MandiPrice {
  final String mandiName;
  final String district;
  final String cropName;
  final double modalPrice;
  final double minPrice;
  final double maxPrice;
  final String priceTrend; // 'up', 'down', 'stable'
  final String date;
  final double distanceKm;

  MandiPrice({
    required this.mandiName,
    required this.district,
    required this.cropName,
    required this.modalPrice,
    required this.minPrice,
    required this.maxPrice,
    required this.priceTrend,
    required this.date,
    this.distanceKm = 14.5,
  });

  factory MandiPrice.fromJson(Map<String, dynamic> json) {
    return MandiPrice(
      mandiName: json['market_name'] ?? json['mandi'] ?? 'Pune APMC',
      district: json['district'] ?? 'Pune',
      cropName: json['commodity'] ?? json['crop_name'] ?? 'Tomato',
      modalPrice: (json['modal_price'] ?? 28.50).toDouble(),
      minPrice: (json['min_price'] ?? 25.00).toDouble(),
      maxPrice: (json['max_price'] ?? 32.00).toDouble(),
      priceTrend: json['trend'] ?? 'up',
      date: json['arrival_date'] ?? 'Today',
      distanceKm: (json['distance_km'] ?? 14.5).toDouble(),
    );
  }
}

class FarmProfileData {
  String farmName;
  double totalAcres;
  String irrigationMethod;
  String soilType;
  String primaryCrops;
  String gpsCoordinates;
  String bankAccountNumber;
  String bankIfsc;
  String upiId;

  FarmProfileData({
    this.farmName = 'Patil Organic Agro Farms',
    this.totalAcres = 12.0,
    this.irrigationMethod = 'Drip Irrigation & Rainfed',
    this.soilType = 'Black Loamy Soil (Soil Health Card Active)',
    this.primaryCrops = 'Tomatoes, Red Onions, Sharbati Wheat, Mangoes',
    this.gpsCoordinates = '20.005900, 73.789800',
    this.bankAccountNumber = '•••• •••• 4492',
    this.bankIfsc = 'SBIN0001423',
    this.upiId = 'ramesh.farmer@okhdfcbank',
  });
}

class FarmerNotificationItem {
  final String id;
  final String title;
  final String message;
  final String time;
  final String type; // 'offer', 'contract', 'dispatch', 'weather'
  bool isRead;

  FarmerNotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.type,
    this.isRead = false,
  });
}

// --- PROVIDER ---

class FarmerProvider with ChangeNotifier {
  bool _isLoading = false;
  bool get isLoading => _isLoading;

  FarmerStats _stats = FarmerStats(
    totalEarnings: 84250.0,
    activeListingsCount: 4,
    totalOrdersCount: 14,
    pendingQuotesCount: 3,
    trustScore: 96,
    mandiAdvantage: 3.50,
  );
  FarmerStats get stats => _stats;

  // Freshness & Spoilage Alert
  bool _dismissedFreshnessAlert = false;
  bool get showFreshnessAlert => !_dismissedFreshnessAlert && _crops.any((c) => c.freshnessScore <= 40);

  void dismissFreshnessAlert() {
    _dismissedFreshnessAlert = true;
    notifyListeners();
  }

  // Crops
  final List<FarmerCrop> _crops = [
    FarmerCrop(
      id: 'c1',
      title: 'Organic Hybrid Tomatoes',
      category: 'Vegetables',
      pricePerKg: 32.0,
      availableQuantityKg: 650.0,
      mandiBenchmarkPrice: 28.5,
      freshnessScore: 94.0,
      harvestDate: 'Harvested Today',
      isColdStorage: false,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
      description: 'Hand-picked organic tomatoes from Nashik soil.',
      sourceLand: 'Plot A (4 Acres Drip)',
    ),
    FarmerCrop(
      id: 'c2',
      title: 'Nashik Red Onions (Export Grade)',
      category: 'Vegetables',
      pricePerKg: 29.0,
      availableQuantityKg: 1800.0,
      mandiBenchmarkPrice: 26.0,
      freshnessScore: 88.0,
      harvestDate: '2 Days Ago',
      isColdStorage: true,
      imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop',
      description: 'Dry cured medium red onions ready for long-haul shipping.',
      sourceLand: 'Plot B (6 Acres)',
    ),
    FarmerCrop(
      id: 'c3',
      title: 'Traditional Sharbati Wheat',
      category: 'Grains',
      pricePerKg: 36.5,
      availableQuantityKg: 3200.0,
      mandiBenchmarkPrice: 33.0,
      freshnessScore: 98.0,
      harvestDate: 'Season Harvest',
      isColdStorage: false,
      imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop',
      description: 'Golden polished whole wheat grains with high protein.',
      sourceLand: 'Farm Zone 2',
    ),
    FarmerCrop(
      id: 'c4',
      title: 'Alphonso Mangoes (GI Tagged)',
      category: 'Fruits',
      pricePerKg: 180.0,
      availableQuantityKg: 240.0,
      mandiBenchmarkPrice: 165.0,
      freshnessScore: 38.0, // Triggers low freshness / spoilage alert for demo
      harvestDate: '4 Days Ago',
      isColdStorage: false,
      imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop',
      description: 'Naturally ripened carbide-free Ratnagiri Alphonsos.',
      sourceLand: 'Orchard South',
    ),
  ];
  List<FarmerCrop> get crops => _crops;

  // Orders
  List<FarmerOrder> _orders = [
    FarmerOrder(
      id: 'ORD-9842',
      buyerName: 'Priya Sharma (Retail Consumer)',
      buyerPhone: '+91 91234 56789',
      buyerRole: 'consumer',
      channel: 'retail',
      productTitle: 'Organic Hybrid Tomatoes',
      quantityKg: 25.0,
      totalAmount: 800.0,
      status: 'pending',
      date: 'Today, 10:30 AM',
      deliveryAddress: 'B-402, Shivajinagar, Pune',
      driverName: 'Suresh Express Delivery',
      driverPhone: '+91 97766 55443',
    ),
    FarmerOrder(
      id: 'ORD-9841',
      buyerName: 'Reliance Agro Wholesale B2B',
      buyerPhone: '+91 99887 76655',
      buyerRole: 'bulk_buyer',
      channel: 'wholesale',
      productTitle: 'Nashik Red Onions (Export Grade)',
      quantityKg: 500.0,
      totalAmount: 14500.0,
      status: 'confirmed',
      date: 'Yesterday',
      deliveryAddress: 'Logistics Hub 4, Chakan Industrial, Pune',
      driverName: 'GJT-88 Heavy Tempo Fleet',
      driverPhone: '+91 98221 44332',
    ),
    FarmerOrder(
      id: 'ORD-9839',
      buyerName: 'FreshBasket Hypermarket',
      buyerPhone: '+91 98111 22334',
      buyerRole: 'bulk_buyer',
      channel: 'wholesale',
      productTitle: 'Traditional Sharbati Wheat',
      quantityKg: 1000.0,
      totalAmount: 36500.0,
      status: 'dispatched',
      date: '2 Days Ago',
      deliveryAddress: 'Central Warehouse, Hadapsar, Pune',
      driverName: 'Kheda Express Truck',
      driverPhone: '+91 97766 55443',
    ),
    FarmerOrder(
      id: 'ORD-9835',
      buyerName: 'Amit Verma (Direct Shopper)',
      buyerPhone: '+91 98450 12345',
      buyerRole: 'consumer',
      channel: 'retail',
      productTitle: 'Alphonso Mangoes',
      quantityKg: 10.0,
      totalAmount: 1800.0,
      status: 'delivered',
      date: '3 Days Ago',
      deliveryAddress: 'Kothrud, Pune',
      driverName: 'Local Bike Courier',
      driverPhone: '+91 94220 88776',
    ),
  ];
  List<FarmerOrder> get orders => _orders;

  // Wholesale Quotes (Bids)
  List<WholesaleQuote> _quotes = [
    WholesaleQuote(
      id: 'Q-401',
      buyerName: 'FreshMart Supermarkets',
      cropName: 'Organic Hybrid Tomatoes',
      requestedQuantityKg: 800.0,
      offeredPricePerKg: 30.50,
      marketPricePerKg: 32.0,
      status: 'pending',
      deliveryDeadline: 'Tomorrow Evening',
    ),
    WholesaleQuote(
      id: 'Q-402',
      buyerName: 'Zomato Hyperpure Agro',
      cropName: 'Nashik Red Onions',
      requestedQuantityKg: 1500.0,
      offeredPricePerKg: 27.00,
      marketPricePerKg: 29.0,
      status: 'pending',
      deliveryDeadline: 'Within 3 Days',
    ),
    WholesaleQuote(
      id: 'Q-398',
      buyerName: 'Haldiram Foods Procurements',
      cropName: 'Traditional Sharbati Wheat',
      requestedQuantityKg: 3000.0,
      offeredPricePerKg: 35.00,
      marketPricePerKg: 36.5,
      status: 'countered',
      counterPrice: 36.00,
      deliveryDeadline: 'End of Month',
    ),
  ];
  List<WholesaleQuote> get quotes => _quotes;

  // Bulk Demands (Reverse Sourcing)
  List<BulkDemand> _bulkDemands = [
    BulkDemand(
      id: 'BD-88',
      buyerName: 'Haldiram Snacks & Sweets',
      cropName: 'Yellow Mustard Seeds / Sarson',
      targetQuantityKg: 5000.0,
      targetPricePerKg: 54.0,
      deadline: 'Oct 25, 2026',
      deliveryLocation: 'Nagpur Processing Plant',
      notes: 'Cleaned, moisture content < 8%, direct farm origin required.',
    ),
    BulkDemand(
      id: 'BD-89',
      buyerName: 'Mother Dairy Fresh Produce',
      cropName: 'Grade-A Processing Tomatoes',
      targetQuantityKg: 8000.0,
      targetPricePerKg: 28.0,
      deadline: 'Oct 18, 2026',
      deliveryLocation: 'Navi Mumbai Cold Storage Facility',
      notes: 'Brix > 4.5, uniform firmness for puree and ketchup line.',
    ),
    BulkDemand(
      id: 'BD-90',
      buyerName: 'Nafed FPO Sourcing Grid',
      cropName: 'Chana / Desi Chickpeas',
      targetQuantityKg: 10000.0,
      targetPricePerKg: 58.50,
      deadline: 'Nov 05, 2026',
      deliveryLocation: 'Nashik Central Godown',
      notes: 'Govt backed procurement with 48h DBT direct payment guarantee.',
    ),
  ];
  List<BulkDemand> get bulkDemands => _bulkDemands;

  // Farmer's Submitted Offers
  List<FarmerOffer> _myOffers = [
    FarmerOffer(
      id: 'FO-12',
      demandId: 'BD-89',
      cropName: 'Grade-A Processing Tomatoes',
      proposedQtyKg: 3000.0,
      proposedPricePerKg: 29.50,
      deliveryDate: 'Oct 17, 2026',
      status: 'pending',
    ),
  ];
  List<FarmerOffer> get myOffers => _myOffers;

  // Pre-Harvest Contracts
  List<PreHarvestContract> _contracts = [
    PreHarvestContract(
      id: 'CON-501',
      buyerName: 'ITC Agri Business Division',
      cropName: 'Aged Basmati Rice 1121 (Raw)',
      quantityKg: 6000.0,
      guaranteedPricePerKg: 42.0,
      deliveryDate: 'Dec 15, 2026',
      advancePaymentStatus: 'Paid 30% Advance (₹75,600 in Escrow)',
      status: 'active',
    ),
    PreHarvestContract(
      id: 'CON-488',
      buyerName: 'Patanjali Organic Foods',
      cropName: 'Organic Yellow Mustard',
      quantityKg: 4000.0,
      guaranteedPricePerKg: 55.0,
      deliveryDate: 'Nov 10, 2026',
      advancePaymentStatus: 'Escrow Locked (100% Guaranteed)',
      status: 'active',
    ),
  ];
  List<PreHarvestContract> get contracts => _contracts;

  // Mandi Benchmark Prices
  List<MandiPrice> _mandiPrices = [
    MandiPrice(
      mandiName: 'Pune APMC (Gultekdi)',
      district: 'Pune',
      cropName: 'Tomato',
      modalPrice: 28.50,
      minPrice: 24.00,
      maxPrice: 32.00,
      priceTrend: 'up',
      date: 'Today (Live)',
    ),
    MandiPrice(
      mandiName: 'Nashik APMC (Pimplegaon)',
      district: 'Nashik',
      cropName: 'Red Onion',
      modalPrice: 26.00,
      minPrice: 22.00,
      maxPrice: 28.50,
      priceTrend: 'up',
      date: 'Today (Live)',
    ),
    MandiPrice(
      mandiName: 'Vashi APMC (Navi Mumbai)',
      district: 'Mumbai',
      cropName: 'Wheat (Sharbati)',
      modalPrice: 33.00,
      minPrice: 30.00,
      maxPrice: 36.00,
      priceTrend: 'stable',
      date: 'Today (Live)',
    ),
    MandiPrice(
      mandiName: 'Anand APMC',
      district: 'Anand',
      cropName: 'Alphonso Mango',
      modalPrice: 165.00,
      minPrice: 140.00,
      maxPrice: 190.00,
      priceTrend: 'down',
      date: 'Today (Live)',
    ),
  ];
  List<MandiPrice> get mandiPrices => _mandiPrices;

  // Notifications
  final List<FarmerNotificationItem> _notifications = [
    FarmerNotificationItem(
      id: 'n1',
      title: 'New Wholesale Bid Received',
      message: 'FreshMart offered ₹30.50/kg for 800 kg Organic Tomatoes.',
      time: '12m ago',
      type: 'offer',
      isRead: false,
    ),
    FarmerNotificationItem(
      id: 'n2',
      title: 'Order ORD-9841 Confirmed',
      message: 'Reliance Wholesale accepted pickup. Driver Suresh assigned.',
      time: '1h ago',
      type: 'dispatch',
      isRead: false,
    ),
    FarmerNotificationItem(
      id: 'n3',
      title: 'Pre-Harvest Contract Active',
      message: 'ITC Agro deposited ₹75,600 advance into Escrow.',
      time: '4h ago',
      type: 'contract',
      isRead: false,
    ),
    FarmerNotificationItem(
      id: 'n4',
      title: 'Weather Warning: Moderate Showers',
      message: 'Expected rainfall in Nashik district tomorrow. Move harvested lots to dry shelter.',
      time: '1d ago',
      type: 'weather',
      isRead: true,
    ),
  ];
  List<FarmerNotificationItem> get notifications => _notifications;

  int get unreadNotificationsCount => _notifications.where((n) => !n.isRead).length;

  void markAllNotificationsAsRead() {
    for (var n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
  }

  // --- ACTIONS ---

  Future<void> fetchDashboardData(String? token) async {
    _isLoading = true;
    notifyListeners();

    try {
      final fetchedStats = await ApiService.fetchFarmerStats(token);
      if (fetchedStats != null) {
        _stats = FarmerStats.fromJson(fetchedStats);
      }

      final fetchedOrders = await ApiService.fetchFarmerOrders(token);
      if (fetchedOrders.isNotEmpty) {
        _orders = fetchedOrders.map((o) => FarmerOrder.fromJson(o)).toList();
      }

      final fetchedQuotes = await ApiService.fetchFarmerQuotes(token);
      if (fetchedQuotes.isNotEmpty) {
        _quotes = fetchedQuotes.map((q) => WholesaleQuote.fromJson(q)).toList();
      }

      final fetchedDemands = await ApiService.fetchBulkRequirements(token);
      if (fetchedDemands.isNotEmpty) {
        _bulkDemands = fetchedDemands.map((b) => BulkDemand.fromJson(b)).toList();
      }

      final fetchedOffers = await ApiService.fetchFarmerOffers(token);
      if (fetchedOffers.isNotEmpty) {
        _myOffers = fetchedOffers.map((f) => FarmerOffer.fromJson(f)).toList();
      }

      final fetchedContracts = await ApiService.fetchPreHarvestContracts(token);
      if (fetchedContracts.isNotEmpty) {
        _contracts = fetchedContracts.map((c) => PreHarvestContract.fromJson(c)).toList();
      }

      final fetchedMarkets = await ApiService.fetchMarketPrices(token);
      if (fetchedMarkets.isNotEmpty) {
        _mandiPrices = fetchedMarkets.map((m) => MandiPrice.fromJson(m)).toList();
      }
    } catch (_) {
      // Graceful fallback to initial realistic demo data
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Farm Profile Data
  FarmProfileData _profile = FarmProfileData();
  FarmProfileData get profile => _profile;

  void updateFarmProfile({
    required String farmName,
    required double totalAcres,
    required String irrigationMethod,
    required String soilType,
    required String primaryCrops,
    required String bankAccount,
    required String ifsc,
    required String upi,
  }) {
    _profile = FarmProfileData(
      farmName: farmName,
      totalAcres: totalAcres,
      irrigationMethod: irrigationMethod,
      soilType: soilType,
      primaryCrops: primaryCrops,
      gpsCoordinates: _profile.gpsCoordinates,
      bankAccountNumber: bankAccount,
      bankIfsc: ifsc,
      upiId: upi,
    );
    notifyListeners();
  }

  // Add / Edit Crop
  Future<bool> addCrop(FarmerCrop crop, String? token) async {
    final payload = {
      'name': crop.title,
      'category': crop.category,
      'price': crop.pricePerKg,
      'quantity': crop.availableQuantityKg,
      'harvest_date': crop.harvestDate,
      'is_cold_storage': crop.isColdStorage,
      'description': crop.description,
      'source_land': crop.sourceLand,
    };

    final success = await ApiService.createProduct(payload, token);
    _crops.insert(0, crop);
    notifyListeners();
    return success;
  }

  Future<bool> editCrop(FarmerCrop crop, String? token) async {
    final idx = _crops.indexWhere((c) => c.id == crop.id);
    if (idx != -1) {
      _crops[idx] = crop;
      notifyListeners();
    }
    return true;
  }

  void updateCropPrice(String cropId, double newPrice) {
    final idx = _crops.indexWhere((c) => c.id == cropId);
    if (idx != -1) {
      _crops[idx] = _crops[idx].copyWith(pricePerKg: newPrice);
      notifyListeners();
    }
  }

  Future<bool> deleteCrop(String cropId, String? token) async {
    _crops.removeWhere((c) => c.id == cropId);
    notifyListeners();
    return await ApiService.deleteProduct(cropId, token);
  }

  // Update Order Status
  Future<bool> updateOrderStatus(String orderId, String newStatus, String? token) async {
    final idx = _orders.indexWhere((o) => o.id == orderId);
    if (idx != -1) {
      _orders[idx].status = newStatus;
      notifyListeners();
    }
    return await ApiService.updateOrderStatus(orderId, newStatus, token);
  }

  // Quotes Actions
  Future<bool> acceptQuote(String quoteId, String? token) async {
    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].status = 'accepted';
      notifyListeners();
    }
    return await ApiService.respondToQuote(quoteId, {'status': 'accepted'}, token);
  }

  Future<bool> rejectQuote(String quoteId, String? token) async {
    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].status = 'rejected';
      notifyListeners();
    }
    return await ApiService.respondToQuote(quoteId, {'status': 'rejected'}, token);
  }

  Future<bool> counterQuote(String quoteId, double counterPrice, String? token) async {
    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].status = 'countered';
      _quotes[idx].counterPrice = counterPrice;
      notifyListeners();
    }
    return await ApiService.respondToQuote(quoteId, {'status': 'countered', 'counter_price': counterPrice}, token);
  }

  // Submit Offer to Bulk Demand
  Future<bool> submitOffer({
    required String demandId,
    required String cropName,
    required double proposedQty,
    required double proposedPrice,
    required String deliveryDate,
    String? token,
  }) async {
    final newOffer = FarmerOffer(
      id: 'fo_${DateTime.now().millisecondsSinceEpoch}',
      demandId: demandId,
      cropName: cropName,
      proposedQtyKg: proposedQty,
      proposedPricePerKg: proposedPrice,
      deliveryDate: deliveryDate,
      status: 'pending',
    );

    _myOffers.insert(0, newOffer);
    notifyListeners();

    return await ApiService.submitFarmerOffer({
      'requirement': demandId,
      'offered_quantity': proposedQty,
      'offered_price': proposedPrice,
      'proposed_delivery_date': deliveryDate,
    }, token);
  }

  // Propose Pre-Harvest Contract
  Future<bool> proposeContract({
    required String cropName,
    required double quantity,
    required double guaranteedPrice,
    required String harvestDate,
    String? token,
  }) async {
    final newContract = PreHarvestContract(
      id: 'con_${DateTime.now().millisecondsSinceEpoch}',
      buyerName: 'Open to Food Processors & Retail Chains',
      cropName: cropName,
      quantityKg: quantity,
      guaranteedPricePerKg: guaranteedPrice,
      deliveryDate: harvestDate,
      advancePaymentStatus: 'Pending Buyer Sign-off',
      status: 'draft',
    );

    _contracts.insert(0, newContract);
    notifyListeners();

    return await ApiService.createPreHarvestContract({
      'crop_name': cropName,
      'contract_quantity': quantity,
      'guaranteed_price': guaranteedPrice,
      'harvest_delivery_date': harvestDate,
    }, token);
  }

  // Submit KYC Document
  Future<bool> submitKyc(String documentTypeOrBase64, String? token) async {
    final success = await ApiService.submitKycDocument(documentTypeOrBase64, token);
    _stats = FarmerStats(
      totalEarnings: _stats.totalEarnings,
      activeListingsCount: _stats.activeListingsCount,
      totalOrdersCount: _stats.totalOrdersCount,
      pendingQuotesCount: _stats.pendingQuotesCount,
      trustScore: 98,
      mandiAdvantage: _stats.mandiAdvantage,
    );
    notifyListeners();
    return success;
  }
}
