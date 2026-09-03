import 'package:flutter/material.dart';

class SubscriptionsTab extends StatefulWidget {
  const SubscriptionsTab({super.key});

  @override
  State<SubscriptionsTab> createState() => _SubscriptionsTabState();
}

class _SubscriptionsTabState extends State<SubscriptionsTab> {
  final List<Map<String, dynamic>> _plans = [
    {
      'title': 'Weekly Fresh Organic Basket',
      'frequency': 'Every Monday Morning',
      'items': '5 kg Organic Vegetables + 2 kg Seasonal Fruits',
      'price': '₹450 / week',
      'discount': 'Save 15%',
      'active': true,
    },
    {
      'title': 'Daily Pure Farm Milk & Eggs',
      'frequency': 'Daily 6:30 AM',
      'items': '2L A2 Gir Cow Milk + 6 Free-Range Eggs',
      'price': '₹160 / day',
      'discount': 'Save 10%',
      'active': false,
    },
    {
      'title': 'B2B Restaurant Kitchen Supply',
      'frequency': '3 Times Weekly (Mon, Wed, Fri)',
      'items': '50 kg Tomatoes + 30 kg Onions + 20 kg Potatoes',
      'price': '₹2,800 / delivery',
      'discount': 'Bulk 20% Off',
      'active': false,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Auto-Delivery Subscriptions"),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _plans.length,
        itemBuilder: (ctx, idx) {
          final plan = _plans[idx];
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: plan['active'] ? const Color(0xFF16A34A) : Colors.grey.withOpacity(0.2),
                width: plan['active'] ? 2 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(plan['title'], style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(plan['discount'], style: const TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.update, size: 16, color: Color(0xFF16A34A)),
                    const SizedBox(width: 6),
                    Text(plan['frequency'], style: const TextStyle(fontSize: 13, color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                Text("Includes: ${plan['items']}", style: const TextStyle(fontSize: 13, color: Colors.grey)),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(plan['price'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          plan['active'] = !plan['active'];
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(plan['active'] ? "✅ Subscription activated!" : "Subscription paused."),
                            backgroundColor: const Color(0xFF16A34A),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: plan['active'] ? Colors.grey[700] : const Color(0xFF16A34A),
                      ),
                      child: Text(plan['active'] ? "Pause Plan" : "Subscribe Now"),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
