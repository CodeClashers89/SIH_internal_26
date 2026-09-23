import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/farmer_provider.dart';
import 'package:kisan_connect_mobile/screens/farmer/farmer_dashboard_tab.dart';
import 'package:provider/provider.dart';

void main() {
  group('FarmerProvider State & Operations Tests', () {
    late FarmerProvider farmer;

    setUp(() {
      farmer = FarmerProvider();
    });

    test('1. Initial demo data matches website state', () {
      expect(farmer.stats.totalEarnings, 84250.0);
      expect(farmer.stats.activeListingsCount, 4);
      expect(farmer.stats.mandiAdvantage, 3.50);
      expect(farmer.stats.trustScore, 96);
      expect(farmer.showFreshnessAlert, isTrue);

      expect(farmer.crops.length, greaterThanOrEqualTo(4));
      expect(farmer.orders.length, greaterThanOrEqualTo(3));
      expect(farmer.quotes.length, greaterThanOrEqualTo(3));
      expect(farmer.bulkDemands.length, greaterThanOrEqualTo(3));
      expect(farmer.myOffers.length, greaterThanOrEqualTo(1));
      expect(farmer.contracts.length, greaterThanOrEqualTo(2));
      expect(farmer.mandiPrices.length, greaterThanOrEqualTo(4));
      expect(farmer.unreadNotificationsCount, greaterThanOrEqualTo(1));
    });

    test('2. Respond to Wholesale Quote works (Counter, Accept, Reject)', () async {
      final quoteId = farmer.quotes.first.id;

      // Counter offer
      await farmer.counterQuote(quoteId, 32.5, null);
      final updatedCounter = farmer.quotes.firstWhere((q) => q.id == quoteId);
      expect(updatedCounter.status, 'countered');
      expect(updatedCounter.counterPrice, 32.5);

      // Accept
      await farmer.acceptQuote(quoteId, null);
      final updatedAccepted = farmer.quotes.firstWhere((q) => q.id == quoteId);
      expect(updatedAccepted.status, 'accepted');

      // Reject
      await farmer.rejectQuote(quoteId, null);
      final updatedRejected = farmer.quotes.firstWhere((q) => q.id == quoteId);
      expect(updatedRejected.status, 'rejected');
    });

    test('3. Submit Offer for Bulk Demand works', () async {
      final initialOfferCount = farmer.myOffers.length;
      await farmer.submitOffer(
        demandId: 'BD-88',
        cropName: 'Yellow Mustard Seeds',
        proposedQty: 2000.0,
        proposedPrice: 56.0,
        deliveryDate: 'Oct 24, 2026',
      );
      expect(farmer.myOffers.length, initialOfferCount + 1);
      expect(farmer.myOffers.first.demandId, 'BD-88');
      expect(farmer.myOffers.first.proposedPricePerKg, 56.0);
    });

    test('4. Propose Pre-Harvest Contract works', () async {
      final initialContracts = farmer.contracts.length;
      await farmer.proposeContract(
        cropName: 'Organic Wheat (Sharbati)',
        quantity: 5000.0,
        guaranteedPrice: 38.0,
        harvestDate: 'Dec 2026',
      );
      expect(farmer.contracts.length, initialContracts + 1);
      expect(farmer.contracts.first.cropName, 'Organic Wheat (Sharbati)');
      expect(farmer.contracts.first.status, 'draft');
    });

    test('5. Add and Delete Crop Harvest Lot works', () async {
      final initialCrops = farmer.crops.length;
      final newCrop = FarmerCrop(
        id: 'crop_test_99',
        title: 'Fresh Broccoli',
        category: 'Vegetables',
        pricePerKg: 65.0,
        availableQuantityKg: 200.0,
        mandiBenchmarkPrice: 55.0,
        freshnessScore: 95.0,
        harvestDate: 'Today',
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea',
        isColdStorage: true,
        sourceLand: 'Plot Green (1 Acre)',
      );
      await farmer.addCrop(newCrop, null);
      expect(farmer.crops.length, initialCrops + 1);
      final added = farmer.crops.first;
      expect(added.title, 'Fresh Broccoli');
      expect(added.isColdStorage, true);

      await farmer.deleteCrop(added.id, null);
      expect(farmer.crops.length, initialCrops);
    });

    test('6. Order status update works', () async {
      final order = farmer.orders.first;
      await farmer.updateOrderStatus(order.id, 'confirmed', null);
      final updated = farmer.orders.firstWhere((o) => o.id == order.id);
      expect(updated.status, 'confirmed');
    });

    test('7. Spoilage discount action reduces crop price', () {
      final mango = farmer.crops.firstWhere((c) => c.freshnessScore <= 40);
      expect(mango.pricePerKg, 180.0);
      farmer.updateCropPrice(mango.id, 180.0 * 0.9);
      final updated = farmer.crops.firstWhere((c) => c.id == mango.id);
      expect(updated.pricePerKg, 162.0);
    });

    test('8. Notifications mark all as read', () {
      expect(farmer.unreadNotificationsCount, greaterThan(0));
      farmer.markAllNotificationsAsRead();
      expect(farmer.unreadNotificationsCount, 0);
    });

    test('9. KYC verification update elevates trust score', () async {
      expect(farmer.stats.trustScore, 96);
      await farmer.submitKyc('Aadhaar / 7-12 Extract', null);
      expect(farmer.stats.trustScore, 98);
    });
  });

  group('FarmerDashboardTab Widget Rendering Tests', () {
    testWidgets('Renders top sub-navigation bar with all modules and default Overview', (WidgetTester tester) async {
      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();

      // Verify Header profile & badge
      expect(find.textContaining('Namaste'), findsOneWidget);
      expect(find.text('KYC OK'), findsOneWidget);

      // Verify sub navigation modules exist in horizontal pill bar
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Crop Inventory'), findsOneWidget);
      expect(find.text('Orders & Route'), findsOneWidget);

      // Verify default Overview Section contents
      expect(find.text('₹84250'), findsOneWidget);
      expect(find.text('Monthly Earnings'), findsOneWidget);
      expect(find.text('Active Crop Lots'), findsOneWidget);
      expect(find.text('Pending Bids'), findsOneWidget);
      expect(find.text('Mandi Advantage'), findsOneWidget);
      expect(find.textContaining('Demand Forecast'), findsOneWidget);
      expect(find.textContaining('SPOILAGE RISK'), findsOneWidget);
    });

    testWidgets('Switches to Crop Inventory and shows Produce with Add Produce button', (WidgetTester tester) async {
      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();

      // Tap on Crop Inventory tab
      await tester.tap(find.text('Crop Inventory'));
      await tester.pumpAndSettle();

      // Verify inventory elements
      expect(find.text('My Crop Listings'), findsOneWidget);
      expect(find.text('Add Produce'), findsOneWidget);
      expect(find.text('Organic Hybrid Tomatoes'), findsOneWidget);
    });

    testWidgets('Switches to Wholesale Bids and verifies Bids render with Accept & Counter', (WidgetTester tester) async {
      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();

      // Tap on Wholesale Bids tab
      await tester.tap(find.text('Wholesale Bids'));
      await tester.pumpAndSettle();

      // Verify Wholesale Bids section
      expect(find.text('Wholesale Bids & Negotiations'), findsOneWidget);
      expect(find.text('FreshMart Supermarkets'), findsOneWidget);
      expect(find.text('Accept'), findsWidgets);
      expect(find.text('Counter Offer'), findsWidgets);
    });

    testWidgets('Floating Kisan AI button renders and is accessible', (WidgetTester tester) async {
      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.text('Kisan AI Assistant'), findsOneWidget);
    });

    testWidgets('Switches to Mandi Rates and verifies GPS locator & Commodity chips', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(2000, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();

      await tester.tap(find.text('Mandi Rates').first);
      await tester.pumpAndSettle();

      expect(find.text('APMC Mandi Rates & Nearest Explorer'), findsOneWidget);
      expect(find.text('Nearest APMC Mandi Finder'), findsOneWidget);
      expect(find.text('Find Nearest (GPS)'), findsOneWidget);
      expect(find.text('All Commodities'), findsOneWidget);
      expect(find.text('🍅 Tomatoes'), findsOneWidget);

      // Tap GPS button
      await tester.tap(find.text('Find Nearest (GPS)'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Pune APMC'), findsWidgets);
    });

    testWidgets('Switches to Profile & KYC and displays farm identity & bank settlement', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(2000, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final authProvider = AuthProvider();
      final farmerProvider = FarmerProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<FarmerProvider>.value(value: farmerProvider),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FarmerDashboardTab(),
            ),
          ),
        ),
      );

      await tester.pump();

      await tester.tap(find.text('Profile & KYC'));
      await tester.pumpAndSettle();

      expect(find.text('Farmer Farm Profile & KYC'), findsOneWidget);
      expect(find.text('Edit Profile'), findsOneWidget);
      expect(find.text('Direct Bank Settlement & Escrow'), findsOneWidget);
      expect(find.text('KYC Verification Status'), findsOneWidget);
      expect(find.text('VERIFIED ✓'), findsOneWidget);
    });
  });
}
