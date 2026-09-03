import 'package:flutter/material.dart';

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
  });
}

class CartItem {
  final CropProduct product;
  int quantityKg;

  CartItem({required this.product, required this.quantityKg});
}

class MarketplaceProvider with ChangeNotifier {
  List<CropProduct> _products = [];
  List<CartItem> _cart = [];
  String _searchQuery = '';
  String _selectedCategory = 'All';

  List<CropProduct> get products => _products;
  List<CartItem> get cart => _cart;
  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;

  int get cartCount => _cart.fold(0, (sum, item) => sum + item.quantityKg);
  double get cartTotalPrice => _cart.fold(0.0, (sum, item) => sum + (item.product.pricePerKg * item.quantityKg));

  static final List<String> categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Pulses'];

  MarketplaceProvider() {
    _loadSampleProducts();
  }

  void _loadSampleProducts() {
    _products = [
      CropProduct(
        id: "p1",
        title: "Organic Hybrid Tomatoes",
        category: "Vegetables",
        farmerName: "Ramesh Patel",
        farmerLocation: "Anand, Gujarat (12 km away)",
        pricePerKg: 32.0,
        mandiBenchmarkPrice: 28.50,
        availableQuantityKg: 500,
        freshnessScore: 96.5,
        harvestDate: "Harvested Yesterday",
        imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop",
        description: "Farm fresh red tomatoes grown with organic neem fertilizer. Ideal for retail and daily kitchen use.",
        farmerRating: 4.9,
      ),
      CropProduct(
        id: "p2",
        title: "Fresh Alphonso Mangoes (Grade A)",
        category: "Fruits",
        farmerName: "Sanjay Deshmukh",
        farmerLocation: "Ratnagiri, Maharashtra",
        pricePerKg: 180.0,
        mandiBenchmarkPrice: 165.0,
        availableQuantityKg: 1200,
        freshnessScore: 98.0,
        harvestDate: "Harvested Today Morning",
        imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop",
        description: "Naturally ripened GI-tagged Alphonso mangoes with rich aroma and high Brix sweetness value.",
        farmerRating: 5.0,
      ),
      CropProduct(
        id: "p3",
        title: "Keshod Sharbati Wheat",
        category: "Grains",
        farmerName: "Bhavesh Bhai",
        farmerLocation: "Junagadh, Gujarat",
        pricePerKg: 45.0,
        mandiBenchmarkPrice: 42.0,
        availableQuantityKg: 5000,
        freshnessScore: 92.0,
        harvestDate: "Sun-dried 3 Days Ago",
        imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop",
        description: "Premium high-protein golden Sharbati wheat grains. Moisture content < 10%.",
        farmerRating: 4.8,
      ),
      CropProduct(
        id: "p4",
        title: "Fresh Green Cabbage",
        category: "Vegetables",
        farmerName: "Ramesh Patel",
        farmerLocation: "Anand APMC, Gujarat",
        pricePerKg: 18.0,
        mandiBenchmarkPrice: 15.0,
        availableQuantityKg: 800,
        freshnessScore: 94.0,
        harvestDate: "Harvested Yesterday",
        imageUrl: "https://images.unsplash.com/photo-1598170845058-12ef4a69b055?w=500&auto=format&fit=crop",
        description: "Crisp green cabbage heads. Packed directly into ventilated wooden crates.",
        farmerRating: 4.9,
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
        description: "High pungency SHU 35,000 red chilis. Great color and spice profile for processing.",
        farmerRating: 4.7,
      ),
    ];
    notifyListeners();
  }

  List<CropProduct> get filteredProducts {
    return _products.where((p) {
      final matchesSearch = p.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.farmerLocation.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.category.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'All' || p.category == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void addToCart(CropProduct product, {int qty = 5}) {
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

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }

  void addProduct(CropProduct newProduct) {
    _products.insert(0, newProduct);
    notifyListeners();
  }
}
