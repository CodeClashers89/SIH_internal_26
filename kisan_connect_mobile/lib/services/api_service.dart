import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Configurable base URL. Default localhost for web/desktop, 10.0.2.2 for android emulator
  static String baseUrl = "http://127.0.0.1:8000/api";

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
  static Future<Map<String, dynamic>> login(String phoneOrEmail, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/login/'),
        headers: getHeaders(null),
        body: jsonEncode({
          'username': phoneOrEmail,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      // Fallback for offline demo
    }
    return {'error': 'Failed to connect to backend'};
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
  static Future<Map<String, dynamic>> verifyOTP(String orderId, String otp, String? token) async {
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
}
