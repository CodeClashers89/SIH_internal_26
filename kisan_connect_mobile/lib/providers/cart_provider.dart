import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CartItem {
  final Map<String, dynamic> product;
  double quantity;

  CartItem({required this.product, required this.quantity});

  Map<String, dynamic> toJson() => {
    'product': product,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    product: json['product'],
    quantity: (json['quantity'] as num).toDouble(),
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

  void addToCart(Map<String, dynamic> product, {double qty = 1.0}) {
    final productId = product['id'];
    final existingIndex = _items.indexWhere((item) => item.product['id'] == productId);
    final availableStock = double.tryParse(product['quantity']?.toString() ?? '0') ?? 0.0;

    if (existingIndex > -1) {
      _items[existingIndex].quantity += qty;
      if (_items[existingIndex].quantity > availableStock) {
        _items[existingIndex].quantity = availableStock;
      }
    } else {
      _items.add(CartItem(product: product, quantity: qty > availableStock ? availableStock : qty));
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
