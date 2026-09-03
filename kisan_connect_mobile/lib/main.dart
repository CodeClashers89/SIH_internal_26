import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/marketplace_provider.dart';
import 'providers/b2b_provider.dart';
import 'providers/logistics_provider.dart';
import 'providers/language_provider.dart';
import 'providers/ai_assistant_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_signup_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
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
}

class KisanConnectApp extends StatefulWidget {
  const KisanConnectApp({super.key});

  @override
  State<KisanConnectApp> createState() => _KisanConnectAppState();
}

class _KisanConnectAppState extends State<KisanConnectApp> {
  bool _showSplash = true;
  ThemeMode _themeMode = ThemeMode.light;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return MaterialApp(
      title: 'KisanConnect Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: _themeMode,
      home: _showSplash
          ? SplashScreen(
              onComplete: () {
                setState(() {
                  _showSplash = false;
                });
              },
            )
          : auth.isAuthenticated
              ? MainNavigationScreen(
                  onThemeToggle: _toggleTheme,
                  onLogout: () {
                    auth.logout();
                  },
                )
              : LoginSignupScreen(
                  onLoginSuccess: () {
                    // Authenticated state handles view
                  },
                ),
    );
  }
}
