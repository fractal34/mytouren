
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart'; // debugPrint için eklendi

enum UserRole {
  admin,
  driver,
  unknown,
}

class UserService {
  final FirebaseFirestore _firestore;

  UserService(this._firestore);

  Future<UserRole> getUserRole(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        final data = doc.data();
        if (data != null && data.containsKey('role')) {
          final roleString = data['role'] as String;
          if (roleString == 'admin') {
            return UserRole.admin;
          } else if (roleString == 'driver') {
            return UserRole.driver;
          }
        }
      }
      return UserRole.unknown; // Rol bulunamazsa veya tanımsızsa
    } catch (e) {
      debugPrint('Kullanıcı rolü alınırken hata: $e');
      return UserRole.unknown;
    }
  }

  // TODO: Kullanıcı profili oluşturma/güncelleme metodları eklenebilir.

  Future<Map<String, dynamic>?> getDriverDetails(String firebaseAuthUid) async {
    try {
      final querySnapshot = await _firestore
          .collection('drivers')
          .where('firebaseAuthUid', isEqualTo: firebaseAuthUid)
          .limit(1)
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        return querySnapshot.docs.first.data();
      }
      return null; // Driver not found
    } catch (e) {
      debugPrint('Sürücü detayları alınırken hata: $e');
      return null;
    }
  }
}
