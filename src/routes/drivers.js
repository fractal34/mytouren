const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const authMiddleware = require('../utils/authMiddleware');
const { geocodeAddress } = require('../utils/geoHelpers');

// Kullanıcıya ait şoförleri listele
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('drivers').where('ownerId', '==', userId).get();
    const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(drivers);
  } catch (error) {
    console.error("Şoförler getirilirken hata:", error);
    res.status(500).json({ message: "Şoförler getirilirken bir hata oluştu." });
  }
});

// Kullanıcı için yeni şoför ekle
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  const { name, licensePlate, maxTonnage, palletCapacity, fixedStartAddress, fixedEndAddress, email, password } = req.body;

  if (!name || !licensePlate || !fixedStartAddress || !fixedEndAddress) { // maxTonnage and palletCapacity are optional now
    return res.status(400).json({ message: "Şoför adı, plaka, başlangıç ve bitiş adresleri zorunludur." });
  }

  let firebaseAuthUid = null;
  if (email && password) {
    try {
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
      });
      firebaseAuthUid = userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        return res.status(400).json({ message: "Bu e-posta adresi zaten kullanımda." });
      }
      console.error("Firebase Auth kullanıcısı oluşturulurken hata:", error);
      return res.status(500).json({ message: "Şoför hesabı oluşturulurken bir hata oluştu." });
    }
  }

  try {
    const fixedStartCoordinates = await geocodeAddress(fixedStartAddress);
    const fixedEndCoordinates = await geocodeAddress(fixedEndAddress);

    if (!fixedStartCoordinates || !fixedEndCoordinates) {
      return res.status(400).json({ message: "Başlangıç veya bitiş adresi için koordinatlar bulunamadı." });
    }

    const newDriver = {
      ownerId: userId,
      name,
      licensePlate,
      maxTonnage: maxTonnage ? parseInt(maxTonnage, 10) : null, // Use maxTonnage, make optional
      palletCapacity: palletCapacity ? parseInt(palletCapacity, 10) : null, // Make optional
      fixedStart: { address: fixedStartAddress, coordinates: fixedStartCoordinates },
      fixedEnd: { address: fixedEndAddress, coordinates: fixedEndCoordinates },
      createdAt: new Date()
    };

    if (email) { // Add email to Firestore document if provided
      newDriver.email = email;
    }

    if (firebaseAuthUid) {
      newDriver.firebaseAuthUid = firebaseAuthUid;
    }

    const docRef = await db.collection('drivers').add(newDriver);
    res.status(201).json({ id: docRef.id, ...newDriver });
  } catch (error) {
    console.error("Şoför eklenirken hata:", error);
    res.status(500).json({ message: "Şoför eklenirken bir hata oluştu." });
  }
});

// Kullanıcıya ait bir şoförü güncelle
router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  const driverId = req.params.id;
  const { name, licensePlate, maxTonnage, palletCapacity, fixedStartAddress, fixedEndAddress } = req.body; // Changed maxPallets to maxTonnage

  if (!name || !licensePlate || !fixedStartAddress || !fixedEndAddress) { // maxTonnage and palletCapacity are optional now
    return res.status(400).json({ message: "Şoför adı, plaka, başlangıç ve bitiş adresleri zorunludur." });
  }

  try {
    const driverRef = db.collection('drivers').doc(driverId);
    const driverDoc = await driverRef.get();

    if (!driverDoc.exists) {
        return res.status(404).json({ message: "Güncellenecek şoför bulunamadı." });
    }

    if (driverDoc.data().ownerId !== userId) {
        return res.status(403).json({ message: "Bu şoförü güncelleme yetkiniz yok." });
    }

    const fixedStartCoordinates = await geocodeAddress(fixedStartAddress);
    const fixedEndCoordinates = await geocodeAddress(fixedEndAddress);

    if (!fixedStartCoordinates || !fixedEndCoordinates) {
      return res.status(400).json({ message: "Başlangıç veya bitiş adresi için koordinatlar bulunamadı." });
    }

    const updatedDriver = {
      name,
      licensePlate,
      maxTonnage: maxTonnage ? parseInt(maxTonnage, 10) : null, // Changed maxPallets to maxTonnage, make optional
      palletCapacity: palletCapacity ? parseInt(palletCapacity, 10) : null, // Make optional
      fixedStart: { address: fixedStartAddress, coordinates: fixedStartCoordinates }, // Corrected typo
      fixedEnd: { address: fixedEndAddress, coordinates: fixedEndCoordinates },
      updatedAt: new Date()
    };

    await driverRef.set(updatedDriver, { merge: true });
    res.status(200).json({ id: driverId, ...updatedDriver });
  } catch (error) {
    console.error("Şoför güncellenirken hata:", error);
    res.status(500).json({ message: "Şoför güncellenirken bir hata oluştu." });
  }
});

// Şoförün kimlik bilgilerini (e-posta/şifre) güncelle
router.put('/:id/credentials', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  const driverId = req.params.id;
  const { email, password } = req.body;

  if (!email && !password) {
    return res.status(400).json({ message: "E-posta veya şifre sağlanmalıdır." });
  }

  try {
    const driverDoc = await db.collection('drivers').doc(driverId).get();

    if (!driverDoc.exists) {
      return res.status(404).json({ message: "Şoför bulunamadı." });
    }

    if (driverDoc.data().ownerId !== userId) {
      return res.status(403).json({ message: "Bu şoförün kimlik bilgilerini güncelleme yetkiniz yok." });
    }

    const driverData = driverDoc.data();
    const firebaseAuthUid = driverData.firebaseAuthUid;

    if (!firebaseAuthUid) {
      // If driver doesn't have a Firebase Auth UID, create one
      if (!email || !password) {
        return res.status(400).json({ message: "Yeni bir hesap oluşturmak için e-posta ve şifre gereklidir." });
      }
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: driverData.name,
      });
      await db.collection('drivers').doc(driverId).update({ firebaseAuthUid: userRecord.uid, email: email });
      return res.status(200).json({ message: "Şoför hesabı başarıyla oluşturuldu ve güncellendi." });

    } else {
      // Update existing Firebase Auth user
      const updateData = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      await admin.auth().updateUser(firebaseAuthUid, updateData);

      // Also update email in Firestore if it was changed
      if (email && driverData.email !== email) {
        await db.collection('drivers').doc(driverId).update({ email: email });
      }

      res.status(200).json({ message: "Şoför kimlik bilgileri başarıyla güncellendi." });
    }

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      return res.status(400).json({ message: "Bu e-posta adresi zaten kullanımda." });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ message: "Geçersiz e-posta formatı." });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ message: "Şifre çok zayıf. En az 6 karakter olmalıdır." });
    }
    console.error("Şoför kimlik bilgileri güncellenirken hata:", error);
    res.status(500).json({ message: "Şoför kimlik bilgileri güncellenirken bir hata oluştu." });
  }
});

// Kullanıcıya ait bir şoförü sil
router.delete('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  const driverId = req.params.id;
  try {
    const driverRef = db.collection('drivers').doc(driverId);
    const driverDoc = await driverRef.get();

    if (!driverDoc.exists) {
        return res.status(404).json({ message: "Silinecek şoför bulunamadı." });
    }

    if (driverDoc.data().ownerId !== userId) {
        return res.status(403).json({ message: "Bu şoförü silme yetkiniz yok." });
    }

    await driverRef.delete();
    res.status(200).json({ message: "Şoför başarıyla silindi." });
  } catch (error) {
    console.error("Şoför silinirken hata:", error);
    res.status(500).json({ message: "Şoför silinirken bir hata oluştu." });
  }
});

module.exports = router;
