import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/screens/login_signup_screen.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget createAuthWidget({VoidCallback? onSuccess, bool mockFallback = true}) {
    return ChangeNotifierProvider<AuthProvider>(
      create: (_) => AuthProvider()..mockFallbackForTests = mockFallback,
      child: MaterialApp(
        home: LoginSignupScreen(
          onLoginSuccess: onSuccess ?? () {},
        ),
      ),
    );
  }

  testWidgets('1. Clean Login screen renders properly without quick demo roles', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(createAuthWidget());
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('USERNAME'), findsOneWidget);
    expect(find.text('PASSWORD'), findsOneWidget);
    expect(find.text('Log In'), findsOneWidget);
    expect(find.text('Sign Up'), findsOneWidget);
    expect(find.text('Forgot password?'), findsOneWidget);
    // Verify quick demo shortcuts have been completely removed
    expect(find.text('🌾 Farmer'), findsNothing);
    expect(find.text('🛒 Consumer'), findsNothing);
  });

  testWidgets('2. Switch to Sign Up screen and dynamic role fields render', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(createAuthWidget());
    await tester.pumpAndSettle();

    // Ensure Sign Up button is visible and tap it
    await tester.ensureVisible(find.text('Sign Up'));
    await tester.tap(find.text('Sign Up'));
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('Register & Request OTP'), findsOneWidget);
    expect(find.text('SELECT USER ROLE'), findsOneWidget);

    // Default role is consumer (no extra dynamic role card)
    expect(find.text('FARMER ONBOARDING DETAILS'), findsNothing);

    // Switch role to farmer via dropdown
    await tester.ensureVisible(find.text('Consumer (Buy Retail)'));
    await tester.tap(find.text('Consumer (Buy Retail)'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Farmer / FPO (Sell Produce)').last);
    await tester.pumpAndSettle();

    // Farmer onboarding details should now be visible
    expect(find.text('FARMER ONBOARDING DETAILS'), findsOneWidget);
    expect(find.text('Farm Size (Acres)'), findsOneWidget);
    expect(find.text('Crops Grown'), findsOneWidget);
    expect(find.text('Locate'), findsOneWidget);
  });

  testWidgets('3. Forgot password navigation from Login screen', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(createAuthWidget());
    await tester.pumpAndSettle();

    // Tap 'Forgot password?'
    await tester.ensureVisible(find.text('Forgot password?'));
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();

    expect(find.text('Reset Password'), findsOneWidget);
    expect(find.text('REGISTERED MOBILE NUMBER'), findsOneWidget);
    expect(find.text('SECURITY CAPTCHA'), findsOneWidget);
    expect(find.text('Send Verification OTP'), findsOneWidget);
    expect(find.text('← Back to Log In'), findsOneWidget);
  });

  testWidgets('4. Successful Login triggers onLoginSuccess callback', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    bool loginSucceeded = false;
    await tester.pumpWidget(createAuthWidget(onSuccess: () {
      loginSucceeded = true;
    }));
    await tester.pumpAndSettle();

    // Enter credentials into empty fields
    final textFields = find.byType(TextFormField);
    await tester.enterText(textFields.at(0), 'farmer1');
    await tester.enterText(textFields.at(1), '123456');

    await tester.ensureVisible(find.text('Log In'));
    await tester.tap(find.text('Log In'));
    await tester.pumpAndSettle();

    expect(loginSucceeded, isTrue);
  });
}
