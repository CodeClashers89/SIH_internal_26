import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CropProduct {
  final String id;
  final String title;
  final String category; // 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Pulses'
  final String farmerName;
  final String farmerLocation;
  final double pricePerKg;
  final double mandiBenchmarkPrice;
  final double availableQuantityKg;
  final double freshnessScore; // 0 to 100
  final String harvestDate;
  final String imageUrl;
  final String description;
  final double farmerRating;
  final bool isColdStorage;
  final String district;
  final String pincode;

  CropProduct({
    required this.id,
    required this.title,
    required this.category,
    required this.farmerName,
    required this.farmerLocation,
    required this.pricePerKg,
    required this.mandiBenchmarkPrice,
    required this.availableQuantityKg,
    required this.freshnessScore,
    required this.harvestDate,
    required this.imageUrl,
    required this.description,
    this.farmerRating = 4.9,
    this.isColdStorage = false,
    this.district = 'Pune',
    this.pincode = '411001',
  });

  factory CropProduct.fromJson(Map<String, dynamic> json) {
    final farmer = json['farmer'] ?? {};
    return CropProduct(
      id: json['id']?.toString() ?? 'p_${DateTime.now().millisecondsSinceEpoch}',
      title: json['name'] ?? json['title'] ?? 'Fresh Farm Produce',
      category: json['category'] ?? 'Vegetables',
      farmerName: farmer['name'] ?? farmer['username'] ?? json['farmer_name'] ?? 'Ramesh Patil',
      farmerLocation: farmer['district'] ?? json['farmer_location'] ?? 'Pune, Maharashtra',
      pricePerKg: (json['price_per_unit'] ?? json['price'] ?? 30.0).toDouble(),
      mandiBenchmarkPrice: (json['mandi_benchmark_price'] ?? (json['price_per_unit'] ?? 30.0) * 0.9).toDouble(),
      availableQuantityKg: (json['available_quantity'] ?? json['quantity'] ?? 200.0).toDouble(),
      freshnessScore: (json['freshness_percentage'] ?? json['freshness_score'] ?? 95.0).toDouble(),
      harvestDate: json['harvest_date'] ?? 'Fresh Harvest',
      imageUrl: json['image'] ?? json['image_url'] ?? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
      description: json['description'] ?? 'Direct farm harvested natural produce.',
      farmerRating: (json['rating'] ?? 4.9).toDouble(),
      isColdStorage: json['is_cold_storage'] ?? false,
      district: json['district'] ?? farmer['district'] ?? 'Pune',
      pincode: json['pincode'] ?? farmer['pincode'] ?? '411001',
    );
  }
}

class CartItem {
  final CropProduct product;
  int quantityKg;

  CartItem({required this.product, required this.quantityKg});
}

class ConsumerOrderItem {
  final String id;
  final String productId;
  final String name;
  final int quantityKg;
  final double pricePerKg;
  final double totalPrice;
  final String imageUrl;

  ConsumerOrderItem({
    required this.id,
    required this.productId,
    required this.name,
    required this.quantityKg,
    required this.pricePerKg,
    required this.totalPrice,
    this.imageUrl = '',
  });

  factory ConsumerOrderItem.fromJson(Map<String, dynamic> json) {
    final prod = json['product_details'] ?? {};
    final price = (json['price_at_order'] ?? prod['price_per_unit'] ?? 30.0).toDouble();
    final qty = (json['quantity'] ?? 5).toInt();
    return ConsumerOrderItem(
      id: json['id']?.toString() ?? 'it_1',
      productId: json['product']?.toString() ?? prod['id']?.toString() ?? 'p1',
      name: prod['name'] ?? json['product_name'] ?? 'Organic Tomatoes',
      quantityKg: qty,
      pricePerKg: price,
      totalPrice: price * qty,
      imageUrl: prod['image'] ?? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
    );
  }
}

class ConsumerOrder {
  final String id;
  final List<ConsumerOrderItem> items;
  final double totalAmount;
  String status; // 'placed', 'confirmed', 'packed', 'in_transit', 'delivered', 'cancelled'
  String paymentStatus; // 'paid', 'pending'
  final String deliveryAddress;
  final String shippingPincode;
  final String driverName;
  final String driverPhone;
  String? deliveryOtp;
  final String createdDate;
  final bool isSubscription;
  final String? subscriptionSchedule;

  ConsumerOrder({
    required this.id,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    required this.deliveryAddress,
    this.shippingPincode = '411001',
    this.driverName = 'Suresh Logistics (GJ-01-AB-1234)',
    this.driverPhone = '+91 97766 55443',
    this.deliveryOtp,
    required this.createdDate,
    this.isSubscription = false,
    this.subscriptionSchedule,
  });

  factory ConsumerOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    final itemsList = rawItems.map((it) => ConsumerOrderItem.fromJson(it)).toList();
    final shipment = json['shipment'] ?? {};
    final partner = shipment['partner_details'] ?? {};

    return ConsumerOrder(
      id: json['id']?.toString() ?? 'ORD-${DateTime.now().millisecondsSinceEpoch}',
      items: itemsList,
      totalAmount: (json['total_amount'] ?? 450.0).toDouble(),
      status: json['status'] ?? 'placed',
      paymentStatus: json['payment_status'] ?? 'paid',
      deliveryAddress: json['delivery_address'] ?? 'Shivajinagar, Pune, Maharashtra',
      shippingPincode: json['pincode'] ?? '411001',
      driverName: partner['name'] ?? shipment['driver_name'] ?? 'Suresh Logistics (GJ-01-AB-1234)',
      driverPhone: partner['phone'] ?? shipment['driver_phone'] ?? '+91 97766 55443',
      deliveryOtp: shipment['delivery_otp']?.toString() ?? json['otp']?.toString() ?? '4892',
      createdDate: json['created_at']?.toString().split('T').first ?? 'Today',
      isSubscription: json['is_subscription'] ?? json['subscription'] != null,
      subscriptionSchedule: json['delivery_day'] != null ? 'Every ${json['delivery_day']}' : null,
    );
  }
}

class ConsumerSubscription {
  final String id;
  final String planTitle;
  final String deliveryDay;
  final String deliveryTimeSlot; // 'morning', 'afternoon', 'evening'
  int completedDeliveries;
  final int totalDeliveries;
  final double perDeliveryTotal;
  String status; // 'active', 'paused', 'cancelled'
  final String nextDeliveryDate;
  final String itemsSummary;

  ConsumerSubscription({
    required this.id,
    required this.planTitle,
    required this.deliveryDay,
    required this.deliveryTimeSlot,
    required this.completedDeliveries,
    required this.totalDeliveries,
    required this.perDeliveryTotal,
    required this.status,
    required this.nextDeliveryDate,
    required this.itemsSummary,
  });

  factory ConsumerSubscription.fromJson(Map<String, dynamic> json) {
    return ConsumerSubscription(
      id: json['id']?.toString() ?? 'sub_1',
      planTitle: json['plan_title'] ?? 'Weekly Organic Veggies & Fruits Basket',
      deliveryDay: json['delivery_day'] ?? 'Monday',
      deliveryTimeSlot: json['delivery_time_slot'] ?? 'morning',
      completedDeliveries: (json['completed_deliveries'] ?? 3).toInt(),
      totalDeliveries: (json['total_deliveries'] ?? 8).toInt(),
      perDeliveryTotal: (json['per_delivery_total'] ?? 450.0).toDouble(),
      status: json['status'] ?? 'active',
      nextDeliveryDate: json['next_delivery_date'] ?? 'Next Monday (6:00 AM – 9:00 AM)',
      itemsSummary: json['items_summary'] ?? '5 kg Farm Veggies + 2 kg Seasonal Fruits',
    );
  }
}

class SubscriptionConfig {
  String orderType; // 'onetime' | 'subscription'
  String deliveryDay;
  List<String> deliveryDays;
  String deliveryTimeSlot; // 'morning', 'afternoon', 'evening'
  int durationMonths;

  SubscriptionConfig({
    this.orderType = 'onetime',
    this.deliveryDay = 'Monday',
    this.deliveryDays = const ['Monday'],
    this.deliveryTimeSlot = 'morning',
    this.durationMonths = 2,
  });
}

class MarketplaceProvider with ChangeNotifier {
  List<CropProduct> _products = [];
  final List<CartItem> _cart = [];
  List<ConsumerOrder> _orders = [];
  List<ConsumerSubscription> _subscriptions = [];
  bool _isLoading = false;

  String _searchQuery = '';
  String _selectedCategory = 'All';
  String _selectedDistrict = 'All';
  String _selectedPincode = '';
  String _sortBy = 'newest'; // 'newest', 'price-low', 'price-high', 'freshness'

  final SubscriptionConfig _subscriptionConfig = SubscriptionConfig();

  List<CropProduct> get products => _products;
  List<CartItem> get cart => _cart;
  List<ConsumerOrder> get orders => _orders;
  List<ConsumerSubscription> get subscriptions => _subscriptions;
  bool get isLoading => _isLoading;

  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;
  String get selectedDistrict => _selectedDistrict;
  String get selectedPincode => _selectedPincode;
  String get sortBy => _sortBy;
  SubscriptionConfig get subscriptionConfig => _subscriptionConfig;

  static final List<String> categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Pulses'];
  static final List<String> districts = ['All', 'Pune', 'Nashik', 'Ratnagiri', 'Anand', 'Nagpur'];

  MarketplaceProvider() {
    _loadSampleProducts();
    _loadSampleConsumerData();
  }

  // --- GETTERS & METRICS ---

  ConsumerOrder? get activeOrder {
    try {
      return _orders.firstWhere((o) => o.status != 'delivered' && o.status != 'cancelled');
    } catch (_) {
      return _orders.isNotEmpty ? _orders.first : null;
    }
  }

  ConsumerOrder? get unpaidOrder {
    try {
      return _orders.firstWhere((o) => o.paymentStatus != 'paid' && o.status != 'cancelled');
    } catch (_) {
      return null;
    }
  }

  ConsumerSubscription? get activeSubscription {
    try {
      return _subscriptions.firstWhere((s) => s.status == 'active');
    } catch (_) {
      return _subscriptions.isNotEmpty ? _subscriptions.first : null;
    }
  }

  double get totalSpend => _orders
      .where((o) => o.paymentStatus == 'paid')
      .fold(0.0, (sum, o) => sum + o.totalAmount);

  int get calculatedSavings {
    // 18% direct-from-farmer saving vs retail markup + subscription bonus
    final base = (totalSpend * 0.18).round();
    return base + (_subscriptions.isNotEmpty ? 120 : 60);
  }

  int get cartCount => _cart.fold(0, (sum, item) => sum + item.quantityKg);

  double get cartBaseTotal => _cart.fold(
      0.0, (sum, item) => sum + (item.product.pricePerKg * item.quantityKg));

  double get cartSubscriberDiscount => _subscriptionConfig.orderType == 'subscription'
      ? cartBaseTotal * 0.05
      : 0.0;

  double get cartTotalPrice => cartBaseTotal - cartSubscriberDiscount;

  int get cartTotalDeliveries => _subscriptionConfig.orderType == 'subscription'
      ? _subscriptionConfig.durationMonths * 4
      : 1;

  double get cartTotalPlanAmount => cartTotalPrice * cartTotalDeliveries;

  // --- PRODUCT FILTERING & SORTING ---

  List<CropProduct> get filteredProducts {
    var result = _products.where((p) {
      final matchesSearch = p.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.farmerName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.farmerLocation.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.category.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == 'All' || p.category == _selectedCategory;
      final matchesDistrict = _selectedDistrict == 'All' || p.district.toLowerCase() == _selectedDistrict.toLowerCase();
      final matchesPincode = _selectedPincode.isEmpty || p.pincode.contains(_selectedPincode);

      return matchesSearch && matchesCategory && matchesDistrict && matchesPincode;
    }).toList();

    if (_sortBy == 'price-low') {
      result.sort((a, b) => a.pricePerKg.compareTo(b.pricePerKg));
    } else if (_sortBy == 'price-high') {
      result.sort((a, b) => b.pricePerKg.compareTo(a.pricePerKg));
    } else if (_sortBy == 'freshness') {
      result.sort((a, b) => b.freshnessScore.compareTo(a.freshnessScore));
    }

    return result;
  }

  List<CropProduct> get freshNearYou => [..._products]
    ..sort((a, b) => b.freshnessScore.compareTo(a.freshnessScore));

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSelectedDistrict(String district) {
    _selectedDistrict = district;
    notifyListeners();
  }

  void setSelectedPincode(String pincode) {
    _selectedPincode = pincode;
    notifyListeners();
  }

  void setSortBy(String sort) {
    _sortBy = sort;
    notifyListeners();
  }

  // --- CART & SUBSCRIPTION CONFIG ---

  void setSubscriptionConfig({
    String? orderType,
    String? deliveryDay,
    List<String>? deliveryDays,
    String? deliveryTimeSlot,
    int? durationMonths,
  }) {
    if (orderType != null) _subscriptionConfig.orderType = orderType;
    if (deliveryDay != null) _subscriptionConfig.deliveryDay = deliveryDay;
    if (deliveryDays != null) _subscriptionConfig.deliveryDays = deliveryDays;
    if (deliveryTimeSlot != null) _subscriptionConfig.deliveryTimeSlot = deliveryTimeSlot;
    if (durationMonths != null) _subscriptionConfig.durationMonths = durationMonths;
    notifyListeners();
  }

  void addToCart(CropProduct product, {int qty = 5, String? orderType, String? deliveryDay, String? timeSlot}) {
    if (orderType != null) _subscriptionConfig.orderType = orderType;
    if (deliveryDay != null) _subscriptionConfig.deliveryDay = deliveryDay;
    if (timeSlot != null) _subscriptionConfig.deliveryTimeSlot = timeSlot;

    final existingIndex = _cart.indexWhere((item) => item.product.id == product.id);
    if (existingIndex >= 0) {
      _cart[existingIndex].quantityKg += qty;
    } else {
      _cart.add(CartItem(product: product, quantityKg: qty));
    }
    notifyListeners();
  }

  void updateCartQty(String productId, int newQty) {
    if (newQty <= 0) {
      _cart.removeWhere((item) => item.product.id == productId);
    } else {
      final item = _cart.firstWhere((item) => item.product.id == productId);
      item.quantityKg = newQty;
    }
    notifyListeners();
  }

  void removeFromCart(String productId) {
    _cart.removeWhere((item) => item.product.id == productId);
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }

  // --- ORDER & SUBSCRIPTION ACTIONS ---

  Future<ConsumerOrder> placeOrder({
    required String address,
    required String pincode,
    String? token,
  }) async {
    final orderId = 'ORD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final isSub = _subscriptionConfig.orderType == 'subscription';
    final generatedOtp = (1000 + (DateTime.now().millisecondsSinceEpoch % 9000)).toString();

    final orderItems = _cart.map((c) => ConsumerOrderItem(
      id: 'it_${DateTime.now().millisecondsSinceEpoch}_${c.product.id}',
      productId: c.product.id,
      name: c.product.title,
      quantityKg: c.quantityKg,
      pricePerKg: c.product.pricePerKg,
      totalPrice: c.product.pricePerKg * c.quantityKg,
      imageUrl: c.product.imageUrl,
    )).toList();

    final newOrder = ConsumerOrder(
      id: orderId,
      items: orderItems,
      totalAmount: cartTotalPrice,
      status: 'placed',
      paymentStatus: 'paid', // Instant verified payment
      deliveryAddress: address.isNotEmpty ? address : 'Shivajinagar, Pune, Maharashtra',
      shippingPincode: pincode.isNotEmpty ? pincode : '411001',
      driverName: 'Suresh Express Fleet (MH-12-DE-9942)',
      driverPhone: '+91 97766 55443',
      deliveryOtp: generatedOtp,
      createdDate: 'Today',
      isSubscription: isSub,
      subscriptionSchedule: isSub ? 'Every ${_subscriptionConfig.deliveryDay}' : null,
    );

    _orders.insert(0, newOrder);

    // If subscription was selected, register auto-delivery schedule
    if (isSub) {
      final sub = ConsumerSubscription(
        id: 'SUB-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
        planTitle: '${orderItems.first.name} + Farm Produce Box',
        deliveryDay: _subscriptionConfig.deliveryDay,
        deliveryTimeSlot: _subscriptionConfig.deliveryTimeSlot,
        completedDeliveries: 0,
        totalDeliveries: _subscriptionConfig.durationMonths * 4,
        perDeliveryTotal: cartTotalPrice,
        status: 'active',
        nextDeliveryDate: 'Next ${_subscriptionConfig.deliveryDay} (${_subscriptionConfig.deliveryTimeSlot.toUpperCase()})',
        itemsSummary: orderItems.map((it) => '${it.name} (${it.quantityKg}kg)').join(', '),
      );
      _subscriptions.insert(0, sub);
    }

    clearCart();

    // Attempt backend sync
    try {
      if (token != null) {
        await ApiService.createOrder({
          'delivery_address': address,
          'pincode': pincode,
          'channel': 'retail',
          'total_amount': newOrder.totalAmount,
          'is_subscription': isSub,
        }, token);
      }
    } catch (_) {}

    notifyListeners();
    return newOrder;
  }

  Future<void> payUnpaidOrder(String orderId, String? token) async {
    final order = _orders.firstWhere((o) => o.id == orderId);
    order.paymentStatus = 'paid';
    order.deliveryOtp = '8821';
    order.status = 'confirmed';
    notifyListeners();

    try {
      if (token != null) {
        await ApiService.updateOrderStatus(orderId, 'confirmed', token);
      }
    } catch (_) {}
  }

  Future<void> cancelOrder(String orderId, String? token) async {
    final order = _orders.firstWhere((o) => o.id == orderId);
    order.status = 'cancelled';
    notifyListeners();

    try {
      if (token != null) {
        await ApiService.updateOrderStatus(orderId, 'cancelled', token);
      }
    } catch (_) {}
  }

  Future<void> pauseSubscription(String subId, String? token) async {
    final sub = _subscriptions.firstWhere((s) => s.id == subId);
    sub.status = 'paused';
    notifyListeners();
    try {
      if (token != null) await ApiService.pauseSubscription(subId, token);
    } catch (_) {}
  }

  Future<void> resumeSubscription(String subId, String? token) async {
    final sub = _subscriptions.firstWhere((s) => s.id == subId);
    sub.status = 'active';
    notifyListeners();
    try {
      if (token != null) await ApiService.resumeSubscription(subId, token);
    } catch (_) {}
  }

  Future<void> cancelSubscription(String subId, String? token) async {
    final sub = _subscriptions.firstWhere((s) => s.id == subId);
    sub.status = 'cancelled';
    notifyListeners();
    try {
      if (token != null) await ApiService.cancelSubscription(subId, token);
    } catch (_) {}
  }

  void addCustomSubscription({
    required String planTitle,
    required String deliveryDay,
    required String deliveryTimeSlot,
    required double perDeliveryTotal,
    required String itemsSummary,
  }) {
    final newSub = ConsumerSubscription(
      id: 'SUB-${110 + _subscriptions.length}',
      planTitle: planTitle,
      deliveryDay: deliveryDay,
      deliveryTimeSlot: deliveryTimeSlot,
      completedDeliveries: 0,
      totalDeliveries: 8,
      perDeliveryTotal: perDeliveryTotal,
      status: 'active',
      nextDeliveryDate: 'Next $deliveryDay (6:00 AM – 9:00 AM)',
      itemsSummary: itemsSummary,
    );
    _subscriptions.insert(0, newSub);
    notifyListeners();
  }

  Future<void> fetchConsumerDashboardData(String? token) async {
    _isLoading = true;
    notifyListeners();

    try {
      final prods = await ApiService.fetchProducts(token: token);
      if (prods.isNotEmpty) {
        _products = prods.map((p) => CropProduct.fromJson(p)).toList();
      }

      final ords = await ApiService.fetchFarmerOrders(token);
      if (ords.isNotEmpty) {
        _orders = ords.map((o) => ConsumerOrder.fromJson(o)).toList();
      }

      final subs = await ApiService.fetchConsumerSubscriptions(token);
      if (subs.isNotEmpty) {
        _subscriptions = subs.map((s) => ConsumerSubscription.fromJson(s)).toList();
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  void addProduct(CropProduct newProduct) {
    _products.insert(0, newProduct);
    notifyListeners();
  }

  // --- INITIAL SAMPLE DATA (DIRECT PARITY WITH SIH BACKEND / DEMO) ---

  void _loadSampleProducts() {
    _products = [
      CropProduct(
        id: "p1",
        title: "Organic Hybrid Tomatoes",
        category: "Vegetables",
        farmerName: "Ramesh Patil",
        farmerLocation: "Nashik, Maharashtra (12 km away)",
        pricePerKg: 32.0,
        mandiBenchmarkPrice: 28.50,
        availableQuantityKg: 650,
        freshnessScore: 96.5,
        harvestDate: "Harvested Today Morning",
        imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop",
        description: "Farm fresh red tomatoes grown with organic neem fertilizer. Direct from Patil Agro Estate.",
        farmerRating: 4.9,
        isColdStorage: false,
        district: "Pune",
        pincode: "411001",
      ),
      CropProduct(
        id: "p2",
        title: "Nashik Red Onions (Export Grade)",
        category: "Vegetables",
        farmerName: "Ramesh Patil",
        farmerLocation: "Lasalgaon, Nashik",
        pricePerKg: 29.0,
        mandiBenchmarkPrice: 26.0,
        availableQuantityKg: 1800,
        freshnessScore: 88.0,
        harvestDate: "Harvested Yesterday",
        imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop",
        description: "Dry cured medium red onions ready for long-haul storage and kitchen daily use.",
        farmerRating: 4.8,
        isColdStorage: true,
        district: "Nashik",
        pincode: "422001",
      ),
      CropProduct(
        id: "p3",
        title: "Fresh Alphonso Mangoes (GI Tagged)",
        category: "Fruits",
        farmerName: "Sanjay Deshmukh",
        farmerLocation: "Ratnagiri, Maharashtra",
        pricePerKg: 180.0,
        mandiBenchmarkPrice: 165.0,
        availableQuantityKg: 400,
        freshnessScore: 98.0,
        harvestDate: "Harvested Today",
        imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop",
        description: "Naturally tree-ripened carbide-free Ratnagiri Alphonsos with supreme aroma and sweetness.",
        farmerRating: 5.0,
        isColdStorage: false,
        district: "Ratnagiri",
        pincode: "415612",
      ),
      CropProduct(
        id: "p4",
        title: "Traditional Sharbati Wheat",
        category: "Grains",
        farmerName: "Bhavesh Bhai",
        farmerLocation: "Sehore / Junagadh",
        pricePerKg: 36.5,
        mandiBenchmarkPrice: 33.0,
        availableQuantityKg: 3200,
        freshnessScore: 94.0,
        harvestDate: "Season Harvest",
        imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop",
        description: "Premium high-protein golden polished Sharbati wheat grains. Moisture < 10%.",
        farmerRating: 4.8,
        isColdStorage: false,
        district: "Pune",
        pincode: "411001",
      ),
      CropProduct(
        id: "p5",
        title: "Organic Red Chili (Guntur)",
        category: "Spices",
        farmerName: "Ketan Rao",
        farmerLocation: "Guntur, Andhra Pradesh",
        pricePerKg: 210.0,
        mandiBenchmarkPrice: 195.0,
        availableQuantityKg: 300,
        freshnessScore: 95.0,
        harvestDate: "Dried Harvest",
        imageUrl: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500&auto=format&fit=crop",
        description: "High pungency SHU 35,000 sun-dried chilis. Rich natural red capsaicin oil.",
        farmerRating: 4.7,
        isColdStorage: false,
        district: "Pune",
        pincode: "411001",
      ),
    ];
  }

  void _loadSampleConsumerData() {
    _orders = [
      ConsumerOrder(
        id: 'ORD-9842',
        items: [
          ConsumerOrderItem(
            id: 'it_1',
            productId: 'p1',
            name: 'Organic Hybrid Tomatoes',
            quantityKg: 5,
            pricePerKg: 32.0,
            totalPrice: 160.0,
            imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop',
          ),
          ConsumerOrderItem(
            id: 'it_2',
            productId: 'p2',
            name: 'Nashik Red Onions',
            quantityKg: 10,
            pricePerKg: 29.0,
            totalPrice: 290.0,
            imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop',
          ),
        ],
        totalAmount: 450.0,
        status: 'in_transit', // Active out-for-delivery drop
        paymentStatus: 'paid',
        deliveryAddress: 'Flat 402, Green Meadows, Shivajinagar, Pune',
        shippingPincode: '411001',
        driverName: 'Suresh Express Fleet (MH-12-DE-9942)',
        driverPhone: '+91 97766 55443',
        deliveryOtp: '4892',
        createdDate: 'Today, 9:30 AM',
        isSubscription: false,
      ),
      ConsumerOrder(
        id: 'ORD-9831',
        items: [
          ConsumerOrderItem(
            id: 'it_3',
            productId: 'p3',
            name: 'Fresh Alphonso Mangoes',
            quantityKg: 2,
            pricePerKg: 180.0,
            totalPrice: 360.0,
            imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop',
          ),
        ],
        totalAmount: 360.0,
        status: 'placed',
        paymentStatus: 'pending', // Unpaid order triggering payment alert
        deliveryAddress: 'Flat 402, Green Meadows, Shivajinagar, Pune',
        shippingPincode: '411001',
        driverName: 'Local Courier Fleet',
        driverPhone: '+91 98221 44332',
        deliveryOtp: null,
        createdDate: 'Yesterday',
        isSubscription: false,
      ),
      ConsumerOrder(
        id: 'ORD-9810',
        items: [
          ConsumerOrderItem(
            id: 'it_4',
            productId: 'p4',
            name: 'Traditional Sharbati Wheat',
            quantityKg: 25,
            pricePerKg: 36.5,
            totalPrice: 912.5,
            imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop',
          ),
        ],
        totalAmount: 912.5,
        status: 'delivered',
        paymentStatus: 'paid',
        deliveryAddress: 'Flat 402, Green Meadows, Shivajinagar, Pune',
        shippingPincode: '411001',
        driverName: 'Kheda Express Truck',
        driverPhone: '+91 97766 55443',
        deliveryOtp: '1109',
        createdDate: '5 Days Ago',
        isSubscription: false,
      ),
    ];

    _subscriptions = [
      ConsumerSubscription(
        id: 'SUB-108',
        planTitle: 'Weekly Farm Veggies & Fresh Fruits Drop',
        deliveryDay: 'Monday',
        deliveryTimeSlot: 'morning',
        completedDeliveries: 3,
        totalDeliveries: 8,
        perDeliveryTotal: 427.50, // 5% discounted
        status: 'active',
        nextDeliveryDate: 'Next Monday (6:00 AM – 9:00 AM)',
        itemsSummary: '5 kg Organic Tomatoes + 5 kg Red Onions + 2 kg Mangoes',
      ),
      ConsumerSubscription(
        id: 'SUB-109',
        planTitle: 'Daily Pure Farm Milk & Organic Eggs',
        deliveryDay: 'Every day',
        deliveryTimeSlot: 'morning',
        completedDeliveries: 12,
        totalDeliveries: 30,
        perDeliveryTotal: 152.00,
        status: 'active',
        nextDeliveryDate: 'Tomorrow (6:30 AM)',
        itemsSummary: '2L Gir Cow A2 Milk + 6 Free-Range Eggs',
      ),
    ];
  }
}
