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
  String _lastRole = '';

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    _lastRole = auth.userRole;
    _currentIndex = 0;
  }

  Color _getRoleBadgeColor(String role) {
    switch (role) {
      case 'farmer':
        return const Color(0xFF16A34A);
      case 'bulk_buyer':
        return const Color(0xFF047857);
      case 'consumer':
        return const Color(0xFF2563EB);
      case 'logistics_driver':
      case 'logistics_partner':
        return const Color(0xFFD97706);
      case 'admin':
        return const Color(0xFF7C3AED);
      default:
        return const Color(0xFF16A34A);
    }
  }

  String _formatRoleLabel(String role) {
    switch (role) {
      case 'farmer':
        return 'FARMER';
      case 'bulk_buyer':
        return 'BULK BUYER';
      case 'consumer':
        return 'CONSUMER';
      case 'logistics_driver':
      case 'logistics_partner':
        return 'LOGISTICS';
      case 'admin':
        return 'ADMIN';
      default:
        return role.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final lang = Provider.of<LanguageProvider>(context);

    // If role changed externally, reset tab index
    if (auth.userRole != _lastRole) {
      _lastRole = auth.userRole;
      _currentIndex = 0;
    }

    final String role = auth.userRole;
    final List<Widget> tabs;
    final List<BottomNavigationBarItem> navItems;

    if (role == 'bulk_buyer') {
      // Bulk Buyer Portal (matches web: B2B Enterprise Hub, Marketplace, Subscriptions)
      tabs = const [
        BulkBuyerTab(),
        ConsumerMarketplaceTab(),
        SubscriptionsTab(),
      ];
      navItems = [
        BottomNavigationBarItem(
          icon: const Icon(Icons.gavel_rounded),
          label: lang.getText('bulk_b2b'),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.storefront_rounded),
          label: lang.getText('marketplace'),
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.autorenew_rounded),
          label: "Subscriptions",
        ),
      ];
    } else if (role == 'consumer') {
      // Consumer Portal (matches web: Marketplace, Subscriptions)
      tabs = const [
        ConsumerMarketplaceTab(),
        SubscriptionsTab(),
      ];
      navItems = [
        BottomNavigationBarItem(
          icon: const Icon(Icons.storefront_rounded),
          label: lang.getText('marketplace'),
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.autorenew_rounded),
          label: "Subscriptions",
        ),
      ];
    } else if (role == 'logistics_driver' || role == 'logistics_partner') {
      // Driver Hub (contains all 6 submodules internally: Overview, Available, Active, Route Map, Completed, Fleet Profile)
      tabs = const [
        LogisticsTab(),
      ];
      navItems = [];
    } else if (role == 'admin') {
      // Admin Console (Platform Control Tower, Telemetry, and overview access)
      tabs = const [
        AdminControlTab(),
        FarmerDashboardTab(),
        ConsumerMarketplaceTab(),
        BulkBuyerTab(),
        LogisticsTab(),
      ];
      navItems = [
        const BottomNavigationBarItem(
          icon: Icon(Icons.admin_panel_settings_rounded),
          label: "Admin",
        ),
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
      ];
    } else {
      // Default: Farmer ("ai is for farmer")
      tabs = const [
        FarmerDashboardTab(),
        FarmerAIScreen(),
      ];
      navItems = [
        BottomNavigationBarItem(
          icon: const Icon(Icons.agriculture_rounded),
          label: lang.getText('farmer_dashboard'),
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.smart_toy_rounded),
          label: "Kisan AI",
        ),
      ];
    }

    final int safeIndex = _currentIndex < tabs.length ? _currentIndex : 0;

    // AI Mic FAB is ONLY for Farmers
    final bool isFarmer = role == 'farmer';
    final int aiIndex = 1;
    final Widget? fab = (isFarmer && safeIndex != aiIndex)
        ? FloatingActionButton.extended(
            onPressed: () {
              setState(() {
                _currentIndex = aiIndex;
              });
            },
            backgroundColor: const Color(0xFF16A34A),
            icon: const Icon(Icons.mic, color: Colors.white),
            label: const Text(
              "Kisan AI Mic",
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          )
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Color(0xFF16A34A),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.agriculture_rounded, color: Colors.white, size: 16),
                ),
                const SizedBox(width: 6),
                Text(
                  lang.getText('app_title'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: _getRoleBadgeColor(role).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: _getRoleBadgeColor(role).withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    _formatRoleLabel(role),
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: _getRoleBadgeColor(role),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    auth.currentUser.name.isNotEmpty ? auth.currentUser.name : auth.currentUser.username,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
              ],
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
        index: safeIndex,
        children: tabs,
      ),
      bottomNavigationBar: navItems.length >= 2
          ? BottomNavigationBar(
              currentIndex: safeIndex,
              onTap: (idx) {
                setState(() {
                  _currentIndex = idx;
                });
              },
              type: BottomNavigationBarType.fixed,
              selectedItemColor: const Color(0xFF16A34A),
              unselectedItemColor: Colors.grey,
              items: navItems,
            )
          : null,
      floatingActionButton: fab,
    );
  }
}
