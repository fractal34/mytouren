import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';

class TourService {
  final String _baseUrl = 'http://10.0.2.2:3000/api'; // Backend URL'si - Emülatör için ana bilgisayar IP'si
  // TODO: Backend URL'sini dinamik hale getir (örn: ortam değişkenleri)

  Future<List<dynamic>?> getTodayTour() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('Hata: Kullanıcı girişi yapılmamış.');
        return null;
      }

      // Backend'de sürücü ID'sine göre tur getiren bir endpoint olduğunu varsayıyoruz.
      // Örneğin: /api/routing/todayTour?driverId=<uid>
      // Bugünün tarihini YYYY-MM-DD formatında al
      final today = DateTime.now();
      final formattedDate =
          "${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}";

      final response = await http.get(
        Uri.parse(
          '$_baseUrl/routing/driver-tours?driverId=${user.uid}&date=$formattedDate',
        ),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await user.getIdToken()}',
        },
      );

      if (response.statusCode == 200) {
        final decodedBody = json.decode(response.body);
        if (decodedBody is List) { // Ensure it's a list
          return decodedBody;
        } else {
          print('Hata: Backend\'den beklenen liste yerine farklı bir tür geldi.');
          return null;
        }
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
