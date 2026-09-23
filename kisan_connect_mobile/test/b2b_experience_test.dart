import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/language_provider.dart';
import 'package:kisan_connect_mobile/providers/marketplace_provider.dart';
import 'package:kisan_connect_mobile/providers/farmer_provider.dart';
import 'package:kisan_connect_mobile/providers/b2b_provider.dart';
import 'package:kisan_connect_mobile/screens/b2b/bulk_buyer_tab.dart';

void main() {
  Widget createWidgetUnderTest({
    AuthProvider? authProvider,
    B2BProvider? b2bProvider,
  }) {
    final auth = authProvider ?? AuthProvider();
    final b2b = b2bProvider ?? B2BProvider();
    auth.switchRole('bulk_buyer');

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: auth),
        ChangeNotifierProvider<LanguageProvider>(create: (_) => LanguageProvider()),
        ChangeNotifierProvider<MarketplaceProvider>(create: (_) => MarketplaceProvider()),
        ChangeNotifierProvider<FarmerProvider>(create: (_) => FarmerProvider()),
        ChangeNotifierProvider<B2BProvider>.value(value: b2b),
      ],
      child: const MaterialApp(
        home: Scaffold(
          body: BulkBuyerTab(),
        ),
      ),
    );
  }

  group('B2BProvider Unit & Logic Tests', () {
    late B2BProvider b2b;

    setUp(() {
      b2b = B2BProvider();
    });

    test('1. Initial demo data matches web wholesale portal state', () {
      expect(b2b.products.length, greaterThanOrEqualTo(5));
      expect(b2b.quotes.length, greaterThanOrEqualTo(3));
      expect(b2b.requirements.length, greaterThanOrEqualTo(2));
      expect(b2b.contracts.length, greaterThanOrEqualTo(3));
      expect(b2b.subscriptions.length, greaterThanOrEqualTo(2));

      // Unique farmers extraction
      expect(b2b.uniqueFarmers.length, greaterThanOrEqualTo(3));
      expect(b2b.uniqueFarmers.any((f) => f['username'] == 'Ramesh Patel'), isTrue);

      // Aggregation pool metrics
      final req = b2b.requirements.first;
      expect(req.targetQuantity, 5000.0);
      expect(req.totalPledged, 3500.0);
      expect(req.remainingNeeded, 1500.0);
      expect(req.progressPercent, 70);
    });

    test('2. Filter discovery: farmer, search, min stock, max price', () {
      // Filter by farmer
      b2b.setFilterFarmer('Ramesh Patel');
      expect(b2b.filteredProducts.every((p) => p.farmerUsername == 'Ramesh Patel'), isTrue);

      // Filter by search query
      b2b.resetFilters();
      b2b.setFilterProduct('Onion');
      expect(b2b.filteredProducts.every((p) => p.name.contains('Onion')), isTrue);

      // Filter by min stock
      b2b.resetFilters();
      b2b.setFilterMinQty('2000');
      expect(b2b.filteredProducts.every((p) => p.quantity >= 2000), isTrue);

      // Filter by max price
      b2b.resetFilters();
      b2b.setFilterMaxPrice('30');
      expect(b2b.filteredProducts.every((p) => p.pricePerUnit <= 30), isTrue);

      b2b.resetFilters();
      expect(b2b.filteredProducts.length, b2b.products.length);
    });

    test('3. Stock validation prevents inventory overbidding', () async {
      final prod = b2b.products.first; // Organic Sharbati Wheat has 1500 kg
      final failRes = await b2b.submitQuote(
        productId: prod.id,
        quantity: 99999.0, // Exceeds available stock
        targetPrice: 30.0,
      );
      expect(failRes['success'], isFalse);
      expect(failRes['error'], contains('exceeds farmer inventory stock'));

      final okRes = await b2b.submitQuote(
        productId: prod.id,
        quantity: 500.0,
        targetPrice: 42.0,
      );
      expect(okRes['success'], isTrue);
      expect(b2b.quotes.first.quantity, 500.0);
    });

    test('4. Counter-offer, accept quote, and contract reservation', () async {
      // Counter quote
      final quote = b2b.quotes.firstWhere((q) => q.status == 'offered');
      final counterRes = await b2b.counterQuote(quoteId: quote.id, targetPrice: 21.0);
      expect(counterRes['success'], isTrue);
      expect(quote.targetPrice, 21.0);
      expect(quote.status, 'pending');

      // Accept quote
      final acceptRes = await b2b.acceptQuote(quoteId: quote.id);
      expect(acceptRes['success'], isTrue);
      expect(quote.status, 'accepted');

      // Reserve pre-harvest contract
      final contract = b2b.contracts.firstWhere((c) => c.status == 'proposed');
      final reserveOk = await b2b.reserveContract(contractId: contract.id, buyerId: 10);
      expect(reserveOk, isTrue);
      expect(contract.status, 'accepted');
      expect(contract.buyerId, 10);
    });

    test('5. Create subscription and toggle active schedule', () async {
      final initialCount = b2b.subscriptions.length;
      await b2b.createSubscription(
        crop: "Capsicum (Green)",
        quantity: 120.0,
        pricePerUnit: 40.0,
        scheduleDay: "Tuesday",
      );
      expect(b2b.subscriptions.length, initialCount + 1);
      final newSub = b2b.subscriptions.first;
      expect(newSub.commodityName, "Capsicum (Green)");
      expect(newSub.isActive, isTrue);

      // Toggle active status
      await b2b.toggleSubscription(subscriptionId: newSub.id);
      expect(newSub.isActive, isFalse);
    });
  });

  group('BulkBuyerTab Mobile UI & Workflow Widget Tests', () {
    testWidgets('1. Renders Overview tab with Welcome Hero, KPIs, Recent Bids, and Recent Requirements',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Top bar title & actions
      expect(find.text('Bulk Buyer Dashboard'), findsOneWidget);
      expect(find.text('Sync Data'), findsOneWidget);

      // 5 Sub-navigation tabs
      expect(find.byKey(const ValueKey('subnav_dashboard')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_quotes')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_reverse')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_contracts')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_subscriptions')), findsOneWidget);

      // Welcome Banner
      expect(find.text('B2B PROCUREMENT HUB'), findsOneWidget);
      expect(find.textContaining('Welcome back'), findsOneWidget);
      expect(find.byKey(const ValueKey('btn_post_new_requirement_hero')), findsOneWidget);

      // 2 Quick Shortcuts Summary Cards
      expect(find.text('Recent Active Bids'), findsOneWidget);
      expect(find.text('Active Sourcing Requirements'), findsOneWidget);
    });

    testWidgets('2. Switches to Single Crop Bids tab, fills negotiation form, and interacts with log',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final b2b = B2BProvider();
      await tester.pumpWidget(createWidgetUnderTest(b2bProvider: b2b));
      await tester.pump();

      // Tap Single Crop Bids subnav
      await tester.tap(find.byKey(const ValueKey('subnav_quotes')));
      await tester.pumpAndSettle();

      expect(find.text('Single Crop Bids & Negotiations'), findsOneWidget);
      expect(find.text('Negotiate Specific Listing'), findsOneWidget);
      expect(find.text('Filter Farmers & Available Crops'), findsOneWidget);

      // Fill quote form
      await tester.enterText(find.byKey(const ValueKey('input_quote_quantity')), '300');
      await tester.enterText(find.byKey(const ValueKey('input_quote_price')), '21.50');
      await tester.pump();

      expect(find.textContaining('Target Total: ₹6450.00'), findsOneWidget);

      // Submit negotiation
      await tester.tap(find.byKey(const ValueKey('btn_initiate_negotiation')));
      await tester.pumpAndSettle();

      expect(find.text('Negotiation Log'), findsOneWidget);

      // Interacting with offered bid
      final offeredQuote = b2b.quotes.firstWhere((q) => q.status == 'offered');
      expect(find.byKey(ValueKey('btn_counter_${offeredQuote.id}')), findsOneWidget);
      expect(find.byKey(ValueKey('btn_accept_${offeredQuote.id}')), findsOneWidget);

      // Tap Accept on offered quote -> Opens Razorpay Gateway Simulator
      await tester.tap(find.byKey(ValueKey('btn_accept_${offeredQuote.id}')));
      await tester.pumpAndSettle();

      expect(find.text('Razorpay Gateway Simulator'), findsOneWidget);
      expect(find.text('Simulate Successful Payment'), findsOneWidget);

      // Simulate payment
      await tester.tap(find.text('Simulate Successful Payment'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.pumpAndSettle();

      expect(find.text('Wholesale Payment Confirmed! 🎉'), findsOneWidget);
      await tester.tap(find.text('View Dashboard & Logistics'));
      await tester.pumpAndSettle();
    });

    testWidgets('3. Switches to Reverse Sourcing tab, posts requirement, and verifies aggregation pool',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final b2b = B2BProvider();
      await tester.pumpWidget(createWidgetUnderTest(b2bProvider: b2b));
      await tester.pump();

      // Tap Reverse Sourcing subnav
      await tester.tap(find.byKey(const ValueKey('subnav_reverse')));
      await tester.pumpAndSettle();

      expect(find.text('Reverse Sourcing Demands'), findsOneWidget);
      expect(find.text('Post Bulk Sourcing Order'), findsOneWidget);

      // Fill requirement form
      await tester.enterText(find.byKey(const ValueKey('input_req_crop')), 'Potatoes');
      await tester.enterText(find.byKey(const ValueKey('input_req_qty')), '2000');
      await tester.pump();

      // Publish requirement
      await tester.tap(find.byKey(const ValueKey('btn_publish_requirement')));
      await tester.pumpAndSettle();

      // Verify Active Buying Pools and metric pills
      expect(find.text('Your Active Buying Pools'), findsOneWidget);
      expect(find.text('Order Aggregation Progress'), findsWidgets);
      expect(find.text('Total Target'), findsWidgets);
      expect(find.text('Pledged / Offered'), findsWidgets);
      expect(find.text('Remaining Needed'), findsWidgets);

      // Farmer offers accept & lock
      expect(find.textContaining('Accept & Lock'), findsWidgets);
    });

    testWidgets('4. Switches to Pre-Harvest Contracts tab and reserves a contract',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final b2b = B2BProvider();
      await tester.pumpWidget(createWidgetUnderTest(b2bProvider: b2b));
      await tester.pump();

      // Tap Pre-Harvest Contracts subnav
      await tester.tap(find.byKey(const ValueKey('subnav_contracts')));
      await tester.pumpAndSettle();

      expect(find.text('Pre-Harvest Forward Contracts'), findsOneWidget);
      expect(find.text('Pre-Harvest Contract Marketplace'), findsOneWidget);
      expect(find.text('Harvest Due Date'), findsWidgets);
      expect(find.text('Contract Price'), findsWidgets);

      // Reserve contract
      final proposedContract = b2b.contracts.firstWhere((c) => c.status == 'proposed');
      await tester.tap(find.byKey(ValueKey('btn_reserve_${proposedContract.id}')));
      await tester.pumpAndSettle();

      expect(proposedContract.status, 'accepted');
      expect(find.text('Reserved by You'), findsWidgets);
    });

    testWidgets('5. Switches to Recurring Subscriptions tab, creates subscription, and toggles schedule',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final b2b = B2BProvider();
      await tester.pumpWidget(createWidgetUnderTest(b2bProvider: b2b));
      await tester.pump();

      // Tap Recurring Subscriptions subnav
      await tester.tap(find.byKey(const ValueKey('subnav_subscriptions')));
      await tester.pumpAndSettle();

      expect(find.text('Recurring Produce Subscriptions'), findsOneWidget);
      expect(find.text('New Produce Subscription'), findsOneWidget);
      expect(find.text('Active Subscriptions'), findsOneWidget);

      // Create subscription
      await tester.enterText(find.byKey(const ValueKey('input_sub_crop')), 'Fresh Broccoli');
      await tester.enterText(find.byKey(const ValueKey('input_sub_qty')), '150');
      await tester.tap(find.byKey(const ValueKey('btn_create_subscription')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Fresh Broccoli'), findsOneWidget);

      // Toggle Pause/Resume on first subscription
      final firstSub = b2b.subscriptions.first;
      final initialActive = firstSub.isActive;
      await tester.tap(find.byKey(ValueKey('btn_toggle_sub_${firstSub.id}')));
      await tester.pumpAndSettle();

      expect(firstSub.isActive, !initialActive);
    });
  });
}
