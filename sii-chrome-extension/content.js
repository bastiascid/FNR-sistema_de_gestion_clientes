// Content script for FNR SII Integration

(function() {
  // Check if we are in a BHE page or document
  const bodyText = document.body.innerText || '';
  const isBhe = bodyText.includes('Boleta de Honorarios Electrónica') || 
                bodyText.includes('BOLETA DE HONORARIOS ELECTRONICA') ||
                bodyText.includes('Boleta de Honorarios') ||
                window.location.href.includes('BHE_Visualizador') ||
                window.location.href.includes('ctor_boletas');

  if (!isBhe) return;

  console.log('FNR Extension: Boleta de Honorarios page detected.');

  // Scrape text to extract details
  const parsedData = scrapeBheData(bodyText);

  // Ingest floating button in the page
  injectFloatingButton(parsedData);
})();

// Helper to scrape BHE data using regex
function scrapeBheData(text) {
  const data = {
    boleta: '',
    rut_emisor: '',
    nombre_emisor: '',
    fecha: '',
    monto: '',
    detalle: ''
  };

  try {
    // 1. Clean up multi-spaces and line breaks for matching
    const cleanText = text.replace(/\s+/g, ' ');

    // 2. Extract Boleta Number
    // Looks for "N° 12345" or "Numero 12345"
    const boletaMatch = text.match(/N[°o]\s*[:\.]?\s*(\d+)/i) || 
                        text.match(/N[úu]mero\s*[:\.]?\s*(\d+)/i) ||
                        text.match(/Boleta\s*N[°o]\s*(\d+)/i);
    if (boletaMatch) {
      data.boleta = boletaMatch[1];
    }

    // 3. Extract RUTs in page
    // Chilean RUT regex
    const rutRegex = /(\d{1,2}\.\d{3}\.\d{3}-[\dkK]|\d{7,8}-[\dkK])/g;
    const ruts = text.match(rutRegex);
    if (ruts && ruts.length > 0) {
      // The first RUT is typically the Emisor (the professional)
      data.rut_emisor = ruts[0];
    }

    // 4. Extract Emisor Name
    // Usually the name is in the first few lines of the text, before the first RUT
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      // Find the line that looks like the professional's name (capitalized, no numbers, first 3 lines)
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.toUpperCase() === line && 
            !line.includes('RUT') && 
            !line.includes('R.U.T') && 
            !line.includes('BOLETA') && 
            !line.includes('ELECTRONICA') &&
            /[A-Z]/.test(line) &&
            !/\d/.test(line)) {
          data.nombre_emisor = line;
          break;
        }
      }
    }

    // 5. Extract Date
    // Format: "19 de Febrero de 2026"
    const months = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
      'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    const dateMatch = cleanText.match(/(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*de\s*(20\d{2})/i);
    
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const monthName = dateMatch[2].toLowerCase();
      const month = months[monthName];
      const year = dateMatch[3];
      data.fecha = `${year}-${month}-${day}`;
    } else {
      // Fallback: search for YYYY-MM-DD or DD/MM/YYYY
      const isoMatch = cleanText.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        data.fecha = isoMatch[0];
      } else {
        const simpleMatch = cleanText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (simpleMatch) {
          data.fecha = `${simpleMatch[3]}-${simpleMatch[2]}-${simpleMatch[1]}`;
        } else {
          // Default to current date in Chile YYYY-MM-DD
          const today = new Date();
          data.fecha = today.toISOString().split('T')[0];
        }
      }
    }

    // 6. Extract Total Gross Value (Monto)
    // Looks for "Total Honorarios: $ 75.000" or similar
    const totalMatch = cleanText.match(/Total\s*(?:Honorarios?)?\s*[:\.]?\s*\$\s*([0-9\.]+)/i) || 
                       cleanText.match(/Total\s*Bruto\s*[:\.]?\s*\$\s*([0-9\.]+)/i) ||
                       cleanText.match(/Total\s*:\s*\$\s*([0-9\.]+)/i) ||
                       cleanText.match(/Monto\s*Total\s*[:\.]?\s*\$\s*([0-9\.]+)/i);
    if (totalMatch) {
      // Remove thousands separators to make it a clean number
      data.monto = totalMatch[1].replace(/\./g, '');
    }

    // 7. Extract Glosa (Description)
    // Looks for "Por concepto de: ..." or "Atención: ..."
    const conceptMatch = text.match(/Por\s*concepto\s*de\s*:\s*(.*)/i) || 
                         text.match(/Atenci[oó]n\s*:\s*(.*)/i) ||
                         text.match(/Glosa\s*:\s*(.*)/i);
    if (conceptMatch) {
      // Get the concept, limit to 60 characters for DB compatibility
      data.detalle = conceptMatch[1].trim().split('\n')[0].substring(0, 80);
    }
  } catch (e) {
    console.error('FNR Extension: Error scraping BHE data', e);
  }

  return data;
}

// Injects a floating action button on the SII page
function injectFloatingButton(data) {
  // Check if button already exists
  if (document.getElementById('fnr-sync-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'fnr-sync-btn';
  btn.innerHTML = `
    <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
    </svg>
    Sincronizar con FNR
  `;
  
  // Style floating button
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '99999',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4), 0 4px 6px -2px rgba(79, 70, 229, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    align-items: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  });

  btn.addEventListener('mouseover', () => {
    btn.style.backgroundColor = '#4338ca';
    btn.style.transform = 'translateY(-2px)';
  });

  btn.addEventListener('mouseout', () => {
    btn.style.backgroundColor = '#4f46e5';
    btn.style.transform = 'translateY(0)';
  });

  btn.addEventListener('click', () => {
    showSyncModal(data);
  });

  document.body.appendChild(btn);
}

// Injects and opens a confirmation modal in the page
function showSyncModal(initialData) {
  // Remove existing modal if open
  const existingModal = document.getElementById('fnr-sync-modal-container');
  if (existingModal) existingModal.remove();

  const container = document.createElement('div');
  container.id = 'fnr-sync-modal-container';
  
  // Style overlay
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: '100000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  const modal = document.createElement('div');
  modal.id = 'fnr-sync-modal';
  
  // Style modal
  Object.assign(modal.style, {
    backgroundColor: '#ffffff',
    width: '420px',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fnrFadeIn 0.3s ease-out'
  });

  // Inject fade in animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fnrFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Modal HTML content
  modal.innerHTML = `
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color:#ffffff; padding: 18px 24px;">
      <h3 style="margin:0; font-size:16px; font-weight:800; letter-spacing:0.025em;">Revisar Datos de Boleta</h3>
      <p style="margin:4px 0 0 0; font-size:11px; color:#c7d2fe;">Confirma los detalles antes de subir al portal FNR.</p>
    </div>
    <div style="padding: 20px 24px; display:flex; flex-direction:column; gap:12px; max-height:450px; overflow-y:auto;">
      
      <div style="display:flex; gap:12px;">
        <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">N° Boleta</label>
          <input type="text" id="fnr-input-boleta" value="${initialData.boleta}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
        </div>
        <div style="flex:1.5; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">RUT Emisor</label>
          <input type="text" id="fnr-input-rut" value="${initialData.rut_emisor}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Nombre Emisor</label>
        <input type="text" id="fnr-input-nombre" value="${initialData.nombre_emisor}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
      </div>

      <div style="display:flex; gap:12px;">
        <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Fecha de Emisión</label>
          <input type="date" id="fnr-input-fecha" value="${initialData.fecha}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Monto Bruto ($)</label>
          <input type="number" id="fnr-input-monto" value="${initialData.monto}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Detalle / Concepto</label>
        <input type="text" id="fnr-input-detalle" value="${initialData.detalle || `Honorarios mes de ${getMesName(initialData.fecha)} 2026`}" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; color:#334155; outline:none;" />
      </div>

      <div id="fnr-modal-status" style="font-size:12px; padding:10px; border-radius:8px; display:none; margin-top:6px; font-weight:600;"></div>
    </div>
    
    <div style="padding: 16px 24px; background-color:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
      <button id="fnr-btn-cancel" style="background-color:transparent; color:#64748b; border:1px solid #cbd5e1; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">
        Cancelar
      </button>
      <button id="fnr-btn-send" style="background-color:#4f46e5; color:#ffffff; border:none; padding:8px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:6px;">
        Registrar en FNR
      </button>
    </div>
  `;

  container.appendChild(modal);
  document.body.appendChild(container);

  // Setup Event Listeners inside modal
  const btnCancel = document.getElementById('fnr-btn-cancel');
  const btnSend = document.getElementById('fnr-btn-send');
  const modalStatus = document.getElementById('fnr-modal-status');

  btnCancel.addEventListener('click', () => {
    container.remove();
  });

  // Close when clicking overlay
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      container.remove();
    }
  });

  btnSend.addEventListener('click', () => {
    // Get edited values
    const payload = {
      boleta: document.getElementById('fnr-input-boleta').value.trim(),
      rut_emisor: document.getElementById('fnr-input-rut').value.trim(),
      nombre_emisor: document.getElementById('fnr-input-nombre').value.trim(),
      fecha: document.getElementById('fnr-input-fecha').value.trim(),
      monto: Number(document.getElementById('fnr-input-monto').value.trim()),
      detalle: document.getElementById('fnr-input-detalle').value.trim()
    };

    if (!payload.boleta || !payload.rut_emisor || !payload.nombre_emisor || !payload.fecha || !payload.monto) {
      showModalMessage('Todos los campos excepto detalle son obligatorios.', 'error');
      return;
    }

    // Load credentials and send
    chrome.storage.sync.get(['serverUrl', 'apiKey'], (config) => {
      const { serverUrl, apiKey } = config;

      if (!serverUrl || !apiKey) {
        showModalMessage('Error: La extensión no está configurada. Haz clic en el ícono de la extensión en Chrome para guardar tu URL y API Key.', 'error');
        return;
      }

      showModalMessage('Enviando boleta al servidor...', 'info');
      btnSend.disabled = true;
      btnSend.style.opacity = '0.7';

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
        if (res.ok) {
          showModalMessage('¡Boleta registrada exitosamente en FNR Admin!', 'success');
          btnSend.style.backgroundColor = '#10b981';
          btnSend.textContent = '✓ Registrada';
          
          setTimeout(() => {
            container.remove();
          }, 1800);
        } else {
          showModalMessage(`Error del Servidor: ${responseData.error || 'Fallo desconocido'}`, 'error');
          btnSend.disabled = false;
          btnSend.style.opacity = '1';
        }
      })
      .catch((err) => {
        showModalMessage('Error de red: No se pudo establecer conexión con tu servidor FNR. Verifica que esté en línea y la URL sea correcta.', 'error');
        btnSend.disabled = false;
        btnSend.style.opacity = '1';
      });
    });
  });

  function showModalMessage(message, type) {
    modalStatus.textContent = message;
    modalStatus.style.display = 'block';
    
    if (type === 'error') {
      modalStatus.style.backgroundColor = '#fef2f2';
      modalStatus.style.color = '#991b1b';
      modalStatus.style.border = '1px solid #fecaca';
    } else if (type === 'success') {
      modalStatus.style.backgroundColor = '#ecfdf5';
      modalStatus.style.color = '#065f46';
      modalStatus.style.border = '1px solid #a7f3d0';
    } else {
      modalStatus.style.backgroundColor = '#eff6ff';
      modalStatus.style.color = '#1e40af';
      modalStatus.style.border = '1px solid #bfdbfe';
    }
  }
}

// Helper to get month name from date string
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
