// js/app.js - Versión 4.0 - Con soporte para Home Público

// ====================================================================
// CONFIGURACIÓN
// ====================================================================

const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',
    TOAST_DURATION: 3000,
    REQUEST_TIMEOUT: 10000,
    AUTO_DISMISS_ALERT: 5000
};

CONFIG.ENDPOINTS = {
    INCIDENTS: `${CONFIG.API_BASE_URL}/incidents`,
    ML: `${CONFIG.API_BASE_URL}/ml`,
    AUTH: `${CONFIG.API_BASE_URL}/auth`
};

// ====================================================================
// LOGGING SYSTEM
// ====================================================================

class Logger {
    static error(message, error) {
        console.error(`❌ ${message}:`, error);
    }

    static success(message) {
        console.log(`✅ ${message}`);
    }

    static info(message) {
        console.log(`ℹ️ ${message}`);
    }

    static warn(message) {
        console.warn(`⚠️ ${message}`);
    }
}

// ====================================================================
// AUTENTICACIÓN SERVICE
// ====================================================================

class AuthService {
    static getToken() {
        return localStorage.getItem('jwtToken');
    }

    static getUsername() {
        return localStorage.getItem('username') || 'Usuario';
    }

    static setToken(token, username) {
        localStorage.setItem('jwtToken', token);
        localStorage.setItem('username', username);
        Logger.success(`Token guardado para ${username}`);
    }

    static clear() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        Logger.success('Token y usuario eliminados');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static logout() {
        this.clear();
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 300);
    }
}

// ====================================================================
// API CLIENT - CENTRALIZADO
// ====================================================================

class APIClient {
    static async request(url, options = {}) {
        const token = AuthService.getToken();

        if (!token && !url.includes('/auth/') && !url.includes('/api/ml/')) {
            Logger.warn('No hay token, redirigiendo a auth');
            AuthService.logout();
            throw new Error('Sesión expirada. Por favor, inicie sesión.');
        }

        // Headers por defecto
        const defaultHeaders = {
            ...(!(options.body instanceof FormData) && {
                'Content-Type': 'application/json'
            })
        };

        // Agregar token si existe
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Merge headers
        const headers = {
            ...defaultHeaders,
            ...options.headers
        };

        // Controller para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        try {
            Logger.info(`${options.method || 'GET'} ${url}`);

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            // Manejo de errores HTTP
            if (response.status === 401 || response.status === 403) {
                Logger.warn('Token inválido, cerrando sesión');
                AuthService.logout();
                throw new Error('No autorizado. Sesión expirada.');
            }

            if (!response.ok) {
                let errorMessage = `Error HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Si no es JSON, usar mensaje por defecto
                }
                throw new Error(errorMessage);
            }

            return response;

        } catch (error) {
            if (error.name === 'AbortError') {
                Logger.error('Timeout', error);
                throw new Error('Timeout - Tiempo de espera agotado');
            }
            Logger.error('Error en request', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    static async get(url) {
        const response = await this.request(url, { method: 'GET' });
        return response.json();
    }

    static async post(url, data) {
        const response = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    static async put(url, data = null) {
        const response = await this.request(url, {
            method: 'PUT',
            ...(data && { body: JSON.stringify(data) })
        });
        return response.status === 204 ? null : response.json();
    }

    static async delete(url) {
        const response = await this.request(url, { method: 'DELETE' });
        return response.status === 204 ? null : response.json();
    }

    static async postFormData(url, formData) {
        const response = await this.request(url, {
            method: 'POST',
            body: formData,
            headers: {}
        });
        return response.json();
    }
}

// ====================================================================
// UI HELPERS
// ====================================================================

class UIHelper {
    static showAlert(elementId, message, type = 'info') {
        const alertDiv = document.getElementById(elementId);
        if (!alertDiv) {
            Logger.warn(`Elemento #${elementId} no encontrado`);
            return;
        }

        const classMap = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'info': 'alert-info',
            'warning': 'alert-warning'
        };

        const alertClass = classMap[type] || 'alert-info';

        alertDiv.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Auto-dismiss
        setTimeout(() => {
            if (alertDiv.innerHTML) {
                alertDiv.innerHTML = '';
            }
        }, CONFIG.AUTO_DISMISS_ALERT);
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const typeClass = type === 'error' ? 'alert-danger' : `alert-${type}`;

        toast.className = `alert ${typeClass} position-fixed bottom-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} &nbsp;
                ${message}
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, CONFIG.TOAST_DURATION);
    }

    static isPage(pageName) {
        const path = window.location.pathname;
        return path.includes(pageName);
    }

    static redirectTo(page) {
        setTimeout(() => {
            window.location.href = page;
        }, 300);
    }

    static setButtonLoading(buttonId, isLoading) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.disabled = isLoading;

        if (isLoading) {
            btn.classList.add('loading');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Cargando...`;
        } else {
            btn.classList.remove('loading');
            // Restaurar texto original si es posible
            const originalText = btn.getAttribute('data-original-text');
            if (originalText) {
                btn.innerHTML = originalText;
            }
        }
    }
}

// ====================================================================
// NAVEGACIÓN - NAVBAR MANAGER
// ====================================================================

class NavbarManager {
    static inject() {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        const username = AuthService.getUsername();
        const navbarHTML = `
            <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
                <div class="container-fluid px-4">
                    <a class="navbar-brand fw-bold" href="home.html">🛡️ Cartagena Segura</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="home.html">🏠 Inicio</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="incidents.html">📋 Incidentes</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="map.html">🗺️ Mapa</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="ml.html">🤖 ML/WEKA</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="profile.html">👤 Perfil</a>
                            </li>
                        </ul>
                        <span class="navbar-text me-3">
                            👋 Hola, <strong>${username}</strong>
                        </span>
                        <button class="btn btn-outline-danger btn-sm" onclick="AuthService.logout()">
                            🚪 Salir
                        </button>
                    </div>
                </div>
            </nav>
        `;

        container.innerHTML = navbarHTML;
        Logger.success('Navbar inyectado');
    }

    static setupProfile() {
        const usernameEl = document.getElementById('profileUsername');
        const tokenEl = document.getElementById('profileToken');

        if (usernameEl) {
            usernameEl.textContent = AuthService.getUsername();
        }
        if (tokenEl) {
            tokenEl.textContent = AuthService.isAuthenticated() ? '✅ Token Válido' : '❌ No hay token';
            if (AuthService.isAuthenticated()) {
                tokenEl.className = 'status-badge status-valid';
            }
        }
    }
}

// ====================================================================
// NAVBAR PÚBLICO
// ====================================================================

class PublicNavbar {
    static inject() {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        const token = AuthService.getToken();
        const username = AuthService.getUsername();

        if (token) {
            // Navbar para usuarios autenticados
            container.innerHTML = `
                <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
                    <div class="container-fluid px-4">
                        <a class="navbar-brand fw-bold" href="home.html">🛡️ Cartagena Segura</a>
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                        <div class="collapse navbar-collapse" id="navbarNav">
                            <ul class="navbar-nav me-auto">
                                <li class="nav-item">
                                    <a class="nav-link" href="home.html">🏠 Inicio</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="incidents.html">📋 Incidentes</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="map.html">🗺️ Mapa</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="ml.html">🤖 ML/WEKA</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="profile.html">👤 Perfil</a>
                                </li>
                            </ul>
                            <span class="navbar-text me-3">
                                👋 Hola, <strong>${username}</strong>
                            </span>
                            <button class="btn btn-outline-danger btn-sm" onclick="AuthService.logout()">
                                🚪 Salir
                            </button>
                        </div>
                    </div>
                </nav>
            `;
        } else {
            // Navbar para usuarios no autenticados (público)
            container.innerHTML = `
                <nav class="navbar navbar-expand-lg navbar-dark public-navbar">
                    <div class="container">
                        <a class="navbar-brand fw-bold" href="home.html">
                            🛡️ Cartagena Segura
                        </a>
                        <div class="navbar-nav ms-auto">
                            <a class="nav-link" href="auth.html?tab=login">
                                🔐 Iniciar Sesión
                            </a>
                        </div>
                    </div>
                </nav>
            `;
        }

        Logger.success('Navbar público inyectado correctamente');
    }
}

// ====================================================================
// NAVEGACIÓN PÚBLICA/PRIVADA
// ====================================================================

class NavigationManager {
    static redirectBasedOnAuth() {
        const token = AuthService.getToken();
        const currentPage = window.location.pathname.split('/').pop();

        // Páginas públicas (siempre accesibles)
        const publicPages = ['home.html', 'auth.html', 'index.html'];

        // Páginas protegidas (requieren autenticación)
        const protectedPages = ['incidents.html', 'map.html', 'ml.html', 'profile.html'];

        Logger.info(`Navegación - Página: ${currentPage}, Autenticado: ${!!token}`);

        // Si está en página protegida sin autenticación → redirigir a home público
        if (!token && protectedPages.includes(currentPage)) {
            Logger.warn('Acceso no autorizado a página protegida, redirigiendo a home público');
            UIHelper.redirectTo('home.html');
            return;
        }

        // Si está autenticado y en página pública (excepto home) → redirigir a incidents
        if (token && publicPages.includes(currentPage) && currentPage !== 'home.html') {
            Logger.info('Usuario autenticado en página pública, redirigiendo a incidents');
            UIHelper.redirectTo('incidents.html');
            return;
        }

        // Si está en auth.html y ya está autenticado → redirigir a incidents
        if (token && currentPage === 'auth.html') {
            Logger.info('Usuario autenticado en auth, redirigiendo a incidents');
            UIHelper.redirectTo('incidents.html');
            return;
        }
    }

    static setupPublicHome() {
        // Verificar si estamos en el home público
        if (!UIHelper.isPage('home.html')) return;

        const token = AuthService.getToken();
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');

        if (token) {
            // Usuario autenticado - mostrar botón de dashboard
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (dashboardBtn) dashboardBtn.style.display = 'inline-flex';
        } else {
            // Usuario no autenticado - mostrar botones de login/register
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (registerBtn) registerBtn.style.display = 'inline-flex';
            if (dashboardBtn) dashboardBtn.style.display = 'none';
        }
    }
}

// ====================================================================
// GESTIÓN DE INCIDENTES
// ====================================================================

class IncidentManager {
    static currentIncidentId = null;

    static async loadIncidents(status = 'ALL') {
        try {
            const url = status === 'ALL'
                ? CONFIG.ENDPOINTS.INCIDENTS
                : `${CONFIG.ENDPOINTS.INCIDENTS}/status/${status}`;

            Logger.info(`Cargando incidentes - Status: ${status}`);
            const incidents = await APIClient.get(url);

            this.renderIncidents(incidents);
            Logger.success(`${incidents.length} incidentes cargados`);
        } catch (error) {
            Logger.error('Error al cargar incidentes', error);
            UIHelper.showAlert('alertContainer', `❌ Error: ${error.message}`, 'error');

            const tableBody = document.getElementById('incidentTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            Error al cargar incidentes
                        </td>
                    </tr>
                `;
            }
        }
    }

    static renderIncidents(incidents) {
        const tableBody = document.getElementById('incidentTableBody');
        if (!tableBody) return;

        if (!incidents || incidents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        📭 No hay incidentes para mostrar
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = incidents.map(incident => `
            <tr class="status-${incident.status}">
                <td>${incident.id}</td>
                <td>${incident.type}</td>
                <td>${incident.description}</td>
                <td>${incident.location || '—'}</td>
                <td>
                    <span class="status-badge status-${incident.status}">
                        ${incident.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-action btn-sm btn-info" onclick="IncidentManager.openStatusModal('${incident.id}', '${incident.status}')">
                            ✏️ Estado
                        </button>
                        <button class="btn btn-action btn-sm btn-danger" onclick="IncidentManager.deleteIncident('${incident.id}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    static async createIncident(event) {
        event.preventDefault();

        const type = document.getElementById('type')?.value?.trim();
        const description = document.getElementById('description')?.value?.trim();
        const location = document.getElementById('location')?.value?.trim();

        // Validación
        if (!type || !description || !location) {
            UIHelper.showAlert('alertContainer', '⚠️ Por favor completa todos los campos', 'warning');
            return;
        }

        const newIncident = { type, description, location };

        try {
            UIHelper.setButtonLoading('submitBtn', true);

            const result = await APIClient.post(CONFIG.ENDPOINTS.INCIDENTS, newIncident);

            Logger.success('Incidente creado');
            UIHelper.showToast('✅ Incidente creado exitosamente', 'success');

            document.getElementById('createIncidentForm')?.reset();

            // Cambiar a tab de listado
            document.querySelector('[data-bs-target="#list-pane"]')?.click();

            // Recargar tabla
            this.loadIncidents();
        } catch (error) {
            Logger.error('Error al crear incidente', error);
            UIHelper.showToast(`❌ ${error.message}`, 'error');
        } finally {
            UIHelper.setButtonLoading('submitBtn', false);
        }
    }

    static async deleteIncident(id) {
        if (!confirm(`¿Estás seguro de eliminar el incidente ${id}?`)) {
            return;
        }

        try {
            await APIClient.delete(`${CONFIG.ENDPOINTS.INCIDENTS}/${id}`);
            Logger.success(`Incidente ${id} eliminado`);
            UIHelper.showToast('✅ Incidente eliminado', 'success');
            this.loadIncidents();
        } catch (error) {
            Logger.error('Error al eliminar incidente', error);
            UIHelper.showToast(`❌ ${error.message}`, 'error');
        }
    }

    static openStatusModal(id, currentStatus) {
        this.currentIncidentId = id;

        const modalId = document.getElementById('modalIncidentId');
        const newStatus = document.getElementById('newStatus');

        if (modalId) modalId.textContent = id;
        if (newStatus) newStatus.value = currentStatus;

        const modal = new bootstrap.Modal(document.getElementById('statusModal'));
        modal.show();

        Logger.info(`Modal de estado abierto para incidente ${id}`);
    }

    static async updateStatus() {
        const newStatus = document.getElementById('newStatus')?.value;

        if (!this.currentIncidentId || !newStatus) {
            UIHelper.showToast('❌ Datos incompletos', 'error');
            return;
        }

        try {
            const url = `${CONFIG.ENDPOINTS.INCIDENTS}/${this.currentIncidentId}/status/${newStatus}`;
            await APIClient.put(url);

            Logger.success(`Estado actualizado a ${newStatus}`);
            UIHelper.showToast(`✅ Estado actualizado a ${newStatus}`, 'success');

            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('statusModal'))?.hide();

            // Recargar
            this.loadIncidents();
        } catch (error) {
            Logger.error('Error al actualizar estado', error);
            UIHelper.showToast(`❌ ${error.message}`, 'error');
        }
    }
}

// ====================================================================
// MAPA - LEAFLET
// ====================================================================

class MapManager {
    static map = null;

    static async loadIncidentsForMap() {
        try {
            Logger.info('Cargando incidentes para mapa');
            const incidents = await APIClient.get(CONFIG.ENDPOINTS.INCIDENTS);
            this.initializeMap(incidents);
        } catch (error) {
            Logger.error('Error al cargar mapa', error);
            UIHelper.showAlert('mapAlert', `❌ ${error.message}`, 'error');
        }
    }

    static initializeMap(incidents) {
        const mapContainer = document.getElementById('mapid');
        if (!mapContainer) {
            Logger.warn('Contenedor del mapa no encontrado');
            return;
        }

        // Limpiar mapa anterior
        if (this.map) {
            this.map.remove();
        }

        // Crear mapa centrado en Cartagena
        this.map = L.map('mapid').setView([10.4000, -75.5000], 13);

        // Agregar tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Agregar marcadores
        let markersAdded = 0;
        incidents.forEach(incident => {
            if (!incident.location) return;

            const coords = incident.location.split(',');
            if (coords.length !== 2) return;

            const lat = parseFloat(coords[0]);
            const lon = parseFloat(coords[1]);

            if (isNaN(lat) || isNaN(lon)) return;

            L.marker([lat, lon])
                .addTo(this.map)
                .bindPopup(`
                    <strong>Incidente #${incident.id}</strong><br>
                    <small>Tipo: ${incident.type}</small><br>
                    <small>Estado: ${incident.status}</small>
                `);

            markersAdded++;
        });

        Logger.success(`${markersAdded} marcadores añadidos al mapa`);
    }
}

// ====================================================================
// MACHINE LEARNING MANAGER
// ====================================================================

class MLManager {
    static currentIncidentId = null;

    static initialize() {
        Logger.info('Inicializando ML Manager');

        // Tab de Predicción
        const predictTab = document.getElementById('predict-ml-tab');
        if (predictTab) {
            predictTab.innerHTML = `
                <h2>🔮 Realizar Predicción</h2>
                <div id="predictAlert"></div>
                <div class="card-custom mb-3">
                    <h4>Modelo Activo</h4>
                    <div id="activeModelInfo"><p>Cargando información del modelo...</p></div>
                </div>
                <form id="predictionForm" onsubmit="MLManager.predict(event)">
                    <div id="featuresContainer"></div>
                    <button type="submit" class="btn btn-primary-custom" id="predictBtn">
                        🔮 Predecir
                    </button>
                </form>
                <div id="predictionResult"></div>
            `;
        }

        // Tab de Modelos
        const modelsTab = document.getElementById('models-ml-tab');
        if (modelsTab) {
            modelsTab.innerHTML = `
                <h2>📦 Gestión de Modelos</h2>
                <div id="modelsAlert"></div>
                <div id="modelsList"><p>Cargando modelos...</p></div>
            `;
        }

        // Tab de Entrenar
        const trainTab = document.getElementById('train-ml-tab');
        if (trainTab) {
            trainTab.innerHTML = `
                <h2>🎓 Entrenar Nuevo Modelo</h2>
                <div id="trainAlert"></div>
                <form id="trainForm" onsubmit="MLManager.train(event)">
                    <div class="form-group mb-3">
                        <label for="modelName" class="form-label">Nombre del Modelo</label>
                        <input type="text" class="form-control" id="modelName" required placeholder="mi_modelo_nuevo" minlength="3">
                    </div>
                    <div class="form-group mb-3">
                        <label for="algorithm" class="form-label">Algoritmo</label>
                        <select class="form-select" id="algorithm" required>
                            <option value="">Seleccionar algoritmo...</option>
                            <option value="J48">J48 (Árbol de decisión)</option>
                            <option value="RandomForest">Random Forest</option>
                            <option value="SMO">SVM (SMO)</option>
                            <option value="NaiveBayes">Naive Bayes</option>
                            <option value="JRip">JRip (Reglas)</option>
                        </select>
                    </div>
                    <div class="form-group mb-3">
                        <label for="trainFile" class="form-label">Archivo de Datos (ARFF o CSV)</label>
                        <input type="file" class="form-control" id="trainFile" accept=".arff,.csv" required>
                    </div>
                    <button type="submit" class="btn btn-primary-custom" id="trainBtn">
                        🎓 Entrenar Modelo
                    </button>
                </form>
            `;
        }

        this.loadModelInfo();
    }

    static switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

        const contentEl = document.getElementById(`${tabName}-ml-tab`);
        if (contentEl) {
            contentEl.classList.add('active');
        }

        const buttons = document.querySelectorAll('.tab-btn');
        const tabIndex = { predict: 0, models: 1, train: 2 }[tabName];
        if (buttons[tabIndex]) {
            buttons[tabIndex].classList.add('active');
        }

        Logger.info(`Cambiando a tab: ${tabName}`);

        if (tabName === 'models') this.loadModels();
        if (tabName === 'predict') this.loadModelInfo();
    }

    static async loadModelInfo() {
        try {
            const data = await APIClient.get(`${CONFIG.ENDPOINTS.ML}/models`);

            if (data.models && data.models.length > 0) {
                const model = data.models.find(m => m.active) || data.models[0];
                this.displayModelInfo(model);
                this.displayFeatureInputs(model);
            } else {
                UIHelper.showAlert('predictAlert', '⚠️ No hay modelos disponibles. Entrena uno primero.', 'warning');
            }
        } catch (error) {
            Logger.error('Error cargando modelos', error);
            UIHelper.showAlert('predictAlert', `❌ ${error.message}`, 'error');
        }
    }

    static displayModelInfo(model) {
        const modelInfo = document.getElementById('activeModelInfo');
        if (!modelInfo) return;

        modelInfo.innerHTML = `
            <p><strong>Nombre:</strong> ${model.modelName}</p>
            <p><strong>Algoritmo:</strong> ${model.algorithm}</p>
            <p><strong>Clase:</strong> ${model.classAttribute}</p>
            <p><strong>Atributos:</strong> ${model.attributes?.length || 0}</p>
        `;
    }

    static displayFeatureInputs(model) {
        const container = document.getElementById('featuresContainer');
        if (!container || !model.attributes) return;

        const html = model.attributes
            .filter(attr => attr.name !== model.classAttribute)
            .map(attr => {
                if (attr.type === 'numeric') {
                    return `
                        <div class="form-group mb-3">
                            <label for="feat_${attr.name}" class="form-label">${attr.name}</label>
                            <input type="number" step="0.01" class="form-control" id="feat_${attr.name}" name="${attr.name}" required>
                        </div>
                    `;
                } else if (attr.type === 'nominal') {
                    return `
                        <div class="form-group mb-3">
                            <label for="feat_${attr.name}" class="form-label">${attr.name}</label>
                            <select class="form-select" id="feat_${attr.name}" name="${attr.name}" required>
                                <option value="">Seleccionar...</option>
                                ${attr.possibleValues?.map(v => `<option value="${v}">${v}</option>`).join('') || ''}
                            </select>
                        </div>
                    `;
                }
                return '';
            })
            .join('');

        container.innerHTML = html;
    }

    static async predict(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const features = {};

        for (let [key, value] of formData.entries()) {
            features[key] = isNaN(value) ? value : parseFloat(value);
        }

        try {
            UIHelper.setButtonLoading('predictBtn', true);

            const result = await APIClient.post(`${CONFIG.ENDPOINTS.ML}/predict`, { features });
            this.displayPredictionResult(result);

            Logger.success('Predicción completada');
        } catch (error) {
            Logger.error('Error en predicción', error);
            UIHelper.showAlert('predictAlert', `❌ ${error.message}`, 'error');
        } finally {
            UIHelper.setButtonLoading('predictBtn', false);
        }
    }

    static displayPredictionResult(prediction) {
        const resultDiv = document.getElementById('predictionResult');
        if (!resultDiv) return;

        const html = `
            <div class="prediction-result">
                <h3>✅ Resultado de Predicción</h3>
                <div class="result-item">
                    <span class="result-label">Predicción:</span>
                    <span class="result-value">${prediction.prediction}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Confianza:</span>
                    <span class="result-value">${(prediction.confidence * 100).toFixed(2)}%</span>
                </div>

                <h5 class="mt-4 mb-3">📊 Probabilidades por Clase:</h5>
                ${Object.entries(prediction.distribution || {})
                    .map(([key, value]) => `
                        <div class="progress-item">
                            <div class="progress-label">
                                <span>${key}</span>
                                <span>${(value * 100).toFixed(2)}%</span>
                            </div>
                            <div class="progress-bar-custom">
                                <div class="progress-fill" style="width: ${value * 100}%"></div>
                            </div>
                        </div>
                    `)
                    .join('')}
            </div>
        `;

        resultDiv.innerHTML = html;
    }

    static async loadModels() {
        try {
            const data = await APIClient.get(`${CONFIG.ENDPOINTS.ML}/models`);
            this.displayModels(data.models || []);
        } catch (error) {
            Logger.error('Error cargando modelos', error);
            UIHelper.showAlert('modelsAlert', `❌ ${error.message}`, 'error');
        }
    }

    static displayModels(models) {
        const modelsList = document.getElementById('modelsList');
        if (!modelsList) return;

        if (!models || models.length === 0) {
            modelsList.innerHTML = '<p class="text-muted text-center py-4">📭 No hay modelos disponibles</p>';
            return;
        }

        modelsList.innerHTML = models.map(model => `
            <div class="model-item">
                <div class="model-info">
                    <h5>${model.modelName}</h5>
                    <p>Algoritmo: ${model.algorithm}</p>
                    <p>Atributos: ${model.attributes?.length || 0}</p>
                    ${model.active ? '<span class="model-badge">✅ ACTIVO</span>' : ''}
                </div>
                <div class="model-actions">
                    ${!model.active ? `<button class="btn btn-success-custom btn-sm" onclick="MLManager.activateModel('${model.modelName}')">Activar</button>` : ''}
                    <button class="btn btn-danger-custom btn-sm" onclick="MLManager.deleteModel('${model.modelName}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    static async activateModel(modelName) {
        try {
            await APIClient.put(`${CONFIG.ENDPOINTS.ML}/models/${modelName}/activate`);
            Logger.success(`Modelo ${modelName} activado`);
            UIHelper.showToast('✅ Modelo activado', 'success');
            this.loadModels();
            this.loadModelInfo();
        } catch (error) {
            Logger.error('Error activando modelo', error);
            UIHelper.showToast(`❌ ${error.message}`, 'error');
        }
    }

    static async deleteModel(modelName) {
        if (!confirm(`¿Eliminar el modelo "${modelName}"? Esta acción es irreversible.`)) {
            return;
        }

        try {
            await APIClient.delete(`${CONFIG.ENDPOINTS.ML}/models/${modelName}`);
            Logger.success(`Modelo ${modelName} eliminado`);
            UIHelper.showToast('✅ Modelo eliminado', 'success');
            this.loadModels();
        } catch (error) {
            Logger.error('Error eliminando modelo', error);
            UIHelper.showToast(`❌ ${error.message}`, 'error');
        }
    }

    static async train(e) {
        e.preventDefault();

        const formData = new FormData();
        const fileInput = document.getElementById('trainFile');
        const modelName = document.getElementById('modelName')?.value;
        const algorithm = document.getElementById('algorithm')?.value;

        if (!fileInput.files[0] || !modelName || !algorithm) {
            UIHelper.showToast('❌ Por favor completa todos los campos', 'error');
            return;
        }

        formData.append('file', fileInput.files[0]);
        formData.append('modelName', modelName);
        formData.append('algorithm', algorithm);

        try {
            UIHelper.setButtonLoading('trainBtn', true);

            const fileName = fileInput.files[0].name;
            const endpoint = fileName.endsWith('.csv')
                ? `${CONFIG.ENDPOINTS.ML}/train/csv`
                : `${CONFIG.ENDPOINTS.ML}/train/arff`;

            Logger.info(`Entrenando modelo: ${modelName} con ${algorithm}`);

            const result = await APIClient.postFormData(endpoint, formData);

            Logger.success(`Modelo entrenado con precisión: ${result.accuracy}`);
            UIHelper.showToast(`✅ Modelo entrenado! Precisión: ${(result.accuracy * 100).toFixed(2)}%`, 'success');

            e.target.reset();
            this.loadModels();
            this.switchTab('models');
        } catch (error) {
            Logger.error('Error entrenando modelo', error);
            UIHelper.showAlert('trainAlert', `❌ ${error.message}`, 'error');
        } finally {
            UIHelper.setButtonLoading('trainBtn', false);
        }
    }
}

// ====================================================================
// PAGE INITIALIZER - ACTUALIZADO
// ====================================================================

class PageInitializer {
    static checkAuthAndLoad() {
        Logger.info(`Inicializando página: ${window.location.pathname}`);

        // Primero verificar navegación basada en autenticación
        NavigationManager.redirectBasedOnAuth();

        const isAuth = AuthService.isAuthenticated();
        const currentPage = window.location.pathname.split('/').pop();

        // Configurar navbar según tipo de página
        if (currentPage === 'home.html') {
            // Home público - usar navbar público
            PublicNavbar.inject();
            NavigationManager.setupPublicHome();
        } else if (isAuth && currentPage !== 'auth.html') {
            // Páginas protegidas - usar navbar completo
            NavbarManager.inject();
        }

        // Lógica de inicialización por página
        this.initializePageLogic();
    }

    static initializePageLogic() {
        const currentPage = window.location.pathname.split('/').pop();

        switch (currentPage) {
            case 'incidents.html':
                IncidentManager.loadIncidents();
                break;
            case 'map.html':
                MapManager.loadIncidentsForMap();
                break;
            case 'ml.html':
                MLManager.initialize();
                break;
            case 'profile.html':
                NavbarManager.setupProfile();
                break;
            case 'auth.html':
                this.setupAuthPage();
                break;
            case 'home.html':
                this.setupHomePage();
                break;
            default:
                Logger.info(`Página ${currentPage} - Sin inicialización específica`);
        }
    }

    static setupAuthPage() {
        // Si ya está autenticado, redirigir
        if (AuthService.isAuthenticated()) {
            UIHelper.redirectTo('incidents.html');
            return;
        }

        // Manejar parámetros de URL para tabs
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'register') {
            switchAuthTab('register');
        }
    }

    static setupHomePage() {
        // Lógica específica del home público
        Logger.info('Home público inicializado');
    }
}

// ====================================================================
// EVENT LISTENERS - INICIALIZACIÓN
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('📄 DOM cargado');

    // Inicializar según página
    PageInitializer.checkAuthAndLoad();

    // ===== EVENTOS DE AUTH (auth.html) =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername')?.value;
            const password = document.getElementById('loginPassword')?.value;

            if (!username || !password) {
                UIHelper.showAlert('loginMessage', '⚠️ Por favor completa todos los campos', 'warning');
                return;
            }

            UIHelper.setButtonLoading('loginBtn', true);

            fetch(`${CONFIG.ENDPOINTS.AUTH}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.token) {
                        AuthService.setToken(data.token, username);
                        Logger.success('Login exitoso');
                        UIHelper.showToast('✅ ¡Bienvenido!', 'success');
                        setTimeout(() => {
                            UIHelper.redirectTo('incidents.html');
                        }, 500);
                    } else {
                        UIHelper.showAlert('loginMessage', `❌ ${data.error || 'Credenciales inválidas'}`, 'error');
                    }
                })
                .catch(error => {
                    Logger.error('Error login', error);
                    UIHelper.showAlert('loginMessage', '❌ Error de conexión', 'error');
                })
                .finally(() => {
                    UIHelper.setButtonLoading('loginBtn', false);
                });
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername')?.value;
            const password = document.getElementById('registerPassword')?.value;

            if (!username || !password) {
                UIHelper.showAlert('registerMessage', '⚠️ Por favor completa todos los campos', 'warning');
                return;
            }

            UIHelper.setButtonLoading('registerBtn', true);

            fetch(`${CONFIG.ENDPOINTS.AUTH}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message && data.message.includes('success')) {
                        UIHelper.showAlert('registerMessage', '✅ Registro exitoso. Por favor, inicia sesión.', 'success');
                        registerForm.reset();
                        setTimeout(() => {
                            switchAuthTab('login');
                        }, 1000);
                    } else {
                        UIHelper.showAlert('registerMessage', `❌ ${data.error || 'Error al registrar'}`, 'error');
                    }
                })
                .catch(error => {
                    Logger.error('Error registro', error);
                    UIHelper.showAlert('registerMessage', '❌ Error de conexión', 'error');
                })
                .finally(() => {
                    UIHelper.setButtonLoading('registerBtn', false);
                });
        });
    }

    // ===== EVENTOS DE INCIDENTES (incidents.html) =====
    const createForm = document.getElementById('createIncidentForm');
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            IncidentManager.createIncident(e);
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            IncidentManager.loadIncidents(e.target.value);
        });
    }

    const updateStatusBtn = document.getElementById('updateStatusBtn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', () => {
            IncidentManager.updateStatus();
        });
    }

    // ===== EVENTOS DE ML (ml.html) =====
    const predictionForm = document.getElementById('predictionForm');
    if (predictionForm) {
        predictionForm.addEventListener('submit', (e) => {
            MLManager.predict(e);
        });
    }

    const trainForm = document.getElementById('trainForm');
    if (trainForm) {
        trainForm.addEventListener('submit', (e) => {
            MLManager.train(e);
        });
    }

    Logger.success('✅ App inicializada correctamente');
});

// ====================================================================
// FUNCIONES GLOBALES (para compatibilidad con onclick)
// ====================================================================

// Para auth.html
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('login-tab-btn');
    const registerTab = document.getElementById('register-tab-btn');

    const isLogin = tab === 'login';

    // Mostrar/ocultar formularios
    if (isLogin) {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }

    // Actualizar tabs
    if (isLogin) {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginTab.setAttribute('aria-selected', 'true');
        registerTab.setAttribute('aria-selected', 'false');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'false');
        registerTab.setAttribute('aria-selected', 'true');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Para ML
function switchMLTab(tabName) {
    MLManager.switchTab(tabName);
}

// Para incidentes
function openStatusModal(id, status) {
    IncidentManager.openStatusModal(id, status);
}