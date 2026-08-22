import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Theme
import 'theme/app_theme.dart';

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
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
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

    // 1. Show a beautiful pulsing logo loader while loading auth state
    if (auth.loading) {
      return Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF090D16), Color(0xFF064E3B), Color(0xFF090D16)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.8, end: 1.15),
                  duration: const Duration(milliseconds: 900),
                  builder: (context, scale, child) {
                    return Transform.scale(
                      scale: scale,
                      child: child,
                    );
                  },
                  onEnd: () {},
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withOpacity(0.3),
                          blurRadius: 35,
                          spreadRadius: 10,
                        ),
                      ],
                      gradient: AppTheme.brandGradient,
                    ),
                    child: const Icon(Icons.spa, color: Colors.white, size: 48),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'KisanConnect',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.extrabold,
                    letterSpacing: 1.2,
                    fontFamily: 'SpaceGrotesk',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Decentralized Agri-Tech Platform',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2.2,
                  ),
                ),
                const SizedBox(height: 48),
                SizedBox(
                  width: 120,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: const LinearProgressIndicator(
                      backgroundColor: Colors.white10,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                      minHeight: 3,
                    ),
                  ),
                ),
              ],
            ),
          ),
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
