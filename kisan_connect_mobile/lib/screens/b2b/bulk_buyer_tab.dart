import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/b2b_provider.dart';

class BulkBuyerTab extends StatefulWidget {
  const BulkBuyerTab({super.key});

  @override
  State<BulkBuyerTab> createState() => _BulkBuyerTabState();
}

class _BulkBuyerTabState extends State<BulkBuyerTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  void _showNewRequirementModal(BuildContext context) {
    final commodityCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '10');
    final priceCtrl = TextEditingController(text: '30');
    final locationCtrl = TextEditingController(text: 'Anand Distribution Hub');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardTheme.color,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            top: 24, left: 24, right: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("🏢 Post Wholesale Bulk Requirement", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: commodityCtrl,
                decoration: const InputDecoration(labelText: "Commodity Needed (e.g. Tomatoes Grade A)"),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: "Quantity Needed (Tons)"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: "Target Price/Kg (₹)"),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locationCtrl,
                decoration: const InputDecoration(labelText: "Delivery Hub Location"),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  if (commodityCtrl.text.isNotEmpty) {
                    final b2b = Provider.of<B2BProvider>(context, listen: false);
                    b2b.addRequirement(BulkRequirement(
                      id: "req_${DateTime.now().millisecondsSinceEpoch}",
                      buyerName: "Reliance Retail Procurement",
                      commodity: commodityCtrl.text.trim(),
                      requiredQtyTons: double.tryParse(qtyCtrl.text) ?? 10.0,
                      targetPricePerKg: double.tryParse(priceCtrl.text) ?? 30.0,
                      location: locationCtrl.text.trim(),
                      status: "Active",
                      datePosted: "Just now",
                    ));
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("✅ Bulk Requirement published to Farmers!"), backgroundColor: Color(0xFFD97706)),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  minimumSize: const Size.fromHeight(50),
                ),
                child: const Text("Broadcast Requirement to Farmers"),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final b2b = Provider.of<B2BProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("B2B Wholesale Hub"),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFD97706),
          labelColor: const Color(0xFFD97706),
          tabs: const [
            Tab(text: "Bids & Counter"),
            Tab(text: "Bulk Demands"),
            Tab(text: "Pre-Harvest"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1. Counter Bids Tab
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: b2b.counterBids.length,
            itemBuilder: (ctx, idx) {
              final bid = b2b.counterBids[idx];
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
                        Text(bid.cropName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: bid.status == 'Accepted' ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            bid.status,
                            style: TextStyle(
                              color: bid.status == 'Accepted' ? const Color(0xFF15803D) : const Color(0xFFD97706),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text("Farmer: ${bid.farmerName}  •  Buyer: ${bid.buyerName}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("List Price: ₹${bid.originalPrice}/kg", style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey)),
                        Text("Bid Offered: ₹${bid.offeredPrice}/kg", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                        Text("Qty: ${bid.quantityKg.toInt()} kg", style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (bid.status == 'Pending')
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => b2b.updateBidStatus(bid.id, 'Rejected'),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                              child: const Text("Decline"),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => b2b.updateBidStatus(bid.id, 'Accepted'),
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                              child: const Text("Accept Offer"),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              );
            },
          ),

          // 2. Bulk Demands Tab
          Scaffold(
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => _showNewRequirementModal(context),
              backgroundColor: const Color(0xFFD97706),
              icon: const Icon(Icons.add),
              label: const Text("Post Bulk Demand"),
            ),
            body: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: b2b.requirements.length,
              itemBuilder: (ctx, idx) {
                final req = b2b.requirements[idx];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(req.commodity, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          Text("Target: ₹${req.targetPricePerKg}/kg", style: const TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text("Buyer: ${req.buyerName}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.scale, size: 16, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text("${req.requiredQtyTons} Tons Needed", style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 16),
                          const Icon(Icons.location_on, size: 16, color: Colors.grey),
                          const SizedBox(width: 4),
                          Expanded(child: Text(req.location, overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // 3. Pre-Harvest Contracts Tab
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: b2b.contracts.length,
            itemBuilder: (ctx, idx) {
              final contract = b2b.contracts[idx];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF16A34A).withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(contract.cropName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(contract.status, style: const TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text("Farmer: ${contract.farmerName}  •  Buyer: ${contract.buyerName}"),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Locked Price: ₹${contract.priceLockPerKg}/kg", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                        Text("Yield: ${contract.expectedYieldKg.toInt()} kg", style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text("Expected Harvest: ${contract.harvestExpectedDate}  •  Advance Paid: ${contract.advancePaidPercent}%", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
