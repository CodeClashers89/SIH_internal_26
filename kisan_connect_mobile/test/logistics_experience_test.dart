import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/language_provider.dart';
import 'package:kisan_connect_mobile/providers/marketplace_provider.dart';
import 'package:kisan_connect_mobile/providers/farmer_provider.dart';
import 'package:kisan_connect_mobile/providers/logistics_provider.dart';
import 'package:kisan_connect_mobile/screens/logistics/logistics_tab.dart';

void main() {
  Widget createWidgetUnderTest({
    AuthProvider? authProvider,
    LogisticsProvider? logisticsProvider,
  }) {
    final auth = authProvider ?? AuthProvider();
    final logistics = logisticsProvider ?? LogisticsProvider();
    auth.switchRole('logistics_driver');

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: auth),
        ChangeNotifierProvider<LanguageProvider>(create: (_) => LanguageProvider()),
        ChangeNotifierProvider<MarketplaceProvider>(create: (_) => MarketplaceProvider()),
        ChangeNotifierProvider<FarmerProvider>(create: (_) => FarmerProvider()),
        ChangeNotifierProvider<LogisticsProvider>.value(value: logistics),
      ],
      child: const MaterialApp(
        home: Scaffold(
          body: LogisticsTab(),
        ),
      ),
    );
  }

  group('LogisticsTab Driver Hub Console Widget Tests', () {
    testWidgets('Renders top header, vehicle chips, and default Overview tab with KPIs and Transport Offers',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Top Header
      expect(find.text('Driver Hub Console'), findsOneWidget);
      expect(find.text('ONLINE 🟢'), findsOneWidget);

      // Sub Navigation Pills
      expect(find.byKey(const ValueKey('subnav_overview')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_available')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_active')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_delivery_map')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_completed')), findsOneWidget);
      expect(find.byKey(const ValueKey('subnav_vehicle')), findsOneWidget);

      // Direct Transport Offer Banner
      expect(find.text('Direct Transport Offer'), findsOneWidget);
      expect(find.text('Accept Offer'), findsOneWidget);
      expect(find.text('Decline'), findsOneWidget);

      // Lifetime Earnings Banner
      expect(find.text('Total Lifetime Earnings'), findsOneWidget);
      expect(find.text('Rate: ₹12/km'), findsOneWidget);

      // Performance Metrics Grid
      expect(find.text('Total Earnings'), findsOneWidget);
      expect(find.text('Deliveries Done'), findsOneWidget);
      expect(find.text('Total KM Driven'), findsOneWidget);
      expect(find.text('Active Shipments'), findsWidgets);
      expect(find.text('Available Jobs'), findsWidgets);
      expect(find.text('Avg per Delivery'), findsOneWidget);
    });

    testWidgets('Switches to Available Jobs tab and accepts a delivery job',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final logisticsProvider = LogisticsProvider();
      await tester.pumpWidget(createWidgetUnderTest(logisticsProvider: logisticsProvider));
      await tester.pump();

      // Switch to Available Jobs
      await tester.tap(find.byKey(const ValueKey('subnav_available')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Broadcast Delivery Feed'), findsOneWidget);
      expect(find.text('📋 NEW JOB'), findsWidgets);
      expect(find.text('Order #ORD-9920 Delivery'), findsOneWidget);

      // Accept the first job
      final acceptButton = find.text('Accept Delivery Job').first;
      await tester.ensureVisible(acceptButton);
      await tester.tap(acceptButton);
      await tester.pumpAndSettle();

      // Should automatically transition to Active Shipments
      expect(find.textContaining('Active Assigned Shipments'), findsOneWidget);
    });

    testWidgets('Active Shipments tab handles handover, transit, and OTP delivery verification',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final logisticsProvider = LogisticsProvider();
      await tester.pumpWidget(createWidgetUnderTest(logisticsProvider: logisticsProvider));
      await tester.pump();

      // Switch to Active Shipments
      await tester.tap(find.byKey(const ValueKey('subnav_active')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Active Assigned Shipments'), findsOneWidget);

      // Verify the in-transit shipment OTP verification box
      expect(find.textContaining('Delivery OTP sent to Buyer'), findsOneWidget);
      expect(find.text('Verify'), findsWidgets);

      // Enter OTP '4892' or '1234'
      final otpField = find.byType(TextField).first;
      await tester.ensureVisible(otpField);
      await tester.enterText(otpField, '4892');
      await tester.pumpAndSettle();

      final verifyBtn = find.text('Verify').first;
      await tester.tap(verifyBtn);
      await tester.pumpAndSettle();

      // Verify delivery completed snackbar
      expect(find.textContaining('OTP Verified!'), findsOneWidget);
    });

    testWidgets('Delivery Map & Route tab displays candidate routes, metrics, and accordions',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Switch to Delivery Map & Route
      await tester.tap(find.byKey(const ValueKey('subnav_delivery_map')));
      await tester.pumpAndSettle();

      expect(find.textContaining('ACTIVE DELIVERY: ORD-9842'), findsOneWidget);
      expect(find.text('Locate Me'), findsOneWidget);

      // Candidate routes
      expect(find.textContaining('Available Candidate Routes'), findsOneWidget);
      expect(find.textContaining('R1: NH-160'), findsOneWidget);
      expect(find.textContaining('R2: SH-44'), findsOneWidget);

      // Select candidate route R2
      await tester.tap(find.textContaining('R2: SH-44'));
      await tester.pumpAndSettle();

      // Primary metrics
      expect(find.text('Distance'), findsOneWidget);
      expect(find.text('Est Duration'), findsOneWidget);
      expect(find.text('ETA'), findsOneWidget);
      expect(find.text('Cargo Risk'), findsOneWidget);

      // AI recommendation and weather checkpoints
      expect(find.text('AI Route Recommendation Reasoning'), findsOneWidget);
      expect(find.textContaining('Weather Forecast Checkpoints'), findsOneWidget);

      // Recalculate routes button
      final recalcBtn = find.text('Recalculate Routes (Weather / Disruption)');
      await tester.ensureVisible(recalcBtn);
      await tester.tap(recalcBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      expect(find.textContaining('Route recalculated'), findsOneWidget);
    });

    testWidgets('Completed tab displays fulfillment history and earnings',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Switch to Completed
      await tester.tap(find.byKey(const ValueKey('subnav_completed')));
      await tester.pumpAndSettle();

      expect(find.text('Total Completed'), findsOneWidget);
      expect(find.text('Total Payout Earned'), findsOneWidget);
      expect(find.textContaining('Fulfillment History'), findsOneWidget);
      expect(find.text('Delivered'), findsWidgets);
    });

    testWidgets('Vehicle Profile tab allows viewing and editing fleet specifications',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1400, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump();

      // Switch to Vehicle Profile
      await tester.tap(find.byKey(const ValueKey('subnav_vehicle')));
      await tester.pumpAndSettle();

      expect(find.text('Vehicle & Fleet Registration'), findsOneWidget);
      expect(find.text('🚛 Vehicle Type'), findsOneWidget);
      expect(find.text('Edit Profile'), findsOneWidget);

      // Tap Edit Profile
      await tester.tap(find.text('Edit Profile'));
      await tester.pumpAndSettle();

      expect(find.text('Save Changes'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      // Modify vehicle type
      final vehicleTypeField = find.byType(TextField).first;
      await tester.enterText(vehicleTypeField, 'Tata Signa 2823 Insulated Truck');
      await tester.pumpAndSettle();

      // Tap Save Changes
      await tester.tap(find.text('Save Changes'));
      await tester.pumpAndSettle();

      expect(find.textContaining('saved successfully'), findsOneWidget);
      expect(find.text('Tata Signa 2823 Insulated Truck'), findsWidgets);
    });
  });
}
