// --- ŞOFÖR YÖNETİMİ FONKSİYONLARI ---

function renderDriverList(drivers) {
    const driverList = document.getElementById('driver-list');
    if (!driverList) return;

    driverList.innerHTML = '';
    drivers.forEach(driver => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
            <span>
                <strong>${driver.name}</strong> <small class="text-muted">(${driver.licensePlate})</small>
            </span>
            <div>
               <button class="btn btn-sm btn-outline-primary me-2 edit-driver-btn" data-id="${driver.id}"><i class="bi bi-pencil-fill"></i></button>
               <button class="btn btn-sm btn-outline-danger delete-driver-btn" data-id="${driver.id}"><i class="bi bi-trash"></i></button>
            </div>
        `;
        listItem.querySelector('.edit-driver-btn').addEventListener('click', handleEditDriver);
        listItem.querySelector('.delete-driver-btn').addEventListener('click', handleDeleteDriver);
        driverList.appendChild(listItem);
    });
}

function resetDriverForm() {
    const form = document.getElementById('add-driver-form');
    form.reset();
    document.getElementById('editing-driver-id').value = ''; // Gizli ID alanını temizle
    form.querySelector('h6').textContent = 'Yeni Şoför Ekle';
    form.querySelector('button[type="submit"]').textContent = 'Şoför Ekle';
    form.querySelector('button[type="submit"]').classList.replace('btn-primary', 'btn-success');
    currentEditingDriverId = null;
}

function handleEditDriver(event) {
    currentEditingDriverId = event.currentTarget.dataset.id;
    const driver = allDrivers.find(d => d.id === currentEditingDriverId);
    if (driver) {
        populateDriverForm(driver);
    }
}

function populateDriverForm(driver) {
    const form = document.getElementById('add-driver-form');
    document.getElementById('editing-driver-id').value = driver.id; // Gizli ID alanını doldur
    form.querySelector('#driver-name').value = driver.name;
    form.querySelector('#driver-plate').value = driver.licensePlate;
    form.querySelector('#driver-max-tonnage').value = driver.maxTonnage || ''; // Changed ID and added default empty
    form.querySelector('#driver-pallet-capacity').value = driver.palletCapacity || '';
    form.querySelector('#driver-fixed-start').value = driver.fixedStart.address;
    form.querySelector('#driver-fixed-end').value = driver.fixedEnd.address;

    // Populate email and password fields if they exist (for editing existing drivers with accounts)
    form.querySelector('#driver-email').value = driver.email || '';
    form.querySelector('#driver-password').value = ''; // Never pre-fill password for security

    // Hide password change section when populating form for editing
    const passwordChangeSection = document.getElementById('password-change-section');
    if (passwordChangeSection) {
        passwordChangeSection.classList.add('d-none');
        document.getElementById('new-driver-password').value = ''; // Clear new password fields
        document.getElementById('confirm-new-driver-password').value = '';
        document.getElementById('password-change-error').textContent = ''; // Clear any error messages
    }

    form.querySelector('h6').textContent = 'Şoför Düzenle';
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = 'Değişiklikleri Kaydet';
    submitButton.classList.replace('btn-success', 'btn-primary');
    window.scrollTo(0, 0);
}

async function handleAddDriver(event) {
    event.preventDefault();
    const driverEmail = document.getElementById('driver-email').value;
    const driverPassword = document.getElementById('driver-password').value;

    const driverData = {
        name: document.getElementById('driver-name').value,
        licensePlate: document.getElementById('driver-plate').value,
        maxTonnage: document.getElementById('driver-max-tonnage').value, // Changed ID
        palletCapacity: document.getElementById('driver-pallet-capacity').value,
        fixedStartAddress: document.getElementById('driver-fixed-start').value,
        fixedEndAddress: document.getElementById('driver-fixed-end').value
    };

    // Only include email and password if they are provided
    if (driverEmail && driverPassword) {
        driverData.email = driverEmail;
        driverData.password = driverPassword;
    }

    console.log('Sending driverData:', driverData); // Added for debugging

    try {
        const response = await fetchWithAuth('/api/drivers', {
            method: 'POST',
            body: JSON.stringify(driverData)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Şoför eklenemedi.');
        
        showNotification('Şoför başarıyla eklendi!', 'success');
        document.getElementById('add-driver-form').reset();
        await loadInitialData(); // Verileri ve listeyi yenile
        showDriverManagementView(); // Şoför listesini güncellemek için görünümü yeniden çiz
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleDeleteDriver(event) {
    const driverId = event.currentTarget.dataset.id;
    if (confirm('Bu şoförü silmek istediğinizden emin misiniz?')) {
        try {
            const response = await fetchWithAuth(`/api/drivers/${driverId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Şoför silinemedi.');
            showNotification('Şoför başarıyla silindi.', 'success');
            await loadInitialData(); // Verileri yeniden yükle
            renderDriverList(allDrivers); // Listeyi güncel verilerle yeniden çiz
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
}

function showDriverManagementView() {
    hideAllControlPanels();
    document.getElementById('driver-management-view').classList.remove('d-none');
    renderDriverList(allDrivers); // Mevcut yüklenmiş verilerle listeyi çiz
}

async function handleSaveNewDriverPassword() {
    const newPasswordInput = document.getElementById('new-driver-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-driver-password');
    const passwordChangeError = document.getElementById('password-change-error');
    const driverId = document.getElementById('editing-driver-id').value; // ID'yi gizli alandan oku

    passwordChangeError.textContent = ''; // Clear previous errors

    if (!driverId) {
        passwordChangeError.textContent = 'Şoför seçimi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.';
        console.error('Hata: Şifre kaydedilmeye çalışıldı ancak editing-driver-id boş.');
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!newPassword || !confirmNewPassword) {
        passwordChangeError.textContent = 'Lütfen yeni şifreyi ve onayını girin.';
        return;
    }

    if (newPassword !== confirmNewPassword) {
        passwordChangeError.textContent = 'Yeni şifreler eşleşmiyor.';
        return;
    }

    if (newPassword.length < 6) { // Firebase minimum password length
        passwordChangeError.textContent = 'Şifre en az 6 karakter olmalıdır.';
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/drivers/${driverId}/credentials`, { // Değişkeni burada kullan
            method: 'PUT',
            body: JSON.stringify({ password: newPassword })
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Şifre güncellenemedi.');
        }

        // Başarı mesajını global bildirim yerine yerel olarak göster
        const passwordChangeElement = document.getElementById('password-change-error');
        passwordChangeElement.textContent = 'Şifre başarıyla güncellendi!';
        passwordChangeElement.classList.remove('text-danger');
        passwordChangeElement.classList.add('text-success');

        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';

        // Bölümü ve mesajı bir süre sonra gizle
        setTimeout(() => {
            document.getElementById('password-change-section').classList.add('d-none');
            passwordChangeElement.textContent = '';
            // Hata stili sınıfını gelecekteki hatalar için sıfırla
            passwordChangeElement.classList.remove('text-success');
            passwordChangeElement.classList.add('text-danger');
        }, 2500); // 2.5 saniye sonra gizle

    } catch (error) {
        passwordChangeError.textContent = `Şifre güncellenirken hata: ${error.message}`;
        console.error('Şifre güncelleme hatası:', error);
    }
}

// YENİ FONKSİYON: Şoför seçimi değiştiğinde tetiklenir
function handleDriverSelectionChange(event) {
    const driverId = event.target.value;
    const selectedDriver = allDrivers.find(d => d.id === driverId);

    const startSelect = document.getElementById('start');
    const endSelect = document.getElementById('end');
    const weightInput = document.getElementById('weight');
    const palletCapacityInput = document.getElementById('truck-pallet-capacity');

    // Önceki şoförden kalan özel seçenekleri temizle
    Array.from(startSelect.options).forEach(opt => {
        if (opt.dataset.driverSpecific) startSelect.remove(opt.index);
    });
    Array.from(endSelect.options).forEach(opt => {
        if (opt.dataset.driverSpecific) endSelect.remove(opt.index);
    });

    if (selectedDriver) {
        // Tonaj ve Palet Kapasitesini Güncelle (Hem eski `maxWeight` hem de yeni `maxPallets` ile uyumlu)
        weightInput.value = selectedDriver.maxTonnage || selectedDriver.maxWeight || 0; // Changed to maxTonnage
        palletCapacityInput.value = selectedDriver.palletCapacity || 0;

        // Başlangıç ve Bitiş Noktalarını Güncelle
        if (selectedDriver.fixedStart && selectedDriver.fixedStart.coordinates) {
            const startCoords = `${selectedDriver.fixedStart.coordinates.lat},${selectedDriver.fixedStart.coordinates.lng}`;
            const startOption = new Option(selectedDriver.fixedStart.address, startCoords, true, true);
            startOption.dataset.driverSpecific = true; // Bu seçeneğin şoföre özel olduğunu işaretle
            startSelect.add(startOption);
            startSelect.value = startCoords;
        }

        if (selectedDriver.fixedEnd && selectedDriver.fixedEnd.coordinates) {
            const endCoords = `${selectedDriver.fixedEnd.coordinates.lat},${selectedDriver.fixedEnd.coordinates.lng}`;
            const endOption = new Option(selectedDriver.fixedEnd.address, endCoords, true, true);
            endOption.dataset.driverSpecific = true; // Bu seçeneğin şoföre özel olduğunu işaretle
            endSelect.add(endOption);
            endSelect.value = endCoords;
        }

    } else {
        // Şoför seçilmediyse alanları varsayılan değerlere döndür
        weightInput.value = 25000;
        palletCapacityInput.value = 34;
        // Genel başlangıç/bitiş noktalarını yeniden doldur
        populateStartEndLocations(); 
    }

    // Değişikliklerin UI'a yansıması için toplamları güncelle
    if (typeof updateTotals === 'function') {
        updateTotals();
    }
}