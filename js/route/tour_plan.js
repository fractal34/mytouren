// --- TUR PLANI TABLOSU YÖNETİMİ ---

function updateTourPlan(optimizedSequence, driver, markets) {
    const dateEl = document.getElementById('tour-plan-date');
    const driverEl = document.getElementById('tour-plan-driver');
    const tableBody = document.getElementById('tour-plan-table-body');
    const totalPalletsEl = document.getElementById('tour-plan-total-pallets');
    const totalKgEl = document.getElementById('tour-plan-total-kg');

    dateEl.innerHTML = `<strong>Tarih:</strong> ${new Date().toLocaleDateString('de-DE')}`;
    driverEl.innerHTML = driver ? `<strong>Şoför:</strong> ${driver.name} ${driver.licensePlate}` : '<strong>Şoför:</strong> --';

    tableBody.innerHTML = '';
    let totalPallets = 0;
    let totalKg = 0;

    const stops = optimizedSequence.filter(wp => wp.id !== 'start' && wp.id !== 'end');

    stops.forEach((stop, index) => {
        const market = markets.find(m => m.id === stop.id);
        if (!market) return;

        const euroPallets = market.euroPallets || 0;
        const widePallets = market.widePallets || 0;
        const kg = market.totalKg || 0;
        totalPallets += euroPallets + widePallets;
        totalKg += kg;

        let palletCellHtml = `
            <table class="inner-pallet-table">
                <tr>
                    <th>E</th>
                    <th>G</th>
                </tr>
                <tr>
                    <td>${euroPallets}</td>
                    <td>${widePallets || ''}</td>
                </tr>
            </table>
        `;

        const row = `
            <tr data-id="${market.id}">
                <td class="tour-plan-index-col">${index + 1}</td>
                <td>${market.customerNumber || ''}</td>
                <td class="text-start">
                    <strong>${market.name}</strong><br>
                    <small>${market.addressDetails.city}</small>
                </td>
                <td>${palletCellHtml}</td>
                <td>${kg}</td>
                <td contenteditable="true" data-field="notes">
                    ${market.notes || ''}
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    const specialNotesContentDiv = document.getElementById('special-notes-content');
    specialNotesContentDiv.innerHTML = '';

    const marketsWithSpecialNotes = markets.filter(m => m.specialNotes && m.specialNotes.trim() !== '');

    if (marketsWithSpecialNotes.length > 0) {
        marketsWithSpecialNotes.forEach(market => {
            const p = document.createElement('p');
            p.className = 'mb-1';
            p.innerHTML = `<strong>${market.customerNumber || '--'} - ${market.name}:</strong> ${market.specialNotes}`;
            specialNotesContentDiv.appendChild(p);
        });
    } else {
        specialNotesContentDiv.innerHTML = '<p class="text-muted mb-0">Özel durum bulunmamaktadır.</p>';
    }

    totalPalletsEl.textContent = totalPallets;
    totalKgEl.textContent = totalKg.toLocaleString();

    if (sortableTourPlan) sortableTourPlan.destroy();
    sortableTourPlan = new Sortable(tableBody, {
        animation: 150,
        ghostClass: 'bg-info-subtle',
        handle: '.tour-plan-index-col',
        onEnd: async (evt) => {
            const [movedItem] = stops.splice(evt.oldIndex, 1);
            stops.splice(evt.newIndex, 0, movedItem);

            const driver = allDrivers.find(d => d.id === document.getElementById('driver-select').value);
            updateTourPlan(stops, driver, markets);
            showNotification('Sıralama güncelleniyor...', 'info');

            try {
                const routeId = currentEditingRouteId;
                if (!routeId) {
                    console.warn('Düzenleme modunda Rota ID bulunamadı, sıralama kaydedilemedi.');
                    return;
                }

                const response = await fetch(`/api/routing/routes/${routeId}/sequence`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stops: stops })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Sıralama sunucuya kaydedilemedi.');
                }
                showNotification('Rota sıralaması başarıyla güncellendi.', 'success');
                await renderSavedRoutes();
            } catch (error) {
                console.error('Sıralama kaydetme hatası:', error);
                showNotification(`Sıralama kaydedilirken hata: ${error.message}`, 'error');
            }
        }
    });
}

// --- Tur Atama Modalı Mantığı ---

let assignDatePicker; // Flatpickr instance
let assignTourButtonListenerAdded = false; // Flag to prevent multiple event listeners

function showAssignTourModal() {
    const assignDriverSelect = document.getElementById('assign-driver-select');
    assignDriverSelect.innerHTML = '<option value="">Şoför Seçin</option>'; // Clear previous options

    if (typeof allDrivers !== 'undefined' && allDrivers.length > 0) {
        allDrivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = `${driver.name} (${driver.licensePlate})`;
            assignDriverSelect.appendChild(option);
        });

        // Pre-select driver if currentEditingRoute has a driverId
        if (typeof currentEditingRoute !== 'undefined' && currentEditingRoute && currentEditingRoute.driverId) {
            assignDriverSelect.value = currentEditingRoute.driverId;
        }
    } else {
        console.warn('Şoför verisi yüklenemedi veya boş.');
        showNotification('Şoför verisi bulunamadı. Lütfen şoför ekleyin.', 'warning');
    }

    // Initialize Flatpickr if not already initialized
    if (!assignDatePicker) {
        assignDatePicker = flatpickr("#assignment-date-picker", {
            dateFormat: "d.m.Y",
            defaultDate: "today",
            locale: "de" // Assuming German locale for date format
        });
    } else {
        assignDatePicker.setDate(new Date()); // Reset date to today
    }

    const assignTourModalElement = document.getElementById('assignTourModal');
    const assignTourModal = new bootstrap.Modal(assignTourModalElement);
    assignTourModal.show();

    // Attach event listener only once
    if (!assignTourButtonListenerAdded) {
        document.getElementById('confirm-assign-tour-button').addEventListener('click', async () => {
            const driverId = document.getElementById('assign-driver-select').value;
            const assignmentDate = document.getElementById('assignment-date-picker').value;

            if (!driverId) {
                showNotification('Lütfen bir şoför seçin.', 'warning');
                return;
            }
            if (!assignmentDate) {
                showNotification('Lütfen bir atama tarihi seçin.', 'warning');
                return;
            }
            if (!currentEditingRouteId) {
                showNotification('Atanacak bir rota bulunamadı. Lütfen önce bir rota oluşturun veya seçin.', 'warning');
                return;
            }

            try {
                const response = await fetchWithAuth('/api/routing/assign-tour', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        routeId: currentEditingRouteId,
                        driverId: driverId,
                        assignmentDate: assignmentDate
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Turu atarken bir hata oluştu.');
                }

                showNotification('Tur başarıyla şoföre atandı!', 'success');
                const assignTourModalInstance = bootstrap.Modal.getInstance(assignTourModalElement);
                assignTourModalInstance.hide();
                await loadInitialData(); // Refresh all data, which also calls renderSavedRoutes()
            } catch (error) {
                console.error('Tur atama hatası:', error);
                showNotification(`Tur atanamadı: ${error.message}`, 'error');
            }
        });
        assignTourButtonListenerAdded = true;
    }
}

function updateTourPlanTotals() {
    const totalPalletsEl = document.getElementById('tour-plan-total-pallets');
    const totalKgEl = document.getElementById('tour-plan-total-kg');

    let totalPallets = 0;
    let totalKg = 0;

    selectedRouteMarkets.forEach(market => {
        totalPallets += (market.euroPallets || 0) + (market.widePallets || 0);
        totalKg += market.totalKg || 0;
    });

    if (totalPalletsEl) {
        totalPalletsEl.textContent = totalPallets;
    }
    if (totalKgEl) {
        totalKgEl.textContent = totalKg.toLocaleString();
    }
}
