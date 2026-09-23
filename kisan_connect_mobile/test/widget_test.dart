import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kisan_connect_mobile/main.dart';
import 'package:kisan_connect_mobile/providers/auth_provider.dart';
import 'package:kisan_connect_mobile/providers/marketplace_provider.dart';
import 'package:kisan_connect_mobile/providers/b2b_provider.dart';
import 'package:kisan_connect_mobile/providers/logistics_provider.dart';
import 'package:kisan_connect_mobile/providers/language_provider.dart';
import 'package:kisan_connect_mobile/providers/ai_assistant_provider.dart';
import 'package:kisan_connect_mobile/screens/login_signup_screen.dart';

void main() {
  testWidgets('KisanConnect App Boot Smoke Test and LoginScreen render', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => MarketplaceProvider()),
          ChangeNotifierProvider(create: (_) => B2BProvider()),
          ChangeNotifierProvider(create: (_) => LogisticsProvider()),
          ChangeNotifierProvider(create: (_) => LanguageProvider()),
          ChangeNotifierProvider(create: (_) => AIAssistantProvider()),
        ],
        child: const KisanConnectApp(),
      ),
    );

    // Initial pump
    await tester.pump();
    expect(find.byType(KisanConnectApp), findsOneWidget);

    // Advance clock past splash screen delay (2200ms)
    await tester.pump(const Duration(milliseconds: 2500));
    await tester.pumpAndSettle();

    // Verify LoginSignupScreen is displayed
    expect(find.byType(LoginSignupScreen), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Log In'), findsOneWidget);
  });
}
