import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/farmer_provider.dart';
import 'package:kisan_connect_mobile/providers/marketplace_provider.dart';
import 'package:kisan_connect_mobile/providers/b2b_provider.dart';
import 'package:kisan_connect_mobile/providers/logistics_provider.dart';
import 'package:kisan_connect_mobile/providers/language_provider.dart';
import 'package:kisan_connect_mobile/providers/ai_assistant_provider.dart';
import 'package:kisan_connect_mobile/screens/main_navigation_screen.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget buildTestApp(String role) {
    final auth = AuthProvider()..mockFallbackForTests = true;
    auth.switchRole(role);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: auth),
        ChangeNotifierProvider(create: (_) => FarmerProvider()),
        ChangeNotifierProvider(create: (_) => MarketplaceProvider()),
        ChangeNotifierProvider(create: (_) => B2BProvider()),
        ChangeNotifierProvider(create: (_) => LogisticsProvider()),
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
        ChangeNotifierProvider(create: (_) => AIAssistantProvider()),
      ],
      child: MaterialApp(
        home: MainNavigationScreen(
          onThemeToggle: () {},
          onLogout: () {},
        ),
      ),
    );
  }

  testWidgets('Bulk Buyer only sees B2B, Marketplace, Subscriptions (NO Farmer, Driver, or AI)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(buildTestApp('bulk_buyer'));
    await tester.pumpAndSettle();

    // Verify Role Badge
    expect(find.text('BULK BUYER'), findsOneWidget);

    // Verify Bulk Buyer bottom nav items
    expect(find.text('B2B Wholesale'), findsOneWidget);
    expect(find.text('Marketplace'), findsOneWidget);
    expect(find.text('Subscriptions'), findsOneWidget);

    // Verify Farmer, Driver, and Kisan AI are NOT in navigation
    expect(find.text('Farmer Dashboard'), findsNothing);
    expect(find.text('Driver Hub'), findsNothing);
    expect(find.text('Kisan AI'), findsNothing);
    expect(find.text('Kisan AI Mic'), findsNothing);
  });

  testWidgets('Farmer sees Farmer Hub and Kisan AI (AI is for Farmer)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(buildTestApp('farmer'));
    await tester.pumpAndSettle();

    // Verify Role Badge
    expect(find.text('FARMER'), findsOneWidget);

    // Verify Farmer bottom nav items
    expect(find.text('Farmer Dashboard'), findsOneWidget);
    expect(find.text('Kisan AI'), findsOneWidget);

    // Verify B2B Wholesale and Driver Hub are NOT in navigation
    expect(find.text('B2B Wholesale'), findsNothing);
    expect(find.text('Driver Hub'), findsNothing);

    // Verify AI Mic FAB is visible for farmer
    expect(find.text('Kisan AI Mic'), findsOneWidget);
  });

  testWidgets('Consumer only sees Marketplace and Subscriptions', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(buildTestApp('consumer'));
    await tester.pumpAndSettle();

    // Verify Role Badge
    expect(find.text('CONSUMER'), findsOneWidget);

    // Verify Consumer bottom nav items
    expect(find.text('Marketplace'), findsOneWidget);
    expect(find.text('Subscriptions'), findsOneWidget);

    // Verify Farmer, Driver, and Kisan AI are NOT visible
    expect(find.text('Farmer Dashboard'), findsNothing);
    expect(find.text('B2B Wholesale'), findsNothing);
    expect(find.text('Driver Hub'), findsNothing);
    expect(find.text('Kisan AI'), findsNothing);
    expect(find.text('Kisan AI Mic'), findsNothing);
  });

  testWidgets('Logistics Driver only sees Driver Hub without external bottom nav', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(buildTestApp('logistics_driver'));
    await tester.pumpAndSettle();

    // Verify Role Badge
    expect(find.text('LOGISTICS'), findsOneWidget);

    // Verify Farmer, B2B Wholesale, and Kisan AI are NOT visible
    expect(find.text('Farmer Dashboard'), findsNothing);
    expect(find.text('B2B Wholesale'), findsNothing);
    expect(find.text('Kisan AI'), findsNothing);
    expect(find.text('Kisan AI Mic'), findsNothing);
  });
}
