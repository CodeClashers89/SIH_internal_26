import 'package:flutter/material.dart';

class AdminControlTab extends StatefulWidget {
  const AdminControlTab({super.key});

  @override
  State<AdminControlTab> createState() => _AdminControlTabState();
}

class _AdminControlTabState extends State<AdminControlTab> {
  final List<Map<String, dynamic>> _kycQueue = [
    {
      'id': 'kyc-1',
      'name': 'Kishan Patel (Farmer)',
      'document': 'Aadhaar + Land Registry APMC #882',
      'location': 'Kheda, Gujarat',
      'status': 'Pending Approval',
    },
    {
      'id': 'kyc-2',
      'name': 'Gujarat Agro Fresh Ltd (Bulk Buyer)',
      'document': 'GSTIN 24AAAAA0000A1Z5 + FSSAI',
      'location': 'Ahmedabad Hub',
      'status': 'Pending Approval',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("SIH Admin Control Tower"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Platform Stats
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                _buildMetricCard("Registered Farmers", "1,420", "+28 today", Icons.people, const Color(0xFF16A34A)),
                _buildMetricCard("GMV Transacted", "₹14.8 Lakhs", "Direct Sales", Icons.currency_rupee, const Color(0xFF0284C7)),
                _buildMetricCard("Active Logistics", "84 Drivers", "Avg 28 min delivery", Icons.local_shipping, const Color(0xFFEA580C)),
                _buildMetricCard("Supabase DB Status", "Connected 🟢", "PostgreSQL Live", Icons.dns, const Color(0xFF9333EA)),
              ],
            ),

            const SizedBox(height: 24),

            // Pending KYC Queue
            const Text("🛡️ Pending Farmer & Buyer KYC Approvals", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            ..._kycQueue.map((item) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(item['name'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                          child: Text(item['status'], style: const TextStyle(color: Color(0xFFD97706), fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text("Doc: ${item['document']}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    Text("Location: ${item['location']}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              setState(() => _kycQueue.removeWhere((k) => k['id'] == item['id']));
                            },
                            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                            child: const Text("Reject Document"),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              setState(() => _kycQueue.removeWhere((k) => k['id'] == item['id']));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text("✅ KYC Approved for ${item['name']}"), backgroundColor: const Color(0xFF16A34A)),
                              );
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                            child: const Text("Approve KYC"),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, String sub, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 20),
              Text(sub, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}
