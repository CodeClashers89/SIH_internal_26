import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import 'farmer/farmer_dashboard_tab.dart';
import 'marketplace/consumer_marketplace_tab.dart';
import 'b2b/bulk_buyer_tab.dart';
import 'logistics/logistics_tab.dart';
import 'ai_assistant/farmer_ai_screen.dart';
import 'subscriptions/subscriptions_tab.dart';
import 'admin/admin_control_tab.dart';

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onThemeToggle;
  final VoidCallback onLogout;

  const MainNavigationScreen({
    super.key,
    required this.onThemeToggle,
    required this.onLogout,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final lang = Provider.of<LanguageProvider>(context);

    final List<Widget> tabs = [
      const FarmerDashboardTab(),
      const ConsumerMarketplaceTab(),
      const BulkBuyerTab(),
      const LogisticsTab(),
      const FarmerAIScreen(),
      const SubscriptionsTab(),
      if (auth.userRole == 'admin') const AdminControlTab(),
    ];

    final List<BottomNavigationBarItem> navItems = [
      BottomNavigationBarItem(
        icon: const Icon(Icons.agriculture_rounded),
        label: lang.getText('farmer_dashboard'),
      ),
      BottomNavigationBarItem(
        icon: const Icon(Icons.storefront_rounded),
        label: lang.getText('marketplace'),
      ),
      BottomNavigationBarItem(
        icon: const Icon(Icons.gavel_rounded),
        label: lang.getText('bulk_b2b'),
      ),
      BottomNavigationBarItem(
        icon: const Icon(Icons.local_shipping_rounded),
        label: lang.getText('logistics'),
      ),
      BottomNavigationBarItem(
        icon: const Icon(Icons.smart_toy_rounded),
        label: "Kisan AI",
      ),
      BottomNavigationBarItem(
        icon: const Icon(Icons.autorenew_rounded),
        label: "Subscriptions",
      ),
      if (auth.userRole == 'admin')
        const BottomNavigationBarItem(
          icon: Icon(Icons.admin_panel_settings_rounded),
          label: "Admin",
        ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFF16A34A),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.agriculture_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 8),
            Text(
              lang.getText('app_title'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          // Language Picker
          PopupMenuButton<AppLanguage>(
            icon: const Icon(Icons.language_rounded),
            tooltip: "Change Language",
            onSelected: (selectedLang) {
              lang.setLanguage(selectedLang);
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: AppLanguage.english, child: Text("English")),
              const PopupMenuItem(value: AppLanguage.hindi, child: Text("हिन्दी (Hindi)")),
              const PopupMenuItem(value: AppLanguage.gujarati, child: Text("ગુજરાતી (Gujarati)")),
              const PopupMenuItem(value: AppLanguage.marathi, child: Text("मराठी (Marathi)")),
            ],
          ),

          // Role Switcher Dropdown (Demo Helper)
          PopupMenuButton<String>(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: "Switch Demo Role",
            onSelected: (role) {
              auth.switchRole(role);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text("Switched active persona to ${auth.currentUser.name} (${role.toUpperCase()})"),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'farmer', child: Text("🌾 Farmer Persona")),
              const PopupMenuItem(value: 'consumer', child: Text("🛒 Consumer Persona")),
              const PopupMenuItem(value: 'bulk_buyer', child: Text("🏢 Bulk Buyer (B2B)")),
              const PopupMenuItem(value: 'logistics_driver', child: Text("🚚 Driver Persona")),
              const PopupMenuItem(value: 'admin', child: Text("🛡️ Platform Admin")),
            ],
          ),

          // Theme Toggle
          IconButton(
            icon: Icon(Theme.of(context).brightness == Brightness.dark ? Icons.light_mode : Icons.dark_mode),
            onPressed: widget.onThemeToggle,
            tooltip: "Toggle Theme",
          ),

          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: widget.onLogout,
            tooltip: "Logout",
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex < tabs.length ? _currentIndex : 0,
        children: tabs,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex < navItems.length ? _currentIndex : 0,
        onTap: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF16A34A),
        unselectedItemColor: Colors.grey,
        items: navItems,
      ),
      floatingActionButton: _currentIndex != 4
          ? FloatingActionButton.extended(
              onPressed: () {
                setState(() {
                  _currentIndex = 4; // Switch to Kisan AI Tab
                });
              },
              backgroundColor: const Color(0xFF16A34A),
              icon: const Icon(Icons.mic, color: Colors.white),
              label: const Text("Kisan AI Mic", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }
}
