import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Configurable base URL. Default configured for 10.206.1.244 (local network)
  static String baseUrl = _getDefaultBaseUrl();

  static String _getDefaultBaseUrl() {
    return "http://10.206.1.244:8000/api";
  }

  static void setBaseUrl(String url) {
    String cleanUrl = url.trim();
    if (!cleanUrl.endsWith('/api') && !cleanUrl.endsWith('/api/')) {
      if (cleanUrl.endsWith('/')) {
        cleanUrl = '${cleanUrl}api';
      } else {
        cleanUrl = '$cleanUrl/api';
      }
    }
    baseUrl = cleanUrl;
  }

  static Map<String, String> getHeaders(String? token) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // --- Auth APIs ---

  // 1. Login
  static Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login/'),
        headers: getHeaders(null),
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 5));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, ...data};
      } else {
        return {
          'success': false,
          'error': data['detail'] ?? data['error'] ?? 'Invalid username or password',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to backend ($baseUrl)'};
    }
  }

  // 2. Register
  static Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register/'),
        headers: getHeaders(null),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'user': data};
      } else {
        String errorMsg = 'Registration failed. Check details.';
        if (data is Map) {
          final errs = <String>[];
          data.forEach((k, v) {
            if (v is List) {
              errs.add('${k.toString().toUpperCase()}: ${v.join(", ")}');
            } else {
              errs.add('${k.toString().toUpperCase()}: $v');
            }
          });
          if (errs.isNotEmpty) errorMsg = errs.join(' | ');
        }
        return {'success': false, 'error': errorMsg, 'errors': data};
      }
    } catch (e) {
      return {'success': false, 'error': 'Backend connection timed out ($baseUrl)'};
    }
  }

  // 3. Verify OTP
  static Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String otp,
    String? msg91Token,
    String? reqId,
    bool msg91Verified = false,
  }) async {
    try {
      final body = <String, dynamic>{
        'phone': phone,
        'otp': otp,
        'msg91_verified': msg91Verified,
      };
      if (msg91Token != null) body['msg91_token'] = msg91Token;
      if (reqId != null) body['req_id'] = reqId;

      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp/'),
        headers: getHeaders(null),
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Account verified successfully',
          'user': data['user'],
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Invalid or expired OTP',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Failed to connect to verification server'};
    }
  }

  // 4. Request Password Reset OTP
  static Future<Map<String, dynamic>> requestPasswordResetOtp(String phone) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/password-reset/request-otp/'),
        headers: getHeaders(null),
        body: jsonEncode({'phone': phone}),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'OTP dispatched',
          'phone': data['phone'],
          'username': data['username'],
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'No account found with this phone number',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server'};
    }
  }

  // 5. Confirm Password Reset
  static Future<Map<String, dynamic>> confirmPasswordReset({
    required String phone,
    required String otp,
    required String newPassword,
    String? msg91Token,
    bool msg91Verified = false,
    String? reqId,
  }) async {
    try {
      final body = <String, dynamic>{
        'phone': phone,
        'otp': otp,
        'new_password': newPassword,
        'msg91_verified': msg91Verified,
      };
      if (msg91Token != null) body['msg91_token'] = msg91Token;
      if (reqId != null) body['req_id'] = reqId;

      final response = await http.post(
        Uri.parse('$baseUrl/auth/password-reset/confirm/'),
        headers: getHeaders(null),
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Password reset successfully',
          'username': data['username'],
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Password reset failed. Invalid or expired OTP.',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Server connection error during reset'};
    }
  }

  // --- Products / Marketplace APIs ---
  static Future<List<dynamic>> fetchProducts({String? token}) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  // --- Add Product / Crop Inventory ---
  static Future<bool> createProduct(Map<String, dynamic> productData, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/products/'),
        headers: getHeaders(token),
        body: jsonEncode(productData),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  // --- Chatbot / AI Assistant API ---
  static Future<Map<String, dynamic>> sendMessageToAI(String conversationId, String message, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/chat/conversations/$conversationId/messages/'),
        headers: getHeaders(token),
        body: jsonEncode({'content': message}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return {'error': 'Failed to communicate with Farmer AI Assistant'};
  }

  // --- Create Chat Conversation ---
  static Future<String?> createAIConversation(String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/chat/conversations/'),
        headers: getHeaders(token),
        body: jsonEncode({'title': 'New Farm Advice'}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['id']?.toString();
      }
    } catch (_) {}
    return null;
  }

  // --- Verify Delivery OTP ---
  static Future<Map<String, dynamic>> verifyOrderOTP(String orderId, String otp, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/$orderId/verify_otp/'),
        headers: getHeaders(token),
        body: jsonEncode({'otp': otp}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return {'status': 'error', 'message': 'Network error or invalid OTP'};
  }

  // --- Farmer Hub APIs ---

  static Future<Map<String, dynamic>?> fetchFarmerStats(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/farmer/stats/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  static Future<List<dynamic>> fetchFarmerOrders(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> updateOrderStatus(String orderId, String status, String? token) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/orders/$orderId/'),
        headers: getHeaders(token),
        body: jsonEncode({'status': status}),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<List<dynamic>> fetchFarmerQuotes(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/quotes/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> respondToQuote(String quoteId, Map<String, dynamic> body, String? token) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/orders/quotes/$quoteId/'),
        headers: getHeaders(token),
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<List<dynamic>> fetchBulkRequirements(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/bulk-requirements/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> submitFarmerOffer(Map<String, dynamic> offerData, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/farmer-offers/'),
        headers: getHeaders(token),
        body: jsonEncode(offerData),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<List<dynamic>> fetchFarmerOffers(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/farmer-offers/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<List<dynamic>> fetchPreHarvestContracts(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/pre-harvest-contracts/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> createPreHarvestContract(Map<String, dynamic> contractData, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/pre-harvest-contracts/'),
        headers: getHeaders(token),
        body: jsonEncode(contractData),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<List<dynamic>> fetchMarketPrices(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/market-prices/markets/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> submitKycDocument(String kycDoc, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/farmer/kyc/'),
        headers: getHeaders(token),
        body: jsonEncode({'kyc_document': kycDoc}),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {}
    return false;
  }

  static Future<bool> deleteProduct(String productId, String? token) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/products/$productId/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 204 || response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // --- Consumer Hub APIs ---
  static Future<List<dynamic>> fetchConsumerSubscriptions(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/subscriptions/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<Map<String, dynamic>?> createOrder(Map<String, dynamic> orderData, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/'),
        headers: getHeaders(token),
        body: jsonEncode(orderData),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> pauseSubscription(String subId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/subscriptions/$subId/pause/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<bool> resumeSubscription(String subId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/subscriptions/$subId/resume/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<bool> cancelSubscription(String subId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/subscriptions/$subId/cancel/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // --- Logistics & Driver Hub APIs ---
  static Future<List<dynamic>> fetchLogisticsShipments(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/logistics/shipments/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<Map<String, dynamic>?> fetchLogisticsStats(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/logistics/stats/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  static Future<List<dynamic>> fetchTransportOffers(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/logistics/transport-offers/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data.containsKey('results')) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  static Future<Map<String, dynamic>> respondTransportOffer(String offerId, bool accept, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/transport-offers/$offerId/respond/'),
        headers: getHeaders(token),
        body: jsonEncode({'accept': accept}),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Failed to respond to transport offer.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network timeout or server error.'};
    }
  }

  static Future<Map<String, dynamic>> acceptDeliveryJob(String shipmentId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/shipments/$shipmentId/accept-job/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Failed to accept job.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error while accepting delivery job.'};
    }
  }

  static Future<Map<String, dynamic>> confirmHandover(String shipmentId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/shipments/$shipmentId/confirm-handover/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Handover confirmation failed.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error while confirming physical handover.'};
    }
  }

  static Future<Map<String, dynamic>> updateShipmentStatus(String shipmentId, String status, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/shipments/$shipmentId/update-status/'),
        headers: getHeaders(token),
        body: jsonEncode({'status': status}),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Status update failed.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error while updating shipment status.'};
    }
  }

  static Future<Map<String, dynamic>> verifyDeliveryOtp(String shipmentId, String otp, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/shipments/$shipmentId/verify-otp/'),
        headers: getHeaders(token),
        body: jsonEncode({'otp': otp}),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Invalid OTP code.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error during OTP verification.'};
    }
  }

  static Future<Map<String, dynamic>> sendDeliveryOtpEmail(String shipmentId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logistics/shipments/$shipmentId/send-otp-email/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'message': 'Delivery OTP emailed to buyer!'};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Failed to send OTP email.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error while sending OTP email.'};
    }
  }

  static Future<Map<String, dynamic>?> fetchActiveDeliveryRoute(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/route-planning/driver/active-delivery/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> recalculateRoute(String shipmentId, String? token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/route-planning/shipments/$shipmentId/recalculate-route/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<Map<String, dynamic>> updateLogisticsVehicle(Map<String, dynamic> vehicleData, String? token) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/logistics/vehicle/update/'),
        headers: getHeaders(token),
        body: jsonEncode(vehicleData),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        final errData = jsonDecode(response.body);
        return {'success': false, 'error': errData['error'] ?? 'Vehicle update failed.'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error while updating vehicle details.'};
    }
  }

  // --- B2B Bulk Buyer APIs ---

  // 1. Fetch Quotes / Negotiations
  static Future<List<dynamic>> fetchQuotes(String? token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/quotes/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data['results'] is List) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  // 2. Submit Quote
  static Future<Map<String, dynamic>> submitQuote({
    required int productId,
    required double quantity,
    required double targetPrice,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/quotes/'),
        headers: getHeaders(token),
        body: jsonEncode({
          'product': productId,
          'quantity': quantity,
          'target_price': targetPrice,
        }),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to submit quote'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error submitting quote'};
    }
  }

  // 3. Counter-Offer Quote (Buyer)
  static Future<Map<String, dynamic>> counterQuoteOffer({
    required String quoteId,
    required double targetPrice,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/quotes/$quoteId/counter-offer/'),
        headers: getHeaders(token),
        body: jsonEncode({'target_price': targetPrice}),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to counter offer'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error countering offer'};
    }
  }

  // 4. Accept Quote Offer (Buyer) -> Creates Order & Payment parameters
  static Future<Map<String, dynamic>> acceptQuoteOffer({
    required String quoteId,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/quotes/$quoteId/accept-offer/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, ...data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to accept offer'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error accepting offer'};
    }
  }

  // 5. Reject Quote Offer
  static Future<Map<String, dynamic>> rejectQuoteOffer({
    required String quoteId,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/quotes/$quoteId/reject-offer/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'error': data['error'] ?? 'Failed to reject offer'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error rejecting offer'};
    }
  }

  // 6. Submit Bulk Requirement
  static Future<Map<String, dynamic>> submitBulkRequirement({
    required Map<String, dynamic> payload,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/bulk-requirements/'),
        headers: getHeaders(token),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to post bulk requirement'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error posting bulk requirement'};
    }
  }

  // 7. Accept Farmer Offer on Bulk Requirement -> Creates Order
  static Future<Map<String, dynamic>> acceptFarmerOffer({
    required String offerId,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/farmer-offers/$offerId/accept/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, ...data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to accept farmer offer'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error accepting farmer offer'};
    }
  }

  // 8. Reject Farmer Offer
  static Future<Map<String, dynamic>> rejectFarmerOffer({
    required String offerId,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/farmer-offers/$offerId/reject/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'error': data['error'] ?? 'Failed to reject offer'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error rejecting offer'};
    }
  }

  // 9. Reserve Pre-Harvest Contract
  static Future<Map<String, dynamic>> reservePreHarvestContract({
    required String contractId,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/pre-harvest-contracts/$contractId/reserve/'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to reserve contract'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error reserving contract'};
    }
  }

  // 12. Fetch B2B Subscriptions
  static Future<List<dynamic>> fetchB2BSubscriptions({
    required String buyerId,
    String? token,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/subscriptions/?buyer_id=$buyerId'),
        headers: getHeaders(token),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data['results'] is List) return data['results'];
      }
    } catch (_) {}
    return [];
  }

  // 13. Create B2B Subscription
  static Future<Map<String, dynamic>> createB2BSubscription({
    required Map<String, dynamic> payload,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/subscriptions/'),
        headers: getHeaders(token),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to create subscription'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error creating subscription'};
    }
  }

  // 14. Toggle B2B Subscription Status
  static Future<bool> toggleB2BSubscriptionStatus({
    required String subscriptionId,
    required bool active,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/subscriptions/$subscriptionId/toggle/'),
        headers: getHeaders(token),
        body: jsonEncode({'active': active}),
      ).timeout(const Duration(seconds: 6));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 15. Verify Wholesale Payment Callback (Escrow)
  static Future<Map<String, dynamic>> verifyPaymentCallback({
    required Map<String, dynamic> payload,
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/payment-callback/'),
        headers: getHeaders(token),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Payment verification failed'};
      }
    } catch (_) {
      return {'success': false, 'error': 'Network error verifying payment'};
    }
  }
}

