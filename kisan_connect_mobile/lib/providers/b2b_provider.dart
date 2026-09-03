import 'package:flutter/material.dart';

class BulkRequirement {
  final String id;
  final String buyerName;
  final String commodity;
  final double requiredQtyTons;
  final double targetPricePerKg;
  final String location;
  final String status; // 'Active', 'Fulfilled', 'Under Negotiation'
  final String datePosted;

  BulkRequirement({
    required this.id,
    required this.buyerName,
    required this.commodity,
    required this.requiredQtyTons,
    required this.targetPricePerKg,
    required this.location,
    required this.status,
    required this.datePosted,
  });
}

class CounterBid {
  final String id;
  final String cropName;
  final String farmerName;
  final String buyerName;
  final double originalPrice;
  final double offeredPrice;
  final double quantityKg;
  String status; // 'Pending', 'Accepted', 'Countered', 'Rejected'
  final String date;

  CounterBid({
    required this.id,
    required this.cropName,
    required this.farmerName,
    required this.buyerName,
    required this.originalPrice,
    required this.offeredPrice,
    required this.quantityKg,
    required this.status,
    required this.date,
  });
}

class PreHarvestContract {
  final String id;
  final String cropName;
  final String farmerName;
  final String buyerName;
  final String harvestExpectedDate;
  final double priceLockPerKg;
  final double expectedYieldKg;
  final double advancePaidPercent;
  final String status; // 'Signed', 'Pending Approval', 'In Progress'

  PreHarvestContract({
    required this.id,
    required this.cropName,
    required this.farmerName,
    required this.buyerName,
    required this.harvestExpectedDate,
    required this.priceLockPerKg,
    required this.expectedYieldKg,
    required this.advancePaidPercent,
    required this.status,
  });
}

class B2BProvider with ChangeNotifier {
  List<BulkRequirement> _requirements = [];
  List<CounterBid> _counterBids = [];
  List<PreHarvestContract> _contracts = [];

  List<BulkRequirement> get requirements => _requirements;
  List<CounterBid> get counterBids => _counterBids;
  List<PreHarvestContract> get contracts => _contracts;

  B2BProvider() {
    _loadSampleB2BData();
  }

  void _loadSampleB2BData() {
    _requirements = [
      BulkRequirement(
        id: "req-1",
        buyerName: "Reliance Retail Hub Anand",
        commodity: "Tomatoes (Grade A)",
        requiredQtyTons: 15.0,
        targetPricePerKg: 30.0,
        location: "Anand Distribution Center",
        status: "Active",
        datePosted: "Today",
      ),
      BulkRequirement(
        id: "req-2",
        buyerName: "BigBasket Vadodara FC",
        commodity: "Green Cabbage",
        requiredQtyTons: 8.0,
        targetPricePerKg: 17.5,
        location: "Vadodara APMC Gate 2",
        status: "Under Negotiation",
        datePosted: "Yesterday",
      ),
    ];

    _counterBids = [
      CounterBid(
        id: "bid-101",
        cropName: "Organic Hybrid Tomatoes",
        farmerName: "Ramesh Patel",
        buyerName: "More Megastore India",
        originalPrice: 32.0,
        offeredPrice: 29.50,
        quantityKg: 2000,
        status: "Pending",
        date: "10 mins ago",
      ),
      CounterBid(
        id: "bid-102",
        cropName: "Alphonso Mangoes",
        farmerName: "Sanjay Deshmukh",
        buyerName: "Star Bazaar Exports",
        originalPrice: 180.0,
        offeredPrice: 172.0,
        quantityKg: 500,
        status: "Accepted",
        date: "2 hours ago",
      ),
    ];

    _contracts = [
      PreHarvestContract(
        id: "ph-301",
        cropName: "Sharbati Golden Wheat",
        farmerName: "Ramesh Patel",
        buyerName: "ITC Choupal Procurement",
        harvestExpectedDate: "Nov 2026",
        priceLockPerKg: 46.0,
        expectedYieldKg: 10000,
        advancePaidPercent: 25.0,
        status: "Signed",
      )
    ];
    notifyListeners();
  }

  void updateBidStatus(String bidId, String newStatus) {
    final bid = _counterBids.firstWhere((b) => b.id == bidId);
    bid.status = newStatus;
    notifyListeners();
  }

  void addBid(CounterBid bid) {
    _counterBids.insert(0, bid);
    notifyListeners();
  }

  void addRequirement(BulkRequirement req) {
    _requirements.insert(0, req);
    notifyListeners();
  }
}
