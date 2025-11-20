// js/app.js
const API_BASE_URL = 'http://localhost:8080/api';
const INCIDENTS_URL = `${API_BASE_URL}/incidents`;
const ML_API_BASE = `${API_BASE_URL}/ml`;

// Elementos de la UI
const tableBody = document.getElementById('incidentTableBody');
const createForm = document.getElementById('createIncidentForm');
const statusFilter = document.getElementById('statusFilter');

let currentIncidentIdToUpdate = null; // Para el modal de estado

// ====================================================================
// UTILIDADES Y AUTENTICACIÓN
// ====================================================================

function getToken() {
    return localStorage.getItem('jwtToken');
}

// Llama a esta función al cargar cualquier página protegida
function checkAuthAndLoad() {
    // Redirige al login si no hay token
    if (!getToken()) {
        // Excluye auth.html y index.html de la redirección forzada
        if (!window.location.pathname.endsWith('auth.html') && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'auth.html';
        }
        return;
    }

    // Inyecta la barra de navegación en todas las páginas internas protegidas
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        injectNavbar();
    }

    // Lógica específica por página
    if (window.location.pathname.endsWith('incidents.html')) {
        loadIncidents(); // Cargar la tabla
    } else if (window.location.pathname.endsWith('map.html')) {
        loadIncidentsForMap(); // Cargar el mapa
    } else if (window.location.pathname.endsWith('ml.html')) {
        initializeMLContent(); // Cargar la interfaz de ML
    } else if (window.location.pathname.endsWith('profile.html')) {
        // Datos ya se cargan en injectNavbar/setupProfile
    }
}

// Función para hacer peticiones protegidas (Añade el header Authorization)
async function protectedFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        // En caso de fallo de token, redirige
        logout();
        throw new Error('No hay token disponible o la sesión ha expirado. Re-inicie sesión.');
    }

    const defaultOptions = {
        headers: {
            // Content-Type solo si no se usa FormData (ej. en train/csv o train/arff)
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            'Authorization': `Bearer ${token}`
        },
        ...options
    };

    // Sobreescribir solo si se pasaron headers personalizados
    if (options.headers) {
        defaultOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    const response = await fetch(url, defaultOptions);

    // Si el token expira (401 o 403), cerrar sesión
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Sesión expirada o no autorizada. Re-inicie sesión.');
    }
    return response;
}

// ====================================================================
// AUTENTICACIÓN (Lógica en auth.html)
// ====================================================================

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('username', username); // Almacenar el username
            window.location.href = 'home.html';
        } else {
            messageDiv.textContent = data.error || 'Credenciales inválidas.';
        }
    } catch (error) {
        messageDiv.textContent = 'Error de conexión con el servidor.';
        console.error("Error de login:", error);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const messageDiv = document.getElementById('registerMessage');
    messageDiv.textContent = 'Registrando...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.textContent = '¡Registro exitoso! Por favor, inicie sesión.';
            document.getElementById('registerForm').reset();
            // Llama a la función global showForm (definida en auth.html)
            if (typeof showForm === 'function') showForm('login');
        } else {
            messageDiv.textContent = data.error || 'Error al registrar usuario.';
        }
    } catch (error) {
        messageDiv.textContent = 'Error de conexión con el servidor.';
        console.error("Error de registro:", error);
    }
}

function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
    alert('Sesión cerrada.');
    window.location.href = 'auth.html';
}

// ====================================================================
// NAVEGACIÓN Y NAVBAR
// ====================================================================

function injectNavbar() {
    // Si estás usando la misma barra de navegación en todas las páginas:
    const navbarHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
            <div class="container">
                <a class="navbar-brand" href="home.html">Cartagena Segura 🛡️</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item"><a class="nav-link" href="home.html">Home</a></li>
                        <li class="nav-item"><a class="nav-link" href="incidents.html">Incidentes (CRUD)</a></li>
                        <li class="nav-item"><a class="nav-link" href="map.html">Mapa de Incidentes</a></li>
                        <li class="nav-item"><a class="nav-link" href="ml.html">ML / WEKA</a></li>
                        <li class="nav-item"><a class="nav-link" href="profile.html">Perfil</a></li>
                    </ul>
                    <span class="navbar-text me-3">
                        Usuario: <strong id="currentUsername"></strong>
                    </span>
                    <button class="btn btn-outline-danger" onclick="logout()">Salir</button>
                </div>
            </div>
        </nav>`;

    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = navbarHTML;

        // Configurar el username en la barra de navegación
        const username = localStorage.getItem('username') || 'N/A';
        document.getElementById('currentUsername').textContent = username;

        // Configurar el perfil si estamos en la página de perfil
        if (window.location.pathname.endsWith('profile.html')) {
            document.getElementById('profileUsername').textContent = username;
            document.getElementById('profileRole').textContent = localStorage.getItem('role') || 'USER';
            document.getElementById('profileToken').textContent = getToken() ? 'Token Válido' : 'No hay token';
        }
    }
}


// ====================================================================
// GESTIÓN DE INCIDENTES (CRUD)
// ====================================================================

async function loadIncidents() {
    const status = statusFilter.value;
    let url = INCIDENTS_URL;

    if (status !== 'ALL') {
        url = `${INCIDENTS_URL}/status/${status}`;
    }

    try {
        const response = await protectedFetch(url);
        if (!response.ok) {
            throw new Error('Error al cargar los incidentes');
        }
        const incidents = await response.json();
        renderIncidents(incidents);
    } catch (error) {
        console.error("Error al obtener incidentes:", error);
        alert(`No se pudieron cargar los incidentes: ${error.message}`);
        // Renderizar tabla vacía en caso de error
        document.getElementById('incidentTableBody').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar incidentes.</td></tr>';
    }
}

function renderIncidents(incidents) {
    tableBody.innerHTML = '';
    if (incidents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay incidentes para mostrar.</td></tr>';
        return;
    }

    incidents.forEach(incident => {
        const row = document.createElement('tr');
        row.className = `status-${incident.status}`;

        row.innerHTML = `
            <td>${incident.id}</td>
            <td>${incident.type}</td>
            <td>${incident.description}</td>
            <td>${incident.location || 'N/A'}</td>
            <td><strong>${incident.status}</strong></td>
            <td>
                <button class="btn btn-sm btn-info me-2" onclick="openStatusModal('${incident.id}', '${incident.status}')">
                    Estado
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteIncident('${incident.id}')">
                    Eliminar
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function handleCreateIncident(event) {
    event.preventDefault();

    const newIncident = {
        type: document.getElementById('type').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location').value,
        // status se inicializa en PENDING en el backend
    };

    try {
        const response = await protectedFetch(INCIDENTS_URL, {
            method: 'POST',
            body: JSON.stringify(newIncident)
        });

        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }

        alert('Incidente creado exitosamente!');
        createForm.reset();
        loadIncidents();
    } catch (error) {
        console.error("Error al crear incidente:", error);
        alert(`Error al crear el incidente: ${error.message}`);
    }
}

async function deleteIncident(id) {
    if (!confirm(`¿Está seguro de eliminar el incidente con ID ${id}?`)) {
        return;
    }

    try {
        const response = await protectedFetch(`${INCIDENTS_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.status === 204) {
            alert('Incidente eliminado exitosamente.');
            loadIncidents();
        } else {
             throw new Error(`Error al eliminar: Código ${response.status}`);
        }
    } catch (error) {
        console.error("Error al eliminar incidente:", error);
        alert(`Error al eliminar el incidente: ${error.message}`);
    }
}

function openStatusModal(id, currentStatus) {
    currentIncidentIdToUpdate = id;
    document.getElementById('modalIncidentId').textContent = id;
    document.getElementById('newStatus').value = currentStatus;

    const statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
    statusModal.show();
}

async function handleStatusUpdate() {
    if (!currentIncidentIdToUpdate) return;

    const newStatus = document.getElementById('newStatus').value;
    const id = currentIncidentIdToUpdate;

    const url = `${INCIDENTS_URL}/${id}/status/${newStatus}`;

    try {
        const response = await protectedFetch(url, {
            method: 'PUT',
            // No body required, the status is in the URL
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            throw new Error(`Error al actualizar estado: Código ${response.status}`);
        }

        const statusModal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
        statusModal.hide();

        alert(`Estado del incidente ${id} actualizado a ${newStatus}.`);
        loadIncidents();
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        alert(`Error al actualizar estado: ${error.message}`);
    }
}


// ====================================================================
// MAPA (LEAFLET)
// ====================================================================

let mymap = null;

async function loadIncidentsForMap() {
    try {
        const response = await protectedFetch(INCIDENTS_URL);
        if (!response.ok) {
            throw new Error('Error al cargar incidentes para el mapa');
        }
        const incidents = await response.json();
        initializeMap(incidents);
    } catch (error) {
        console.error("Error al cargar datos del mapa:", error);
        // Si no se pudo cargar, el contenedor del mapa queda vacío y se muestra una alerta.
        alert('No se pudieron cargar los datos del mapa. Verifique la consola para detalles.');
    }
}

function initializeMap(incidents) {
    const mapContainer = document.getElementById('mapid');
    if (!mapContainer) return;

    if (mymap) { mymap.remove(); }

    // Inicializar mapa centrado en Cartagena, Colombia
    mymap = L.map('mapid').setView([10.4000, -75.5000], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);

    incidents.forEach(incident => {
        // Asumimos que la ubicación viene como "lat,lon"
        const coords = incident.location?.split(',');
        if (coords && coords.length === 2) {
            const lat = parseFloat(coords[0]);
            const lon = parseFloat(coords[1]);

            if (!isNaN(lat) && !isNaN(lon)) {
                L.marker([lat, lon])
                    .addTo(mymap)
                    .bindPopup(`
                        <b>Incidente ID: ${incident.id}</b><br>
                        Tipo: ${incident.type}<br>
                        Estado: <span class="status-${incident.status}">${incident.status}</span>
                    `);
            }
        }
    });
}


// ====================================================================
// MACHINE LEARNING (ML/WEKA) LÓGICA
// ====================================================================

// Helper para mostrar alertas en la interfaz de ML
function showAlert(elementId, message, type = 'info') {
    const alertDiv = document.getElementById(elementId);
    if (!alertDiv) return;
    alertDiv.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

// Inyecta el contenido HTML de ML en las pestañas
function initializeMLContent() {
    // 1. Inyectar HTML en la pestaña de Predicción
    document.getElementById('predict-ml-tab').innerHTML = `
        <h2>Realizar Predicción</h2>
        <div id="predictAlert"></div>
        <div class="card" style="margin-bottom: 20px;">
            <h3>Modelo Activo</h3>
            <div id="activeModelInfo"><p>Cargando información del modelo...</p></div>
        </div>
        <form id="predictionForm" onsubmit="handlePredict(event)">
            <div id="featuresContainer"></div>
            <button type="submit" id="predictBtn">Predecir</button>
        </form>
        <div id="predictionResult"></div>`;

    // 2. Inyectar HTML en la pestaña de Modelos
    document.getElementById('models-ml-tab').innerHTML = `
        <h2>Gestión de Modelos</h2>
        <div id="modelsAlert"></div>
        <div id="modelsList"><p>Cargando modelos...</p></div>`;

    // 3. Inyectar HTML en la pestaña de Entrenamiento
    document.getElementById('train-ml-tab').innerHTML = `
        <h2>Entrenar Nuevo Modelo</h2>
        <div id="trainAlert"></div>
        <form id="trainForm" onsubmit="handleTrain(event)">
            <div class="form-group">
                <label>Nombre del Modelo</label>
                <input type="text" id="modelName" required placeholder="mi_modelo">
            </div>

            <div class="form-group">
                <label>Algoritmo</label>
                <select id="algorithm" required>
                    <option value="J48">J48 (Árbol de decisión)</option>
                    <option value="RandomForest">Random Forest</option>
                    <option value="SMO">SVM (SMO)</option>
                    <option value="NaiveBayes">Naive Bayes</option>
                    <option value="JRip">JRip (Reglas)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Archivo de Datos (ARFF o CSV)</label>
                <input type="file" id="trainFile" accept=".arff,.csv" required>
            </div>

            <button type="submit" id="trainBtn">Entrenar Modelo</button>
        </form>`;

    // Cargar la información inicial
    loadModelInfo();
}


// Lógica para cambiar entre pestañas de ML (llamada desde ml.html)
function switchMLTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`${tabName}-ml-tab`).classList.add('active');

    // Encuentra el botón correcto y actívalo
    const buttons = document.querySelectorAll('.tabs .tab-btn');
    const index = tabName === 'predict' ? 0 : tabName === 'models' ? 1 : 2;
    if (buttons[index]) buttons[index].classList.add('active');

    if (tabName === 'models') loadModels();
    if (tabName === 'predict') loadModelInfo();
}

// ========== PREDICCIÓN ==========
async function loadModelInfo() {
    try {
        const res = await protectedFetch(`${ML_API_BASE}/models`);
        const data = await res.json();

        if (data.models && data.models.length > 0) {
            const activeModel = data.models.find(m => m.active) || data.models[0];
            displayModelInfo(activeModel);
            displayFeatureInputs(activeModel);
        } else {
            showAlert('predictAlert', 'No hay modelos disponibles. Entrene uno primero.', 'error');
        }
    } catch (err) {
        showAlert('predictAlert', 'Error al cargar modelo: ' + err.message, 'error');
    }
}

function displayModelInfo(model) {
    const html = `
        <p><strong>Nombre:</strong> ${model.modelName}</p>
        <p><strong>Algoritmo:</strong> ${model.algorithm}</p>
        <p><strong>Clase:</strong> ${model.classAttribute}</p>
        <p><strong>Atributos:</strong> ${model.attributes.length}</p>
    `;
    document.getElementById('activeModelInfo').innerHTML = html;
}

function displayFeatureInputs(model) {
    const container = document.getElementById('featuresContainer');
    let html = '';

    model.attributes.forEach(attr => {
        if (attr.name === model.classAttribute) return;

        if (attr.type === 'numeric') {
            html += `
                <div class="form-group">
                    <label>${attr.name}</label>
                    <input type="number" step="0.01" name="${attr.name}" required class="form-control">
                </div>
            `;
        } else if (attr.type === 'nominal') {
            html += `
                <div class="form-group">
                    <label>${attr.name}</label>
                    <select name="${attr.name}" required class="form-select">
                        <option value="">Seleccionar...</option>
                        ${attr.possibleValues.map(v => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

async function handlePredict(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const features = {};
    formData.forEach((value, key) => {
        // Intenta parsear a float si es numérico, sino usa el string
        features[key] = isNaN(value) ? value : parseFloat(value);
    });

    document.getElementById('predictBtn').disabled = true;

    try {
        const res = await protectedFetch(`${ML_API_BASE}/predict`, {
            method: 'POST',
            body: JSON.stringify({ features })
        });

        const data = await res.json();

        if (res.ok) {
            displayPredictionResult(data);
        } else {
            showAlert('predictAlert', data.message || 'Error en predicción', 'error');
        }
    } catch (err) {
        showAlert('predictAlert', 'Error: ' + err.message, 'error');
    } finally {
        document.getElementById('predictBtn').disabled = false;
    }
}

function displayPredictionResult(prediction) {
    const resultDiv = document.getElementById('predictionResult');
    const html = `
        <div class="prediction-result">
            <h3>✅ Resultado de Predicción</h3>
            <div class="result-item">
                <strong>Predicción:</strong>
                <span style="font-size: 18px; font-weight: bold; color: #667eea;">${prediction.prediction}</span>
            </div>
            <div class="result-item">
                <strong>Confianza:</strong>
                <span>${(prediction.confidence * 100).toFixed(2)}%</span>
            </div>
            <h4 style="margin-top: 15px; margin-bottom: 10px;">Probabilidades:</h4>
            ${Object.entries(prediction.distribution).map(([key, value]) => `
                <div style="margin-bottom: 10px;">
                    <div class="result-item">
                        <span>${key}</span>
                        <span>${(value * 100).toFixed(2)}%</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar" style="width: ${value * 100}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    resultDiv.innerHTML = html;
}

// ========== MODELOS ==========
async function loadModels() {
    try {
        const res = await protectedFetch(`${ML_API_BASE}/models`);
        const data = await res.json();
        displayModels(data.models);
    } catch (err) {
        showAlert('modelsAlert', 'Error al cargar modelos: ' + err.message, 'error');
    }
}

function displayModels(models) {
    const modelsList = document.getElementById('modelsList');
    if (models.length === 0) {
        modelsList.innerHTML = '<p>No hay modelos disponibles</p>';
        return;
    }

    const html = models.map(model => `
        <div class="model-item">
            <div class="model-info">
                <h4>${model.modelName}</h4>
                <p>Algoritmo: ${model.algorithm}</p>
                <p>Clase: ${model.classAttribute}</p>
                <p>Atributos: ${model.attributes.length}</p>
                ${model.active ? '<span class="model-badge">ACTIVO</span>' : ''}
            </div>
            <div class="model-actions">
                ${!model.active ? `<button class="btn-sm btn-success" onclick="activateModel('${model.modelName}')">Activar</button>` : ''}
                <button class="btn-sm btn-danger" onclick="deleteModel('${model.modelName}')">Eliminar</button>
            </div>
        </div>
    `).join('');

    modelsList.innerHTML = html;
}

async function activateModel(modelName) {
    try {
        const res = await protectedFetch(`${ML_API_BASE}/models/${modelName}/activate`, {
            method: 'PUT'
        });

        if (res.ok) {
            showAlert('modelsAlert', 'Modelo activado', 'success');
            loadModels();
            loadModelInfo();
        } else {
            const errorData = await res.json();
            showAlert('modelsAlert', errorData.message || 'Error al activar', 'error');
        }
    } catch (err) {
        showAlert('modelsAlert', 'Error: ' + err.message, 'error');
    }
}

async function deleteModel(modelName) {
    if (!confirm(`¿Eliminar modelo "${modelName}"? Esta acción es irreversible.`)) return;

    try {
        const res = await protectedFetch(`${ML_API_BASE}/models/${modelName}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showAlert('modelsAlert', 'Modelo eliminado', 'success');
            loadModels();
        } else {
            const errorData = await res.json();
            showAlert('modelsAlert', errorData.message || 'Error al eliminar', 'error');
        }
    } catch (err) {
        showAlert('modelsAlert', 'Error: ' + err.message, 'error');
    }
}

// ========== ENTRENAR ==========
async function handleTrain(e) {
    e.preventDefault();

    const formData = new FormData();
    const fileInput = document.getElementById('trainFile');

    formData.append('file', fileInput.files[0]);
    formData.append('algorithm', document.getElementById('algorithm').value);
    formData.append('modelName', document.getElementById('modelName').value);

    document.getElementById('trainBtn').disabled = true;

    try {
        const fileName = fileInput.files[0].name;
        const endpoint = fileName.endsWith('.csv')
            ? `${ML_API_BASE}/train/csv`
            : `${ML_API_BASE}/train/arff`;

        // Usamos fetch normal, inyectando solo el token en el header (para manejar FormData)
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('trainAlert', `✅ Modelo entrenado! Precisión: ${data.accuracy.toFixed(2)}%`, 'success');
            e.target.reset();
        } else {
            showAlert('trainAlert', data.message || 'Error al entrenar', 'error');
        }
    } catch (err) {
        showAlert('trainAlert', 'Error: ' + err.message, 'error');
    } finally {
        document.getElementById('trainBtn').disabled = false;
    }
}


// ====================================================================
// INICIALIZACIÓN
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa la lógica de seguridad y carga de página
    checkAuthAndLoad();

    // Asigna listeners a los formularios de autenticación si existen (en auth.html)
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

    // Asigna listener al formulario de creación de incidentes si existe (en incidents.html)
    document.getElementById('createIncidentForm')?.addEventListener('submit', handleCreateIncident);
});