import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  final SharedPreferences _prefs;
  final String Function() _getBaseUrl;
  void Function()? onUnauthorized;

  ApiClient(this._prefs, this._getBaseUrl, {this.onUnauthorized});

  Map<String, String> _headers(String? token) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  String _cleanEndpoint(String endpoint) {
    if (endpoint.startsWith('/')) {
      return endpoint;
    }
    return '/$endpoint';
  }

  Uri _getUri(String endpoint) {
    final base = _getBaseUrl();
    final clean = _cleanEndpoint(endpoint);
    return Uri.parse('$base$clean');
  }

  Future<http.Response> _handleResponse(http.Response response) async {
    if (response.statusCode == 401) {
      await _prefs.remove('token');
      await _prefs.remove('user');
      if (onUnauthorized != null) {
        onUnauthorized!();
      }
    }
    return response;
  }

  Future<Map<String, dynamic>> get(String endpoint) async {
    final token = _prefs.getString('token');
    final uri = _getUri(endpoint);
    final response = await http.get(uri, headers: _headers(token));
    final processed = await _handleResponse(response);
    return _parseJson(processed);
  }

  Future<Map<String, dynamic>> post(String endpoint, [dynamic body]) async {
    final token = _prefs.getString('token');
    final uri = _getUri(endpoint);
    final response = await http.post(
      uri,
      headers: _headers(token),
      body: body != null ? jsonEncode(body) : null,
    );
    final processed = await _handleResponse(response);
    return _parseJson(processed);
  }

  Future<Map<String, dynamic>> put(String endpoint, dynamic body) async {
    final token = _prefs.getString('token');
    final uri = _getUri(endpoint);
    final response = await http.put(
      uri,
      headers: _headers(token),
      body: jsonEncode(body),
    );
    final processed = await _handleResponse(response);
    return _parseJson(processed);
  }

  Future<Map<String, dynamic>> patch(String endpoint, dynamic body) async {
    final token = _prefs.getString('token');
    final uri = _getUri(endpoint);
    final response = await http.patch(
      uri,
      headers: _headers(token),
      body: jsonEncode(body),
    );
    final processed = await _handleResponse(response);
    return _parseJson(processed);
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    final token = _prefs.getString('token');
    final uri = _getUri(endpoint);
    final response = await http.delete(uri, headers: _headers(token));
    final processed = await _handleResponse(response);
    return _parseJson(processed);
  }

  // Helper function to return parsed JSON map, or throw raw error
  Map<String, dynamic> _parseJson(http.Response response) {
    final bytes = response.bodyBytes;
    final bodyString = utf8.decode(bytes);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (bodyString.isEmpty) return {};
      try {
        final decoded = jsonDecode(bodyString);
        if (decoded is List) {
          return {'data': decoded};
        }
        return decoded as Map<String, dynamic>;
      } catch (_) {
        return {'raw_response': bodyString};
      }
    } else {
      dynamic errorData;
      try {
        errorData = jsonDecode(bodyString);
      } catch (_) {
        errorData = bodyString;
      }
      throw ApiException(response.statusCode, errorData);
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final dynamic errorData;

  ApiException(this.statusCode, this.errorData);

  String get message {
    if (errorData is Map) {
      if (errorData.containsKey('detail')) {
        return errorData['detail'].toString();
      }
      if (errorData.containsKey('error')) {
        return errorData['error'].toString();
      }
      // Return list of errors combined
      return errorData.entries.map((e) => '${e.key}: ${e.value}').join(', ');
    }
    return errorData.toString();
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}
