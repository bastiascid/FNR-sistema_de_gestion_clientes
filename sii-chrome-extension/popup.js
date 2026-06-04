document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('server-url');
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-message');

  // Load existing configuration
  chrome.storage.sync.get(['serverUrl', 'apiKey'], (data) => {
    if (data.serverUrl) {
      serverUrlInput.value = data.serverUrl;
    }
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Save configuration
  saveBtn.addEventListener('click', () => {
    let serverUrl = serverUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!serverUrl || !apiKey) {
      showStatus('Por favor, completa todos los campos.', 'error');
      return;
    }

    // Clean trailing slash of URL
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }

    chrome.storage.sync.set({ serverUrl, apiKey }, () => {
      showStatus('Configuración guardada correctamente.', 'success');
      setTimeout(() => {
        window.close();
      }, 1200);
    });
  });

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = `status ${type}`;
    statusMsg.style.display = 'block';
  }
});
