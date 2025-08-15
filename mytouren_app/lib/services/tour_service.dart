import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';

class TourService {
  final String _baseUrl = 'http://localhost:3000/api'; // Backend URL'si
  // TODO: Backend URL'sini dinamik hale getir (örn: ortam değişkenleri)

  Future<Map<String, dynamic>?> getTodayTour() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('Hata: Kullanıcı girişi yapılmamış.');
        return null;
      }

      // Backend'de sürücü ID'sine göre tur getiren bir endpoint olduğunu varsayıyoruz.
      // Örneğin: /api/routing/todayTour?driverId=<uid>
      final response = await http.get(
        Uri.parse('$_baseUrl/routing/todayTour?driverId=${user.uid}'),
        headers: {
          'Content-Type': 'application/json',
          // Firebase kimlik doğrulama token'ını göndermek gerekebilir
          'Authorization': 'Bearer ${await user.getIdToken()}',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        print('Tur verisi alınamadı. Durum kodu: ${response.statusCode}');
        print('Yanıt: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Tur verisi alınırken hata oluştu: $e');
      return null;
    }
  }
}