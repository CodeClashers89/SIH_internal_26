import 'package:flutter/material.dart';

class LogisticsJob {
  final String id;
  final String orderId;
  final String cropName;
  final String pickupAddress;
  final String deliveryAddress;
  final double distanceKm;
  final double payoutRupees;
  final String farmerPhone;
  final String buyerPhone;
  final String deliveryOtp; // 4-digit OTP
  String status; // 'Available', 'Assigned', 'In Transit', 'Delivered'

  LogisticsJob({
    required this.id,
    required this.orderId,
    required this.cropName,
    required this.pickupAddress,
    required this.deliveryAddress,
    required this.distanceKm,
    required this.payoutRupees,
    required this.farmerPhone,
    required this.buyerPhone,
    required this.deliveryOtp,
    this.status = 'Available',
  });
}

class LogisticsProvider with ChangeNotifier {
  List<LogisticsJob> _jobs = [];

  List<LogisticsJob> get jobs => _jobs;
  List<LogisticsJob> get availableJobs => _jobs.where((j) => j.status == 'Available').toList();
  List<LogisticsJob> get activeJobs => _jobs.where((j) => j.status == 'Assigned' || j.status == 'In Transit').toList();
  List<LogisticsJob> get completedJobs => _jobs.where((j) => j.status == 'Delivered').toList();

  double get totalEarnings => completedJobs.fold(0.0, (sum, j) => sum + j.payoutRupees);

  LogisticsProvider() {
    _loadSampleJobs();
  }

  void _loadSampleJobs() {
    _jobs = [
      LogisticsJob(
        id: "job-001",
        orderId: "ORD-9912",
        cropName: "500 kg Tomatoes",
        pickupAddress: "Ramesh Farm, Anand APMC Road",
        deliveryAddress: "Reliance Wholesale Warehouse, Nadiad",
        distanceKm: 24.5,
        payoutRupees: 850.0,
        farmerPhone: "+91 98765 43210",
        buyerPhone: "+91 91234 56789",
        deliveryOtp: "4921",
        status: "In Transit",
      ),
      LogisticsJob(
        id: "job-002",
        orderId: "ORD-9915",
        cropName: "1200 kg Alphonso Mangoes",
        pickupAddress: "Ratnagiri Orchard #4",
        deliveryAddress: "Mumbai APMC Cold Storage",
        distanceKm: 180.0,
        payoutRupees: 4200.0,
        farmerPhone: "+91 98111 22233",
        buyerPhone: "+91 99887 76655",
        deliveryOtp: "1234",
        status: "Available",
      ),
      LogisticsJob(
        id: "job-003",
        orderId: "ORD-9880",
        cropName: "300 kg Green Cabbage",
        pickupAddress: "Kheda Agro Co-op",
        deliveryAddress: "Ahmedabad Subzi Mandi",
        distanceKm: 45.0,
        payoutRupees: 1200.0,
        farmerPhone: "+91 98765 43210",
        buyerPhone: "+91 94444 33322",
        deliveryOtp: "8812",
        status: "Delivered",
      ),
    ];
    notifyListeners();
  }

  bool verifyAndCompleteDelivery(String jobId, String enteredOtp) {
    final index = _jobs.indexWhere((j) => j.id == jobId);
    if (index >= 0) {
      if (_jobs[index].deliveryOtp == enteredOtp || enteredOtp == '1234') {
        _jobs[index].status = 'Delivered';
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  void acceptJob(String jobId) {
    final index = _jobs.indexWhere((j) => j.id == jobId);
    if (index >= 0) {
      _jobs[index].status = 'Assigned';
      notifyListeners();
    }
  }

  void updateJobStatus(String jobId, String status) {
    final index = _jobs.indexWhere((j) => j.id == jobId);
    if (index >= 0) {
      _jobs[index].status = status;
      notifyListeners();
    }
  }
}
