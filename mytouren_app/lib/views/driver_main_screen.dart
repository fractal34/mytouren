
import 'package:flutter/material.dart';

import 'package:mytouren_app/services/tour_service.dart'; // Eklendi
import 'package:firebase_auth/firebase_auth.dart'; // For FirebaseAuth.instance
import 'package:mytouren_app/services/auth_service.dart'; // For AuthService
import 'package:mytouren_app/services/user_service.dart'; // For UserService
import 'package:cloud_firestore/cloud_firestore.dart'; // For FirebaseFirestore.instance


class DriverMainScreen extends StatefulWidget {
  const DriverMainScreen({super.key});

  @override
  State<DriverMainScreen> createState() => _DriverMainScreenState();
}

class _DriverMainScreenState extends State<DriverMainScreen> {
  String _driverName = 'Şoför'; // Default value
  bool _isLoadingDriverName = true;
  final AuthService _authService = AuthService(FirebaseAuth.instance); // Add this line

  @override
  void initState() {
    super.initState();
    _loadDriverName();
  }

  Future<void> _loadDriverName() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final driverDetails = await UserService(FirebaseFirestore.instance).getDriverDetails(user.uid);
      if (mounted) {
        setState(() {
          if (driverDetails != null && driverDetails.containsKey('name')) {
            _driverName = driverDetails['name'];
          }
          _isLoadingDriverName = false;
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _isLoadingDriverName = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MyTouren - Şoför Paneli', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF212529),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () async {
              await _authService.signOut(); // Use the instance
              if (mounted) {
                final currentContext = context;
                // ignore: use_build_context_synchronously
                Navigator.of(currentContext).popUntil((route) => route.isFirst);
              }
            },
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.delivery_dining, size: 100, color: Color(0xFFB22222)),
              const SizedBox(height: 30),
              _isLoadingDriverName
                  ? const CircularProgressIndicator()
                  : Text(
                      'Hoş Geldiniz, $_driverName!',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      textAlign: TextAlign.center,
                    ),
              const SizedBox(height: 50),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final tourList = await TourService().getTodayTour(); // Renamed to tourList
                    String message;
                    if (tourList != null && tourList.isNotEmpty) {
                      // You would typically iterate through tourList here to display tours
                      message = 'Bugün için ${tourList.length} tur bulundu.';
                      // For debugging, you can still print the list
                      print('Alınan tur listesi: ${tourList.toString()}');
                    } else {
                      message = 'Bugün için tur bulunamadı veya bir hata oluştu.';
                    }
                    // Check if the widget is still mounted before showing the dialog
                    if (!mounted) return;
                    final currentContext = context;
                    // ignore: use_build_context_synchronously
                    showDialog(
                      context: currentContext,
                      builder: (BuildContext context) {
                        return AlertDialog(
                          title: const Text('Tur Bilgisi'),
                          content: Text(message),
                          actions: <Widget>[
                            TextButton(
                              child: const Text('Tamam'),
                              onPressed: () {
                                Navigator.of(context).pop();
                              },
                            ),
                          ],
                        );
                      },
                    );
                  },
                  icon: const Icon(Icons.map, size: 30, color: Colors.white),
                  label: const Text(
                    'TURUMU GÖSTER',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5d8abc),
                    padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                    textStyle: const TextStyle(fontSize: 18),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
