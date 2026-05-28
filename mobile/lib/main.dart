import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const GudangHovertechApp());
}

class GudangHovertechApp extends StatelessWidget {
  const GudangHovertechApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'gudang.hovertech Scanner',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1), // Indigo Primary
          brightness: Brightness.dark, // Dark mode is better for warehouse low-light
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
