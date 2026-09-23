import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/marketplace_provider.dart';
import 'package:kisan_connect_mobile/screens/marketplace/consumer_marketplace_tab.dart';
import 'package:provider/provider.dart';

void main() {
  group('MarketplaceProvider State & Logic Tests', () {
    late MarketplaceProvider marketplace;

    setUp(() {
      marketplace = MarketplaceProvider();
    });

    test('1. Initial demo data matches website state', () {
      expect(marketplace.products.length, greaterThanOrEqualTo(4));
      expect(marketplace.orders.length, greaterThanOrEqualTo(2));
      expect(marketplace.subscriptions.length, greaterThanOrEqualTo(1));

      // Active order and KPI checks
      expect(marketplace.activeOrder, isNotNull);
      expect(marketplace.activeOrder!.driverName, contains('Suresh Express'));
      expect(marketplace.activeOrder!.deliveryOtp, '4892');
      expect(marketplace.totalSpend, greaterThan(0));
      expect(marketplace.calculatedSavings, greaterThan(0));

      // Active subscription
      expect(marketplace.activeSubscription, isNotNull);
      expect(marketplace.activeSubscription!.status, 'active');
    });

    test('2. Filtering and search produce works', () {
      // Search by query
      marketplace.setSearchQuery('Tomato');
      var filtered = marketplace.filteredProducts;
      expect(filtered.every((p) => p.title.toLowerCase().contains('tomato')), isTrue);

      marketplace.setSearchQuery('');
      // Filter by category
      marketplace.setSelectedCategory('Fruits');
      filtered = marketplace.filteredProducts;
      expect(filtered.every((p) => p.category == 'Fruits'), isTrue);

      // Reset
      marketplace.setSelectedCategory('All');
      expect(marketplace.filteredProducts.length, marketplace.products.length);
    });

    test('3. Cart operations: Add, Update Qty, Remove, Clear', () {
      final product = marketplace.products.first;

      // Add to cart
      marketplace.addToCart(product, qty: 2);
      expect(marketplace.cart.length, 1);
      expect(marketplace.cart.first.quantityKg, 2);
      expect(marketplace.cartCount, 2);

      // Update Qty
      marketplace.updateCartQty(product.id, 5);
      expect(marketplace.cart.first.quantityKg, 5);
      expect(marketplace.cartCount, 5);

      // Remove from cart
      marketplace.removeFromCart(product.id);
      expect(marketplace.cart.isEmpty, isTrue);
      expect(marketplace.cartCount, 0);

      // Clear cart
      marketplace.addToCart(product, qty: 3);
      expect(marketplace.cart.isNotEmpty, isTrue);
      marketplace.clearCart();
      expect(marketplace.cart.isEmpty, isTrue);
    });

    test('4. Subscription discount & pricing calculation (5% auto-delivery discount)', () {
      final product = marketplace.products.first; // e.g. ₹32/kg
      marketplace.addToCart(product, qty: 2);

      // One-time order calculation
      marketplace.setSubscriptionConfig(orderType: 'onetime');
      expect(marketplace.cartSubscriberDiscount, 0.0);
      expect(marketplace.cartTotalPrice, marketplace.cartBaseTotal);

      // Subscription mode calculation
      marketplace.setSubscriptionConfig(
        orderType: 'subscription',
        deliveryDay: 'Friday',
        deliveryTimeSlot: 'morning',
        durationMonths: 1, // 4 deliveries
      );

      final expectedDiscount = marketplace.cartBaseTotal * 0.05;
      expect(marketplace.cartSubscriberDiscount, closeTo(expectedDiscount, 0.01));
      expect(marketplace.cartTotalPrice, closeTo(marketplace.cartBaseTotal - expectedDiscount, 0.01));
      expect(marketplace.cartTotalDeliveries, 4);
      expect(marketplace.cartTotalPlanAmount, closeTo(marketplace.cartTotalPrice * 4, 0.01));
    });

    test('5. Place Order creates order and clears cart', () async {
      final product = marketplace.products.first;
      marketplace.addToCart(product, qty: 2);
      expect(marketplace.cart.isNotEmpty, isTrue);

      final prevOrderCount = marketplace.orders.length;
      await marketplace.placeOrder(
        address: 'Flat 402, Green Acre, Pune',
        pincode: '411045',
        token: null,
      );

      expect(marketplace.cart.isEmpty, isTrue);
      expect(marketplace.orders.length, prevOrderCount + 1);
      final newOrder = marketplace.orders.first;
      expect(newOrder.deliveryAddress, 'Flat 402, Green Acre, Pune');
      expect(newOrder.status, 'placed');
    });

    test('6. Pay Unpaid Order updates payment status to paid', () async {
      final unpaid = marketplace.unpaidOrder;
      if (unpaid != null) {
        await marketplace.payUnpaidOrder(unpaid.id, null);
        final updated = marketplace.orders.firstWhere((o) => o.id == unpaid.id);
        expect(updated.paymentStatus, 'paid');
      }
    });

    test('7. Subscription lifecycle: Pause, Resume, Cancel', () async {
      final sub = marketplace.subscriptions.first;

      // Pause
      await marketplace.pauseSubscription(sub.id, null);
      var current = marketplace.subscriptions.firstWhere((s) => s.id == sub.id);
      expect(current.status, 'paused');

      // Resume
      await marketplace.resumeSubscription(sub.id, null);
      current = marketplace.subscriptions.firstWhere((s) => s.id == sub.id);
      expect(current.status, 'active');

      // Cancel
      await marketplace.cancelSubscription(sub.id, null);
      current = marketplace.subscriptions.firstWhere((s) => s.id == sub.id);
      expect(current.status, 'cancelled');
    });

    test('8. Cancel Order updates status to cancelled', () async {
      final order = marketplace.orders.first;
      await marketplace.cancelOrder(order.id, null);
      final updated = marketplace.orders.firstWhere((o) => o.id == order.id);
      expect(updated.status, 'cancelled');
    });
  });

  group('ConsumerMarketplaceTab Widget Rendering Tests', () {
    Widget createWidgetUnderTest() {
      final authProvider = AuthProvider();
      final marketplaceProvider = MarketplaceProvider();

      return MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider<MarketplaceProvider>.value(value: marketplaceProvider),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ConsumerMarketplaceTab(),
          ),
        ),
      );
    }

    testWidgets('Renders top sub-navigation bar and default Dashboard with KPIs and Active Drop', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Top subnav modules
      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Browse Produce'), findsOneWidget);
      expect(find.text('One Time Orders'), findsOneWidget);
      expect(find.text('Recurring Orders'), findsOneWidget);

      // Hero Greeting
      expect(find.textContaining('👋'), findsOneWidget);
      expect(find.textContaining('Track active fresh produce drops'), findsOneWidget);

      // 4 KPI Cards
      expect(find.text('Active Drop'), findsOneWidget);
      expect(find.text('Payment Status'), findsOneWidget);
      expect(find.text('Direct Savings'), findsOneWidget);
      expect(find.text('Scheduled Drops'), findsOneWidget);

      // Active Drop Tracker Stepper
      expect(find.text('PRODUCE IN THIS DROP'), findsOneWidget);
      expect(find.text('Placed'), findsWidgets);
      expect(find.text('Confirmed'), findsWidgets);
      expect(find.text('Packed'), findsWidgets);
      expect(find.text('Transit'), findsWidgets);
      expect(find.text('Delivered'), findsWidgets);
      expect(find.textContaining('OTP: 4892'), findsOneWidget);
      expect(find.textContaining('Suresh Express'), findsOneWidget);

      // Direct to Farmer Transparency Index
      expect(find.textContaining('Transparency Index'), findsOneWidget);
      expect(find.textContaining('88%'), findsOneWidget);
      expect(find.text('Direct Farmer Payout'), findsOneWidget);
      expect(find.text('Middleman Cut'), findsOneWidget);
      expect(find.text('Avg Distance'), findsOneWidget);
    });

    testWidgets('Switches to Browse Produce tab, filters produce, and opens product details', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Tap on Browse Produce
      await tester.tap(find.text('Browse Produce'));
      await tester.pumpAndSettle();

      // Verify Browse search bar
      expect(find.byType(TextField), findsWidgets);

      // Category chips
      expect(find.text('All'), findsWidgets);
      expect(find.text('Vegetables'), findsOneWidget);
      expect(find.text('Fruits'), findsOneWidget);

      // Produce Cards
      expect(find.text('Organic Hybrid Tomatoes'), findsOneWidget);

      // Tap on a crop card to open detail sheet
      await tester.tap(find.text('Organic Hybrid Tomatoes'));
      await tester.pumpAndSettle();

      // Detail Sheet modal
      expect(find.text('One-Time Purchase'), findsOneWidget);
      expect(find.text('Auto-Delivery (Save 5%)'), findsOneWidget);
      expect(find.textContaining('Add to Basket'), findsOneWidget);

      // Tap Add to Basket
      await tester.ensureVisible(find.textContaining('Add to Basket'));
      await tester.pumpAndSettle();
      await tester.tap(find.textContaining('Add to Basket'));
      await tester.pumpAndSettle();

      // Floating Cart button should show Basket with kg and price
      expect(find.textContaining('Basket ('), findsOneWidget);
    });

    testWidgets('Switches to One Time Orders and Recurring Orders tabs', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Switch to One Time Orders
      await tester.tap(find.text('One Time Orders'));
      await tester.pumpAndSettle();

      expect(find.textContaining('One Time Orders'), findsWidgets);
      expect(find.text('All Orders'), findsOneWidget);
      expect(find.text('Delivered'), findsWidgets);

      // Switch to Recurring Orders
      await tester.tap(find.text('Recurring Orders'));
      await tester.pumpAndSettle();

      expect(find.text('Recurring Deliveries'), findsOneWidget);
      expect(find.text('Every Monday'), findsOneWidget);
      expect(find.text('Pause Plan'), findsWidgets);
    });

    testWidgets('Cart Drawer opens, displays items, and allows order placement', (WidgetTester tester) async {
      final authProvider = AuthProvider();
      final marketplaceProvider = MarketplaceProvider();
      // Pre-add item to cart
      marketplaceProvider.addToCart(marketplaceProvider.products.first, qty: 3);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<MarketplaceProvider>.value(value: marketplaceProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: ConsumerMarketplaceTab(),
            ),
          ),
        ),
      );
      await tester.pump();

      // Tap on floating basket button
      final basketFinder = find.textContaining('Basket (');
      expect(basketFinder, findsOneWidget);
      await tester.tap(basketFinder);
      await tester.pumpAndSettle();

      // Verify cart drawer contents
      expect(find.textContaining('Fresh Basket'), findsOneWidget);
      expect(find.text('One-Time Order'), findsOneWidget);
      expect(find.text('Auto-Delivery (Save 5%)'), findsOneWidget);
      expect(find.text('Place Order & Pay via UPI / Razorpay'), findsOneWidget);
    });
  });
}
