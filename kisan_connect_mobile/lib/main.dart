import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Providers
import 'providers/api_config_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';

// Services
import 'services/api_client.dart';

// Screens
import 'screens/login_signup_screen.dart';
import 'screens/consumer_marketplace_screen.dart';
import 'screens/farmer_dashboard_screen.dart';
import 'screens/bulk_buyer_portal_screen.dart';
import 'screens/logistics_dashboard_screen.dart';
import 'screens/admin_panel_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize SharedPreferences once at startup
  final prefs = await SharedPreferences.getInstance();

  runApp(MyApp(prefs: prefs));
}

class MyApp extends StatelessWidget {
  final SharedPreferences prefs;

  const MyApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // 1. API Configuration Provider
        ChangeNotifierProvider(create: (_) => ApiConfigProvider(prefs)),
        
        // 2. Auth Provider depends on API Config and SharedPreferences
        ChangeNotifierProxyProvider2<ApiConfigProvider, ApiConfigProvider, AuthProvider>(
          create: (ctx) {
            final config = Provider.of<ApiConfigProvider>(ctx, listen: false);
            final client = ApiClient(prefs, () => config.baseUrl);
            return AuthProvider(prefs, client);
          },
          update: (ctx, config, _, auth) {
            // Re-instantiate ApiClient when baseUrl changes
            if (auth == null) {
              final client = ApiClient(prefs, () => config.baseUrl);
              return AuthProvider(prefs, client);
            }
            return auth;
          },
        ),

        // 3. Cart Provider manages consumer basket
        ChangeNotifierProvider(create: (_) => CartProvider(prefs)),
      ],
      child: MaterialApp(
        title: 'KisanConnect',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF059669),
            primary: const Color(0xFF059669),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          cardTheme: CardThemeData(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 1,
          ),
        ),
        home: const AppNavigationShell(),
      ),
    );
  }
}

class AppNavigationShell extends StatelessWidget {
  const AppNavigationShell({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    // 1. Show loader while state loads
    if (auth.loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    // 2. Show Login Screen if not authenticated
    if (!auth.isLoggedIn) {
      return const LoginSignupScreen();
    }

    // 3. Show correct screen based on role
    final role = auth.role;
    switch (role) {
      case 'farmer':
        return const FarmerDashboardScreen();
      case 'bulk_buyer':
        return const BulkBuyerPortalScreen();
      case 'logistics_partner':
        return const LogisticsDashboardScreen();
      case 'admin':
        return const AdminPanelScreen();
      case 'consumer':
      default:
        return const ConsumerMarketplaceScreen();
    }
  }
}
