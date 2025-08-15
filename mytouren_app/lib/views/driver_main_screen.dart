
import 'package:flutter/material.dart';

import 'package:mytouren_app/services/tour_service.dart'; // Eklendi

class DriverMainScreen extends StatefulWidget {
  const DriverMainScreen({super.key});

  @override
  State<DriverMainScreen> createState() => _DriverMainScreenState();
}

class _DriverMainScreenState extends State<DriverMainScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MyTouren - Şoför Paneli'),
        backgroundColor: const Color(0xFF212529),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.delivery_dining, size: 100, color: Color(0xFFB22222)),
              const SizedBox(height: 30),
              Text(
                'Hoş Geldiniz, Şoför!',
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
                    final tourData = await TourService().getTodayTour();
                    String message;
                    if (tourData != null) {
                      message = 'Tur verileri alındı: ${tourData.toString()}';
                    } else {
                      message = 'Bugün için tur bulunamadı veya bir hata oluştu.';
                    }
                    // Check if the widget is still mounted before showing the dialog
                    if (!mounted) return;
                    showDialog(
                      context: context,
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
                  icon: const Icon(Icons.map, size: 30),
                  label: const Text(
                    'TURUMU GÖSTER',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey[600],
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
