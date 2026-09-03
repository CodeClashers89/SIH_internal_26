import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/logistics_provider.dart';

class LogisticsTab extends StatefulWidget {
  const LogisticsTab({super.key});

  @override
  State<LogisticsTab> createState() => _LogisticsTabState();
}

class _LogisticsTabState extends State<LogisticsTab> {
  void _showOTPVerificationModal(BuildContext context, LogisticsJob job) {
    final otpController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.security, color: Color(0xFF16A34A)),
              SizedBox(width: 8),
              Text("Verify Handover OTP"),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text("Ask receiver at ${job.deliveryAddress} for the 4-digit OTP."),
              const SizedBox(height: 6),
              Text("Demo Helper OTP: ${job.deliveryOtp} (or use '1234')", style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
                decoration: const InputDecoration(hintText: "0 0 0 0"),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                final logistics = Provider.of<LogisticsProvider>(context, listen: false);
                final success = logistics.verifyAndCompleteDelivery(job.id, otpController.text.trim());
                Navigator.pop(context);

                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("🎉 OTP Verified! Shipment #${job.orderId} Delivered. ₹${job.payoutRupees} credited."),
                      backgroundColor: const Color(0xFF16A34A),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("❌ Invalid OTP. Delivery handover failed."),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              child: const Text("Verify OTP & Handover"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final logistics = Provider.of<LogisticsProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Earnings & Driver Header
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEA580C), Color(0xFFC2410C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.local_shipping, color: Colors.white, size: 28),
                        SizedBox(width: 10),
                        Text("Driver Dispatch Console", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text("ONLINE 🟢", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        const Text("Today's Earnings", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        Text("₹${logistics.totalEarnings.toStringAsFixed(0)}", style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Container(height: 30, width: 1, color: Colors.white30),
                    Column(
                      children: [
                        const Text("Active Shipments", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        Text("${logistics.activeJobs.length}", style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Container(height: 30, width: 1, color: Colors.white30),
                    Column(
                      children: [
                        const Text("Completed", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        Text("${logistics.completedJobs.length}", style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Active Shipments Section
          if (logistics.activeJobs.isNotEmpty) ...[
            const Text("🚚 Active In-Transit Shipment", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...logistics.activeJobs.map((job) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFEA580C), width: 2),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(job.orderId, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text("Payout: ₹${job.payoutRupees}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text("Cargo: ${job.cropName}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, color: Colors.grey, size: 18),
                        const SizedBox(width: 6),
                        Expanded(child: Text("Pickup: ${job.pickupAddress}", style: const TextStyle(fontSize: 12))),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.flag_outlined, color: Color(0xFF16A34A), size: 18),
                        const SizedBox(width: 6),
                        Expanded(child: Text("Delivery: ${job.deliveryAddress}", style: const TextStyle(fontSize: 12))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _showOTPVerificationModal(context, job),
                      icon: const Icon(Icons.key, size: 18),
                      label: const Text("Enter Handover OTP to Complete"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        minimumSize: const Size.fromHeight(44),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
            const SizedBox(height: 24),
          ],

          // Broadcast Available Delivery Jobs Feed
          const Text("📢 Available Broadcast Jobs Nearby", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: logistics.availableJobs.length,
            itemBuilder: (ctx, idx) {
              final job = logistics.availableJobs[idx];
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
                        Text(job.cropName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text("Payout ₹${job.payoutRupees}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text("Distance: ${job.distanceKm} km", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 10),
                    Text("Pickup: ${job.pickupAddress}", style: const TextStyle(fontSize: 12)),
                    Text("Dropoff: ${job.deliveryAddress}", style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () {
                        logistics.acceptJob(job.id);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text("✅ Shipment #${job.orderId} accepted! Proceed to pickup."), backgroundColor: const Color(0xFF16A34A)),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        minimumSize: const Size.fromHeight(42),
                      ),
                      child: const Text("Accept Delivery Job"),
                    ),
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
