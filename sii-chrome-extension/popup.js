document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabSyncBtn = document.getElementById('tab-sync-btn');
  const tabConfigBtn = document.getElementById('tab-config-btn');
  const panelSync = document.getElementById('panel-sync');
  const panelConfig = document.getElementById('panel-config');

  const configUrlInput = document.getElementById('config-url');
  const configKeyInput = document.getElementById('config-key');
  const btnConfigSave = document.getElementById('btn-config-save');
  const configStatus = document.getElementById('config-status');

  const syncBoletaInput = document.getElementById('sync-boleta');
  const syncRutInput = document.getElementById('sync-rut');
  const syncNombreInput = document.getElementById('sync-nombre');
  const syncFechaInput = document.getElementById('sync-fecha');
  const syncMontoInput = document.getElementById('sync-monto');
  const syncDetalleInput = document.getElementById('sync-detalle');
  const btnSyncSend = document.getElementById('btn-sync-send');
  const syncStatus = document.getElementById('sync-status');

  // Load Config
  let serverUrl = '';
  let apiKey = '';

  chrome.storage.sync.get(['serverUrl', 'apiKey'], (data) => {
    if (data.serverUrl) {
      serverUrl = data.serverUrl;
      configUrlInput.value = serverUrl;
    }
    if (data.apiKey) {
      apiKey = data.apiKey;
      configKeyInput.value = apiKey;
    }
    
    // Once config is loaded, try to scrape the active page
    checkActiveTabAndScrape();
  });

  // Tab switching
  tabSyncBtn.addEventListener('click', () => {
    switchTab('sync');
  });

  tabConfigBtn.addEventListener('click', () => {
    switchTab('config');
  });

  function switchTab(tab) {
    if (tab === 'sync') {
      tabSyncBtn.classList.add('active');
      tabConfigBtn.classList.remove('active');
      panelSync.classList.add('active');
      panelConfig.classList.remove('active');
    } else {
      tabConfigBtn.classList.add('active');
      tabSyncBtn.classList.remove('active');
      panelConfig.classList.add('active');
      panelSync.classList.remove('active');
    }
  }

  // Save config
  btnConfigSave.addEventListener('click', () => {
    let url = configUrlInput.value.trim();
    const key = configKeyInput.value.trim();

    if (!url || !key) {
      showConfigStatus('Por favor, completa todos los campos.', 'error');
      return;
    }

    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    chrome.storage.sync.set({ serverUrl: url, apiKey: key }, () => {
      serverUrl = url;
      apiKey = key;
      showConfigStatus('Configuración guardada correctamente.', 'success');
      setTimeout(() => {
        // If we have an active BHE page, switch back to sync tab
        checkActiveTabAndScrape();
      }, 1000);
    });
  });

  // Scrape current page
  function checkActiveTabAndScrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const tab = tabs[0];
      const url = tab.url || '';

      const isSii = url.includes('sii.cl');

      if (!isSii) {
        // Not on SII website
        showSyncStatus('Abre el portal del SII y visualiza una boleta de honorarios para sincronizar.', 'info');
        btnSyncSend.disabled = true;
        switchTab('config'); // Go to config by default if not on SII
        return;
      }

      // We are on SII, try to scrape
      showSyncStatus('Detectando datos de la boleta...', 'info');
      btnSyncSend.disabled = false;
      switchTab('sync');

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
        // Check for errors (e.g. extension not loaded in iframe or visualizer not active)
        if (chrome.runtime.lastError || !response || !response.data) {
          showSyncStatus('No se detectaron datos automáticos. Puedes ingresarlos manualmente o refrescar la página del SII.', 'error');
          return;
        }

        const data = response.data;
        
        // Prefill inputs
        if (data.boleta) syncBoletaInput.value = data.boleta;
        if (data.rut_emisor) syncRutInput.value = data.rut_emisor;
        if (data.nombre_emisor) syncNombreInput.value = data.nombre_emisor;
        if (data.fecha) syncFechaInput.value = data.fecha;
        if (data.monto) syncMontoInput.value = data.monto;
        
        if (data.fecha) {
          syncDetalleInput.value = data.detalle || `Honorarios mes de ${getMesName(data.fecha)} 2026`;
        } else {
          syncDetalleInput.value = data.detalle || '';
        }

        showSyncStatus('Datos de boleta detectados con éxito.', 'success');
      });
    });
  }

  // Send Boleta to Server
  btnSyncSend.addEventListener('click', () => {
    const payload = {
      boleta: syncBoletaInput.value.trim(),
      rut_emisor: syncRutInput.value.trim(),
      nombre_emisor: syncNombreInput.value.trim(),
      fecha: syncFechaInput.value.trim(),
      monto: Number(syncMontoInput.value.trim()),
      detalle: syncDetalleInput.value.trim()
    };

    if (!payload.boleta || !payload.rut_emisor || !payload.nombre_emisor || !payload.fecha || !payload.monto) {
      showSyncStatus('Todos los campos son obligatorios.', 'error');
      return;
    }

    if (!serverUrl || !apiKey) {
      showSyncStatus('Error: Configura primero la URL del servidor y la clave API en la pestaña Configurar.', 'error');
      switchTab('config');
      return;
    }

    showSyncStatus('Enviando boleta a FNR Admin...', 'info');
    btnSyncSend.disabled = true;

    fetch(`${serverUrl}/api/sii/boleta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sii-extension-key': apiKey
      },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const responseData = await res.json();
      btnSyncSend.disabled = false;
      if (res.ok) {
        showSyncStatus('¡Boleta registrada exitosamente!', 'success');
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        showSyncStatus(`Error: ${responseData.error || 'Fallo desconocido'}`, 'error');
      }
    })
    .catch((err) => {
      btnSyncSend.disabled = false;
      showSyncStatus('Error de conexión. Verifica la URL y que tu servidor esté encendido.', 'error');
    });
  });

  function showConfigStatus(msg, type) {
    configStatus.textContent = msg;
    configStatus.className = `status ${type}`;
  }

  function showSyncStatus(msg, type) {
    syncStatus.textContent = msg;
    syncStatus.className = `status ${type}`;
  }

  function getMesName(dateStr) {
    if (!dateStr) return 'Enero';
    try {
      const parts = dateStr.split('-');
      if (parts.length < 2) return 'Enero';
      const monthIndex = parseInt(parts[1]) - 1;
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return months[monthIndex] || 'Enero';
    } catch (e) {
      return 'Enero';
    }
  }
});
