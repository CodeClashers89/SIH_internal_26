import 'package:flutter/material.dart';
import '../services/api_service.dart';

// --- Domain Models ---

class B2BProductListing {
  final int id;
  final String name;
  final String category;
  final double quantity;
  final String unit;
  final double pricePerUnit;
  final int? farmerId;
  final String farmerUsername;
  final String district;
  final String state;
  final String? imageUrl;

  B2BProductListing({
    required this.id,
    required this.name,
    required this.category,
    required this.quantity,
    required this.unit,
    required this.pricePerUnit,
    this.farmerId,
    required this.farmerUsername,
    required this.district,
    required this.state,
    this.imageUrl,
  });

  factory B2BProductListing.fromJson(Map<String, dynamic> json) {
    final farmerDetails = json['farmer_details'] as Map<String, dynamic>?;
    return B2BProductListing(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? 'Crop Listing',
      category: json['category']?.toString() ?? 'Vegetables',
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toDouble()
          : double.tryParse(json['quantity']?.toString() ?? '0') ?? 0.0,
      unit: json['unit']?.toString() ?? 'kg',
      pricePerUnit: (json['price_per_unit'] is num)
          ? (json['price_per_unit'] as num).toDouble()
          : double.tryParse(json['price_per_unit']?.toString() ?? '0') ?? 0.0,
      farmerId: farmerDetails?['id'] ?? (json['farmer'] is int ? json['farmer'] : null),
      farmerUsername: farmerDetails?['username']?.toString() ??
          json['farmer_username']?.toString() ??
          'Regional Farmer',
      district: farmerDetails?['district']?.toString() ?? 'Anand',
      state: farmerDetails?['state']?.toString() ?? 'Gujarat',
      imageUrl: json['image']?.toString(),
    );
  }
}

class B2BQuote {
  final String id;
  final int productId;
  final String productName;
  final String productUnit;
  final double quantity;
  double targetPrice;
  double? offeredPrice;
  String status; // 'pending', 'offered', 'accepted', 'rejected'
  final String farmerUsername;
  final String district;
  final DateTime createdAt;

  B2BQuote({
    required this.id,
    required this.productId,
    required this.productName,
    required this.productUnit,
    required this.quantity,
    required this.targetPrice,
    this.offeredPrice,
    required this.status,
    required this.farmerUsername,
    required this.district,
    required this.createdAt,
  });

  factory B2BQuote.fromJson(Map<String, dynamic> json) {
    final prodDetails = json['product_details'] as Map<String, dynamic>?;
    final farmerDetails = prodDetails?['farmer_details'] as Map<String, dynamic>?;

    return B2BQuote(
      id: json['id']?.toString() ?? '',
      productId: json['product'] is int ? json['product'] : int.tryParse(json['product']?.toString() ?? '0') ?? 0,
      productName: prodDetails?['name']?.toString() ?? json['product_name']?.toString() ?? 'Crop Listing',
      productUnit: prodDetails?['unit']?.toString() ?? 'kg',
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toDouble()
          : double.tryParse(json['quantity']?.toString() ?? '0') ?? 0.0,
      targetPrice: (json['target_price'] is num)
          ? (json['target_price'] as num).toDouble()
          : double.tryParse(json['target_price']?.toString() ?? '0') ?? 0.0,
      offeredPrice: json['offered_price'] != null
          ? ((json['offered_price'] is num)
              ? (json['offered_price'] as num).toDouble()
              : double.tryParse(json['offered_price']?.toString() ?? ''))
          : null,
      status: json['status']?.toString().toLowerCase() ?? 'pending',
      farmerUsername: farmerDetails?['username']?.toString() ??
          json['farmer_username']?.toString() ??
          'Farmer',
      district: farmerDetails?['district']?.toString() ?? 'Regional Mandi',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class FarmerOfferItem {
  final String id;
  final String requirementId;
  final String farmerUsername;
  final double quantity;
  final double pricePerUnit;
  final String deliveryDate;
  final String notes;
  String status; // 'pending', 'accepted', 'rejected'

  FarmerOfferItem({
    required this.id,
    required this.requirementId,
    required this.farmerUsername,
    required this.quantity,
    required this.pricePerUnit,
    required this.deliveryDate,
    required this.notes,
    required this.status,
  });

  factory FarmerOfferItem.fromJson(Map<String, dynamic> json) {
    return FarmerOfferItem(
      id: json['id']?.toString() ?? '',
      requirementId: json['requirement']?.toString() ?? '',
      farmerUsername: json['farmer_username']?.toString() ?? 'Farmer',
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toDouble()
          : double.tryParse(json['quantity']?.toString() ?? '0') ?? 0.0,
      pricePerUnit: (json['price_per_unit'] is num)
          ? (json['price_per_unit'] as num).toDouble()
          : double.tryParse(json['price_per_unit']?.toString() ?? '0') ?? 0.0,
      deliveryDate: json['delivery_date']?.toString() ?? 'Within 3 days',
      notes: json['notes']?.toString() ?? '',
      status: json['status']?.toString().toLowerCase() ?? 'pending',
    );
  }
}

class B2BRequirement {
  final String id;
  final String cropName;
  final String variety;
  final String grade;
  final double targetQuantity;
  final String unit;
  final double targetPriceMin;
  final double targetPriceMax;
  final String requiredDate;
  final String location;
  String status; // 'pending', 'fulfilled', 'under_negotiation'
  final List<FarmerOfferItem> offers;

  B2BRequirement({
    required this.id,
    required this.cropName,
    required this.variety,
    required this.grade,
    required this.targetQuantity,
    required this.unit,
    required this.targetPriceMin,
    required this.targetPriceMax,
    required this.requiredDate,
    required this.location,
    required this.status,
    required this.offers,
  });

  double get totalPledged => offers.fold(0.0, (sum, o) => sum + o.quantity);
  double get remainingNeeded => (targetQuantity - totalPledged).clamp(0.0, double.infinity);
  int get progressPercent => targetQuantity > 0
      ? ((totalPledged / targetQuantity) * 100).round().clamp(0, 100)
      : 0;

  factory B2BRequirement.fromJson(Map<String, dynamic> json) {
    final rawOffers = json['offers'] as List<dynamic>? ?? [];
    return B2BRequirement(
      id: json['id']?.toString() ?? '',
      cropName: json['crop_name']?.toString() ?? '',
      variety: json['variety']?.toString() ?? 'Standard',
      grade: json['grade']?.toString() ?? 'A',
      targetQuantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toDouble()
          : double.tryParse(json['quantity']?.toString() ?? '0') ?? 0.0,
      unit: json['unit']?.toString() ?? 'kg',
      targetPriceMin: (json['target_price_min'] is num)
          ? (json['target_price_min'] as num).toDouble()
          : double.tryParse(json['target_price_min']?.toString() ?? '0') ?? 0.0,
      targetPriceMax: (json['target_price_max'] is num)
          ? (json['target_price_max'] as num).toDouble()
          : double.tryParse(json['target_price_max']?.toString() ?? '0') ?? 0.0,
      requiredDate: json['required_date']?.toString() ?? 'Upcoming',
      location: json['location']?.toString() ?? 'APMC Mandi Hub',
      status: json['status']?.toString().toLowerCase() ?? 'pending',
      offers: rawOffers.map((o) => FarmerOfferItem.fromJson(o as Map<String, dynamic>)).toList(),
    );
  }
}

class PreHarvestContractModel {
  final String id;
  final String cropName;
  final String farmerUsername;
  final String expectedHarvestDate;
  final double contractPrice;
  final double expectedQuantity;
  final String unit;
  String status; // 'proposed', 'accepted'
  int? buyerId;

  PreHarvestContractModel({
    required this.id,
    required this.cropName,
    required this.farmerUsername,
    required this.expectedHarvestDate,
    required this.contractPrice,
    required this.expectedQuantity,
    required this.unit,
    required this.status,
    this.buyerId,
  });

  factory PreHarvestContractModel.fromJson(Map<String, dynamic> json) {
    return PreHarvestContractModel(
      id: json['id']?.toString() ?? '',
      cropName: json['crop_name']?.toString() ?? '',
      farmerUsername: json['farmer_username']?.toString() ?? 'Verified Grower',
      expectedHarvestDate: json['expected_harvest_date']?.toString() ?? 'Upcoming Season',
      contractPrice: (json['contract_price'] is num)
          ? (json['contract_price'] as num).toDouble()
          : double.tryParse(json['contract_price']?.toString() ?? '0') ?? 0.0,
      expectedQuantity: (json['expected_quantity'] is num)
          ? (json['expected_quantity'] as num).toDouble()
          : double.tryParse(json['expected_quantity']?.toString() ?? '0') ?? 0.0,
      unit: json['unit']?.toString() ?? 'kg',
      status: json['status']?.toString().toLowerCase() ?? 'proposed',
      buyerId: json['buyer'] is int ? json['buyer'] : int.tryParse(json['buyer']?.toString() ?? ''),
    );
  }
}

class B2BSubscriptionModel {
  final String id;
  final String commodityName;
  final double quantity;
  final String unit;
  final double pricePerUnit;
  final List<String> scheduleDays;
  final double weeklyEstimate;
  final double discountPct;
  bool isActive;

  B2BSubscriptionModel({
    required this.id,
    required this.commodityName,
    required this.quantity,
    required this.unit,
    required this.pricePerUnit,
    required this.scheduleDays,
    required this.weeklyEstimate,
    required this.discountPct,
    required this.isActive,
  });

  factory B2BSubscriptionModel.fromJson(Map<String, dynamic> json) {
    final items = json['items_breakdown'] as List<dynamic>? ?? [];
    final firstItem = items.isNotEmpty ? items[0] as Map<String, dynamic> : null;
    final schedule = json['schedule_matrix'] as Map<String, dynamic>?;
    final days = (schedule?['recurring_days'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? ['Daily'];
    final billing = json['billing_summary'] as Map<String, dynamic>?;

    final qty = (firstItem?['quantity'] is num)
        ? (firstItem!['quantity'] as num).toDouble()
        : double.tryParse(firstItem?['quantity']?.toString() ?? '100') ?? 100.0;
    final price = (firstItem?['price_per_unit'] is num)
        ? (firstItem!['price_per_unit'] as num).toDouble()
        : double.tryParse(firstItem?['price_per_unit']?.toString() ?? '20') ?? 20.0;

    return B2BSubscriptionModel(
      id: json['subscription_id']?.toString() ?? json['id']?.toString() ?? '',
      commodityName: firstItem?['commodity_name']?.toString() ?? 'Produce Subscription',
      quantity: qty,
      unit: firstItem?['unit']?.toString() ?? 'kg',
      pricePerUnit: price,
      scheduleDays: days,
      weeklyEstimate: billing?['weekly_estimate'] != null
          ? (billing!['weekly_estimate'] as num).toDouble()
          : (qty * price * days.length),
      discountPct: billing?['discount_applied_pct'] != null
          ? (billing!['discount_applied_pct'] as num).toDouble()
          : (qty >= 200 ? 10.0 : 0.0),
      isActive: json['is_active'] ?? true,
    );
  }
}

// Backward-compatibility aliases
typedef BulkRequirement = B2BRequirement;
typedef CounterBid = B2BQuote;
typedef PreHarvestContract = PreHarvestContractModel;

// --- B2B Provider ---

class B2BProvider with ChangeNotifier {
  List<B2BProductListing> _products = [];
  List<B2BQuote> _quotes = [];
  List<B2BRequirement> _requirements = [];
  List<PreHarvestContractModel> _contracts = [];
  List<B2BSubscriptionModel> _subscriptions = [];
  bool _isLoading = false;

  // Filter state for discovering crop listings
  String _filterFarmer = '';
  String _filterProduct = '';
  String _filterMinQty = '';
  String _filterMaxPrice = '';

  // Getters
  List<B2BProductListing> get products => _products;
  List<B2BQuote> get quotes => _quotes;
  List<B2BRequirement> get requirements => _requirements;
  List<PreHarvestContractModel> get contracts => _contracts;
  List<B2BSubscriptionModel> get subscriptions => _subscriptions;
  bool get isLoading => _isLoading;

  String get filterFarmer => _filterFarmer;
  String get filterProduct => _filterProduct;
  String get filterMinQty => _filterMinQty;
  String get filterMaxPrice => _filterMaxPrice;
  bool get isAnyFilterActive =>
      _filterFarmer.isNotEmpty || _filterProduct.isNotEmpty || _filterMinQty.isNotEmpty || _filterMaxPrice.isNotEmpty;

  // Backward compatibility getters
  List<B2BQuote> get counterBids => _quotes;

  B2BProvider() {
    _loadSampleB2BData();
  }

  void _loadSampleB2BData() {
    _products = [
      B2BProductListing(
        id: 1,
        name: "Organic Sharbati Wheat",
        category: "Grains",
        quantity: 1500.0,
        unit: "kg",
        pricePerUnit: 45.0,
        farmerId: 101,
        farmerUsername: "Ramesh Patel",
        district: "Anand",
        state: "Gujarat",
      ),
      B2BProductListing(
        id: 2,
        name: "Hybrid Tomatoes (Grade A)",
        category: "Vegetables",
        quantity: 2500.0,
        unit: "kg",
        pricePerUnit: 24.0,
        farmerId: 101,
        farmerUsername: "Ramesh Patel",
        district: "Anand",
        state: "Gujarat",
      ),
      B2BProductListing(
        id: 3,
        name: "Green Cabbage (Fresh Crop)",
        category: "Vegetables",
        quantity: 800.0,
        unit: "kg",
        pricePerUnit: 18.0,
        farmerId: 102,
        farmerUsername: "Suresh Kumar",
        district: "Nashik",
        state: "Maharashtra",
      ),
      B2BProductListing(
        id: 4,
        name: "Nashik Red Onions (Export Quality)",
        category: "Vegetables",
        quantity: 5000.0,
        unit: "kg",
        pricePerUnit: 32.0,
        farmerId: 102,
        farmerUsername: "Suresh Kumar",
        district: "Nashik",
        state: "Maharashtra",
      ),
      B2BProductListing(
        id: 5,
        name: "Kesar Mangoes (Export Pack)",
        category: "Fruits",
        quantity: 1200.0,
        unit: "kg",
        pricePerUnit: 140.0,
        farmerId: 103,
        farmerUsername: "Vikram Singh",
        district: "Junagadh",
        state: "Gujarat",
      ),
    ];

    _quotes = [
      B2BQuote(
        id: "q-101",
        productId: 2,
        productName: "Hybrid Tomatoes (Grade A)",
        productUnit: "kg",
        quantity: 1000.0,
        targetPrice: 20.0,
        offeredPrice: 22.50,
        status: "offered",
        farmerUsername: "Ramesh Patel",
        district: "Anand, Gujarat",
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      B2BQuote(
        id: "q-102",
        productId: 4,
        productName: "Nashik Red Onions (Export Quality)",
        productUnit: "kg",
        quantity: 2000.0,
        targetPrice: 28.0,
        offeredPrice: null,
        status: "pending",
        farmerUsername: "Suresh Kumar",
        district: "Nashik, Maharashtra",
        createdAt: DateTime.now().subtract(const Duration(minutes: 45)),
      ),
      B2BQuote(
        id: "q-103",
        productId: 1,
        productName: "Organic Sharbati Wheat",
        productUnit: "kg",
        quantity: 1200.0,
        targetPrice: 44.0,
        offeredPrice: 44.0,
        status: "accepted",
        farmerUsername: "Ramesh Patel",
        district: "Anand, Gujarat",
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];

    _requirements = [
      B2BRequirement(
        id: "req-201",
        cropName: "Tomatoes",
        variety: "Hybrid / A Grade",
        grade: "A",
        targetQuantity: 5000.0,
        unit: "kg",
        targetPriceMin: 18.0,
        targetPriceMax: 22.0,
        requiredDate: "2026-10-15",
        location: "Reliance APMC Hub, Ahmedabad",
        status: "pending",
        offers: [
          FarmerOfferItem(
            id: "off-501",
            requirementId: "req-201",
            farmerUsername: "Ramesh Patel",
            quantity: 2000.0,
            pricePerUnit: 20.0,
            deliveryDate: "2026-10-14",
            notes: "Grade A fresh harvest with crates",
            status: "pending",
          ),
          FarmerOfferItem(
            id: "off-502",
            requirementId: "req-201",
            farmerUsername: "Suresh Kumar",
            quantity: 1500.0,
            pricePerUnit: 21.0,
            deliveryDate: "2026-10-15",
            notes: "Cold-chain transport available",
            status: "pending",
          ),
        ],
      ),
      B2BRequirement(
        id: "req-202",
        cropName: "Potatoes",
        variety: "Kufri Jyoti",
        grade: "A",
        targetQuantity: 8000.0,
        unit: "kg",
        targetPriceMin: 14.0,
        targetPriceMax: 18.0,
        requiredDate: "2026-10-20",
        location: "ITC Mandi Hub, Pune",
        status: "fulfilled",
        offers: [
          FarmerOfferItem(
            id: "off-503",
            requirementId: "req-202",
            farmerUsername: "Ramesh Patel",
            quantity: 8000.0,
            pricePerUnit: 16.50,
            deliveryDate: "2026-10-19",
            notes: "Direct bulk dispatch from farm cold storage",
            status: "accepted",
          ),
        ],
      ),
    ];

    _contracts = [
      PreHarvestContractModel(
        id: "ph-301",
        cropName: "Sharbati Golden Wheat",
        farmerUsername: "Ramesh Patel",
        expectedHarvestDate: "Nov 2026",
        contractPrice: 46.0,
        expectedQuantity: 10000.0,
        unit: "kg",
        status: "proposed",
      ),
      PreHarvestContractModel(
        id: "ph-302",
        cropName: "Alphonso Export Mangoes",
        farmerUsername: "Vikram Singh",
        expectedHarvestDate: "Dec 2026",
        contractPrice: 160.0,
        expectedQuantity: 2500.0,
        unit: "kg",
        status: "proposed",
      ),
      PreHarvestContractModel(
        id: "ph-303",
        cropName: "Basmati Rice 1121",
        farmerUsername: "Suresh Kumar",
        expectedHarvestDate: "Oct 2026",
        contractPrice: 72.0,
        expectedQuantity: 5000.0,
        unit: "kg",
        status: "accepted",
        buyerId: 1,
      ),
    ];

    _subscriptions = [
      B2BSubscriptionModel(
        id: "sub-401",
        commodityName: "Tomatoes",
        quantity: 300.0,
        unit: "kg",
        pricePerUnit: 22.0,
        scheduleDays: ["Daily"],
        weeklyEstimate: 46200.0,
        discountPct: 10.0,
        isActive: true,
      ),
      B2BSubscriptionModel(
        id: "sub-402",
        commodityName: "Green Cabbage",
        quantity: 150.0,
        unit: "kg",
        pricePerUnit: 16.0,
        scheduleDays: ["Monday", "Thursday"],
        weeklyEstimate: 4800.0,
        discountPct: 0.0,
        isActive: false,
      ),
    ];
  }

  // --- Unique Farmers & Filtering ---

  List<Map<String, dynamic>> get uniqueFarmers {
    final map = <String, Map<String, dynamic>>{};
    for (final p in _products) {
      final key = p.farmerId?.toString() ?? p.farmerUsername;
      if (!map.containsKey(key)) {
        map[key] = {
          'id': p.farmerId?.toString() ?? p.farmerUsername,
          'username': p.farmerUsername,
          'district': p.district,
          'state': p.state,
        };
      }
    }
    return map.values.toList();
  }

  List<B2BProductListing> get filteredProducts {
    return _products.filter((p) {
      if (_filterFarmer.isNotEmpty) {
        final fid = p.farmerId?.toString() ?? '';
        if (fid != _filterFarmer && p.farmerUsername != _filterFarmer) {
          return false;
        }
      }
      if (_filterProduct.trim().isNotEmpty) {
        final term = _filterProduct.toLowerCase().trim();
        final name = p.name.toLowerCase();
        final cat = p.category.toLowerCase();
        if (!name.includes(term) && !cat.includes(term)) {
          return false;
        }
      }
      if (_filterMinQty.isNotEmpty) {
        final minQ = double.tryParse(_filterMinQty);
        if (minQ != null && p.quantity < minQ) {
          return false;
        }
      }
      if (_filterMaxPrice.isNotEmpty) {
        final maxP = double.tryParse(_filterMaxPrice);
        if (maxP != null && p.pricePerUnit > maxP) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  List<B2BProductListing> searchMatchingProducts(String query) {
    if (query.trim().isEmpty) return _products.take(6).toList();
    final term = query.toLowerCase().trim();
    return _products.where((p) {
      return p.name.toLowerCase().contains(term) ||
          p.category.toLowerCase().contains(term) ||
          p.farmerUsername.toLowerCase().contains(term);
    }).toList();
  }

  void setFilterFarmer(String val) {
    _filterFarmer = val;
    notifyListeners();
  }

  void setFilterProduct(String val) {
    _filterProduct = val;
    notifyListeners();
  }

  void setFilterMinQty(String val) {
    _filterMinQty = val;
    notifyListeners();
  }

  void setFilterMaxPrice(String val) {
    _filterMaxPrice = val;
    notifyListeners();
  }

  void resetFilters() {
    _filterFarmer = '';
    _filterProduct = '';
    _filterMinQty = '';
    _filterMaxPrice = '';
    notifyListeners();
  }

  // --- Network Sync ---

  Future<void> fetchAllData(String? token, {String? buyerId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        ApiService.fetchProducts(token: token),
        ApiService.fetchQuotes(token),
        ApiService.fetchBulkRequirements(token),
        ApiService.fetchPreHarvestContracts(token),
        if (buyerId != null) ApiService.fetchB2BSubscriptions(buyerId: buyerId, token: token),
      ]);

      // 1. Products
      final rawProds = results[0];
      if (rawProds.isNotEmpty) {
        _products = rawProds.map((p) => B2BProductListing.fromJson(p as Map<String, dynamic>)).toList();
      }

      // 2. Quotes
      final rawQuotes = results[1];
      if (rawQuotes.isNotEmpty) {
        _quotes = rawQuotes.map((q) => B2BQuote.fromJson(q as Map<String, dynamic>)).toList();
      }

      // 3. Requirements
      final rawReqs = results[2];
      if (rawReqs.isNotEmpty) {
        _requirements = rawReqs.map((r) => B2BRequirement.fromJson(r as Map<String, dynamic>)).toList();
      }

      // 4. Contracts
      final rawContracts = results[3];
      if (rawContracts.isNotEmpty) {
        _contracts = rawContracts.map((c) => PreHarvestContractModel.fromJson(c as Map<String, dynamic>)).toList();
      }

      // 5. Subscriptions
      if (results.length > 4) {
        final rawSubs = results[4];
        if (rawSubs.isNotEmpty) {
          _subscriptions = rawSubs.map((s) => B2BSubscriptionModel.fromJson(s as Map<String, dynamic>)).toList();
        }
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  // --- Quote Actions ---

  Future<Map<String, dynamic>> submitQuote({
    required int productId,
    required double quantity,
    required double targetPrice,
    String? token,
  }) async {
    final prod = _products.firstWhere(
      (p) => p.id == productId,
      orElse: () => _products.first,
    );

    // Stock check
    if (quantity > prod.quantity) {
      return {
        'success': false,
        'error': 'Requested quantity ($quantity ${prod.unit}) exceeds farmer inventory stock (${prod.quantity} ${prod.unit}). Please adjust quantity or post a Reverse Sourcing Requirement.',
      };
    }

    final res = await ApiService.submitQuote(
      productId: productId,
      quantity: quantity,
      targetPrice: targetPrice,
      token: token,
    );

    if (res['success'] == true && res['data'] != null) {
      final newQuote = B2BQuote.fromJson(res['data'] as Map<String, dynamic>);
      _quotes.insert(0, newQuote);
    } else {
      // Local optimistic fallback
      final fallbackQuote = B2BQuote(
        id: "q-${DateTime.now().millisecondsSinceEpoch}",
        productId: productId,
        productName: prod.name,
        productUnit: prod.unit,
        quantity: quantity,
        targetPrice: targetPrice,
        status: "pending",
        farmerUsername: prod.farmerUsername,
        district: "${prod.district}, ${prod.state}",
        createdAt: DateTime.now(),
      );
      _quotes.insert(0, fallbackQuote);
    }

    notifyListeners();
    return {'success': true};
  }

  Future<Map<String, dynamic>> counterQuote({
    required String quoteId,
    required double targetPrice,
    String? token,
  }) async {
    final res = await ApiService.counterQuoteOffer(
      quoteId: quoteId,
      targetPrice: targetPrice,
      token: token,
    );

    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].targetPrice = targetPrice;
      _quotes[idx].offeredPrice = null;
      _quotes[idx].status = 'pending';
      notifyListeners();
    }

    return res['success'] == true ? res : {'success': true};
  }

  Future<Map<String, dynamic>> acceptQuote({
    required String quoteId,
    String? token,
  }) async {
    final res = await ApiService.acceptQuoteOffer(
      quoteId: quoteId,
      token: token,
    );

    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].status = 'accepted';
      notifyListeners();
    }

    if (res['success'] == true) {
      return res;
    }

    // Fallback simulation order structure
    final quote = idx != -1 ? _quotes[idx] : null;
    final totalAmount = (quote?.quantity ?? 100) * (quote?.offeredPrice ?? quote?.targetPrice ?? 20);
    return {
      'success': true,
      'order': {
        'id': 'ORD-B2B-${DateTime.now().millisecondsSinceEpoch % 100000}',
        'total_amount': totalAmount,
        'status': 'placed',
      },
      'razorpay_order_id': 'rzp_mock_${DateTime.now().millisecondsSinceEpoch}',
      'amount': (totalAmount * 100).toInt(),
    };
  }

  Future<bool> rejectQuote({
    required String quoteId,
    String? token,
  }) async {
    await ApiService.rejectQuoteOffer(quoteId: quoteId, token: token);
    final idx = _quotes.indexWhere((q) => q.id == quoteId);
    if (idx != -1) {
      _quotes[idx].status = 'rejected';
      notifyListeners();
    }
    return true;
  }

  // --- Bulk Sourcing Requirements & Farmer Offers ---

  Future<Map<String, dynamic>> postBulkRequirement({
    required String crop,
    required String variety,
    required double quantity,
    required String unit,
    required String grade,
    required double priceMin,
    required double priceMax,
    required String date,
    required String location,
    String? token,
  }) async {
    final payload = {
      'crop_name': crop,
      'variety': variety,
      'quantity': quantity,
      'unit': unit,
      'grade': grade,
      'target_price_min': priceMin,
      'target_price_max': priceMax,
      'required_date': date,
      'location': location,
    };

    final res = await ApiService.submitBulkRequirement(payload: payload, token: token);

    if (res['success'] == true && res['data'] != null) {
      final newReq = B2BRequirement.fromJson(res['data'] as Map<String, dynamic>);
      _requirements.insert(0, newReq);
    } else {
      final fallbackReq = B2BRequirement(
        id: "req-${DateTime.now().millisecondsSinceEpoch}",
        cropName: crop,
        variety: variety,
        grade: grade,
        targetQuantity: quantity,
        unit: unit,
        targetPriceMin: priceMin,
        targetPriceMax: priceMax,
        requiredDate: date,
        location: location,
        status: "pending",
        offers: [],
      );
      _requirements.insert(0, fallbackReq);
    }

    notifyListeners();
    return {'success': true};
  }

  Future<Map<String, dynamic>> acceptFarmerOffer({
    required String offerId,
    required String requirementId,
    String? token,
  }) async {
    final res = await ApiService.acceptFarmerOffer(offerId: offerId, token: token);

    for (final req in _requirements) {
      for (final off in req.offers) {
        if (off.id == offerId) {
          off.status = 'accepted';
        }
      }
      if (req.id == requirementId && req.remainingNeeded <= 0) {
        req.status = 'fulfilled';
      }
    }
    notifyListeners();

    if (res['success'] == true) {
      return res;
    }

    return {
      'success': true,
      'order': {
        'id': 'ORD-POOL-${DateTime.now().millisecondsSinceEpoch % 100000}',
        'total_amount': 25000.0,
        'status': 'placed',
      },
      'razorpay_order_id': 'rzp_mock_pool_${DateTime.now().millisecondsSinceEpoch}',
      'amount': 2500000,
    };
  }

  Future<bool> rejectFarmerOffer({
    required String offerId,
    required String requirementId,
    String? token,
  }) async {
    await ApiService.rejectFarmerOffer(offerId: offerId, token: token);

    for (final req in _requirements) {
      for (final off in req.offers) {
        if (off.id == offerId) {
          off.status = 'rejected';
        }
      }
    }
    notifyListeners();
    return true;
  }

  // --- Pre-Harvest Contracts ---

  Future<bool> reserveContract({
    required String contractId,
    int? buyerId,
    String? token,
  }) async {
    await ApiService.reservePreHarvestContract(contractId: contractId, token: token);

    final idx = _contracts.indexWhere((c) => c.id == contractId);
    if (idx != -1) {
      _contracts[idx].status = 'accepted';
      _contracts[idx].buyerId = buyerId ?? 1;
      notifyListeners();
      return true;
    }
    return false;
  }

  // --- Subscriptions ---

  Future<bool> createSubscription({
    required String crop,
    required double quantity,
    required double pricePerUnit,
    required String scheduleDay,
    String? buyerId,
    String? token,
  }) async {
    final payload = {
      'buyer_profile': {
        'buyer_id': buyerId ?? "1",
        'name': "B2B Enterprise Wholesaler",
        'delivery_address': "Distribution Logistics Hub"
      },
      'schedule_matrix': {
        'recurring_days': [scheduleDay]
      },
      'items_breakdown': [
        {
          'commodity_name': crop,
          'quantity': quantity,
          'unit': "kg",
          'price_per_unit': pricePerUnit,
        }
      ]
    };

    final res = await ApiService.createB2BSubscription(payload: payload, token: token);

    if (res['success'] == true && res['data'] != null) {
      final newSub = B2BSubscriptionModel.fromJson(res['data'] as Map<String, dynamic>);
      _subscriptions.insert(0, newSub);
    } else {
      final newSub = B2BSubscriptionModel(
        id: "sub-${DateTime.now().millisecondsSinceEpoch}",
        commodityName: crop,
        quantity: quantity,
        unit: "kg",
        pricePerUnit: pricePerUnit,
        scheduleDays: [scheduleDay],
        weeklyEstimate: quantity * pricePerUnit * (scheduleDay == 'Daily' ? 7 : 1),
        discountPct: quantity >= 200 ? 10.0 : 0.0,
        isActive: true,
      );
      _subscriptions.insert(0, newSub);
    }

    notifyListeners();
    return true;
  }

  Future<bool> toggleSubscription({
    required String subscriptionId,
    String? token,
  }) async {
    final idx = _subscriptions.indexWhere((s) => s.id == subscriptionId);
    if (idx != -1) {
      final current = _subscriptions[idx].isActive;
      await ApiService.toggleB2BSubscriptionStatus(
        subscriptionId: subscriptionId,
        active: !current,
        token: token,
      );
      _subscriptions[idx].isActive = !current;
      notifyListeners();
      return true;
    }
    return false;
  }

  // --- Escrow Payment Verification ---

  Future<bool> verifyEscrowPayment({
    required String orderId,
    required String rzpOrderId,
    required String rzpPaymentId,
    required String rzpSignature,
    String? token,
  }) async {
    final payload = {
      'order_id': orderId,
      'razorpay_order_id': rzpOrderId,
      'razorpay_payment_id': rzpPaymentId,
      'razorpay_signature': rzpSignature,
    };
    final res = await ApiService.verifyPaymentCallback(payload: payload, token: token);
    return res['success'] == true;
  }

  // --- Backward-compatibility methods ---

  void updateBidStatus(String bidId, String newStatus) {
    final idx = _quotes.indexWhere((b) => b.id == bidId);
    if (idx != -1) {
      _quotes[idx].status = newStatus.toLowerCase();
      notifyListeners();
    }
  }

  void addBid(B2BQuote bid) {
    _quotes.insert(0, bid);
    notifyListeners();
  }

  void addRequirement(B2BRequirement req) {
    _requirements.insert(0, req);
    notifyListeners();
  }
}

// Extension helper
extension _ListFilter<E> on List<E> {
  Iterable<E> filter(bool Function(E element) test) => where(test);
}

extension _StringExt on String {
  bool includes(String other) => contains(other);
}
