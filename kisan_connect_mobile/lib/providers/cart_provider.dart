import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CartItem {
  final Map<String, dynamic> product;
  double quantity;
  final bool isSubscription;
  final Map<String, dynamic>? subConfig;

  CartItem({
    required this.product,
    required this.quantity,
    this.isSubscription = false,
    this.subConfig,
  });

  Map<String, dynamic> toJson() => {
    'product': product,
    'quantity': quantity,
    'isSubscription': isSubscription,
    'subConfig': subConfig,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    product: json['product'],
    quantity: (json['quantity'] as num).toDouble(),
    isSubscription: json['isSubscription'] ?? false,
    subConfig: json['subConfig'] != null ? Map<String, dynamic>.from(json['subConfig']) : null,
  );
}

class CartProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  List<CartItem> _items = [];

  CartProvider(this._prefs) {
    _loadCart();
  }

  List<CartItem> get items => _items;

  void _loadCart() {
    final cartStr = _prefs.getString('kisan_connect_cart');
    if (cartStr != null) {
      try {
        final List<dynamic> decoded = jsonDecode(cartStr);
        _items = decoded.map((item) => CartItem.fromJson(item)).toList();
      } catch (_) {
        _items = [];
      }
    }
    notifyListeners();
  }

  void _saveCart() {
    _prefs.setString(
      'kisan_connect_cart',
      jsonEncode(_items.map((item) => item.toJson()).toList()),
    );
    notifyListeners();
  }

  void addToCart(Map<String, dynamic> product, {double qty = 1.0, bool isSubscription = false, Map<String, dynamic>? subConfig}) {
    final productId = product['id'];
    final existingIndex = _items.indexWhere((item) => item.product['id'] == productId);
    final availableStock = double.tryParse(product['quantity']?.toString() ?? '0') ?? 0.0;

    if (existingIndex > -1) {
      _items[existingIndex].quantity += qty;
      if (_items[existingIndex].quantity > availableStock) {
        _items[existingIndex].quantity = availableStock;
      }
      // Re-create the item if subscription settings changed
      _items[existingIndex] = CartItem(
        product: _items[existingIndex].product,
        quantity: _items[existingIndex].quantity,
        isSubscription: isSubscription,
        subConfig: subConfig ?? _items[existingIndex].subConfig,
      );
    } else {
      _items.add(CartItem(
        product: product,
        quantity: qty > availableStock ? availableStock : qty,
        isSubscription: isSubscription,
        subConfig: subConfig,
      ));
    }
    _saveCart();
  }

  void removeFromCart(int productId) {
    _items.removeWhere((item) => item.product['id'] == productId);
    _saveCart();
  }

  void updateQuantity(int productId, double qty) {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    final index = _items.indexWhere((item) => item.product['id'] == productId);
    if (index > -1) {
      final availableStock = double.tryParse(_items[index].product['quantity']?.toString() ?? '0') ?? 0.0;
      _items[index].quantity = qty > availableStock ? availableStock : qty;
      _saveCart();
    }
  }

  void clearCart() {
    _items.clear();
    _saveCart();
  }

  double getCartTotal() {
    return _items.fold(0.0, (sum, item) {
      final price = double.tryParse(item.product['price_per_unit']?.toString() ?? '0') ?? 0.0;
      return sum + (price * item.quantity);
    });
  }

  double getCartCount() {
    return _items.fold(0.0, (sum, item) => sum + item.quantity);
  }
}
