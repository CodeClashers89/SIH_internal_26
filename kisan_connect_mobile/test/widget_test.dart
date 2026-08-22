import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kisan_connect_mobile/main.dart';

void main() {
  testWidgets('KisanConnect App Boot Smoke Test', (WidgetTester tester) async {
    // Set initial mock values for SharedPreferences
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    // Build our app and trigger a frame.
    await tester.pumpWidget(MyApp(prefs: prefs));

    // Wait for providers and authentication load
    await tester.pumpAndSettle();

    // Verify that the login screen is rendered (Welcome Back text or branding logo)
    expect(find.byIcon(Icons.spa), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);
  });
}
