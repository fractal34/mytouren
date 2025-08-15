
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart'; // debugPrint için eklendi

class AuthService {
  final FirebaseAuth _firebaseAuth;

  AuthService(this._firebaseAuth);

  // Mevcut kullanıcı durumunu dinlemek için bir stream
  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();

  // E-posta ve şifre ile giriş yapma
  Future<User?> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final UserCredential userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return userCredential.user;
    } on FirebaseAuthException catch (e) {
      // Hata durumunda kullanıcıya bilgi vermek için burada
      // daha gelişmiş bir hata yönetimi yapılabilir.
      debugPrint('Giriş hatası: ${e.message}');
      return null;
    }
  }

  // Çıkış yapma
  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }

  // TODO: Rol kontrolü için Firestore servisi ile konuşacak bir metod eklenecek.
  // Future<String> getUserRole(String uid) async { ... }
}
