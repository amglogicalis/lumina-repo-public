// Lumina Studio Client Application

class LuminaStudio {
  constructor() {
    this.token = localStorage.getItem('lumina_pat') || '';
    this.storageRepo = '.lumina-storage';
    this.currentUser = null;
    this.state = {
      users: {},
      policies: {},
      groupMappings: {},
      activeSessions: {}
    };

    this.initDOM();
    this.bindEvents();
    if (this.token) {
      this.connect();
    }
  }

  initDOM() {
    this.authOverlay = document.getElementById('authOverlay');
    this.patInput = document.getElementById('patInput');
    this.btnConnect = document.getElementById('btnConnect');
    this.btnDisconnect = document.getElementById('btnDisconnect');
    this.connStatus = document.getElementById('connStatus');
    this.userTableBody = document.getElementById('userTableBody');
    this.userCount = document.getElementById('userCount');

    // Modals
    this.modalUser = document.getElementById('modalUser');
    this.btnCreateUser = document.getElementById('btnCreateUser');
    this.btnCancelUser = document.getElementById('btnCancelUser');
    this.btnSaveUser = document.getElementById('btnSaveUser');

    // Tab Navigation
    this.navItems = document.querySelectorAll('.nav-item');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.tabTitle = document.getElementById('tabTitle');
    this.tabDesc = document.getElementById('tabDesc');
  }

  bindEvents() {
    this.btnConnect.addEventListener('click', () => {
      const val = this.patInput.value.trim();
      if (!val) return alert('Por favor ingresa un GitHub Token válido.');
      this.token = val;
      localStorage.setItem('lumina_pat', val);
      this.connect();
    });

    this.btnDisconnect.addEventListener('click', () => {
      localStorage.removeItem('lumina_pat');
      this.token = '';
      this.authOverlay.classList.remove('hidden');
    });

    // Nav Item Tabs
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Create User Modal
    this.btnCreateUser.addEventListener('click', () => this.modalUser.classList.add('active'));
    this.btnCancelUser.addEventListener('click', () => this.modalUser.classList.remove('active'));
    this.btnSaveUser.addEventListener('click', () => this.handleSaveUser());

    // Luciole JWT
    document.getElementById('btnGenerateJwt').addEventListener('click', () => this.handleGenerateJwt());
    document.getElementById('btnFetchJwks').addEventListener('click', () => this.handleFetchJwks());

    // Pyralis IAM
    document.getElementById('btnEvalIam').addEventListener('click', () => this.handleEvalIam());

    // LanternLinks Magic Links
    document.getElementById('btnCreateMagic').addEventListener('click', () => this.handleCreateMagic());

    // Glowworm Break-Glass
    document.getElementById('btnIssueGw').addEventListener('click', () => this.handleIssueGw());

    // Coleoptera Bridge
    document.getElementById('btnExportBridge').addEventListener('click', () => this.handleExportBridge());
  }

  switchTab(tabId) {
    this.navItems.forEach(i => i.classList.remove('active'));
    this.tabPanels.forEach(p => p.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const activePanel = document.getElementById(`tab-${tabId}`);

    if (activeNav) activeNav.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    const meta = {
      photuris: { title: 'Photuris Directory & Vault', desc: 'Gestión inmutable de usuarios e identidades guardadas en .lumina-storage' },
      luciole: { title: '💡 Luciole JWT & JWKS Engine', desc: 'Firma y verificación de tokens criptográficos a latencia cero' },
      pyralis: { title: '🪲 Pyralis IAM Policy Evaluator', desc: 'Evaluador de políticas granulares estilo AWS IAM para recursos Terra y nubes externas' },
      lantern: { title: '🏮 LanternLinks Serverless Magic Links', desc: 'Generación de enlaces de acceso único y OTPs sin contraseñas' },
      glowworm: { title: '⚡ Glowworm Break-Glass Credentials', desc: 'Tokens efímeros de super-administrador de 15 min para emergencias' },
      coleoptera: { title: '🐝 Coleoptera Enterprise AD & Provider Bridge', desc: 'Broker de Active Directory, SAML y exportador multicloud (Auth0, Supabase, AWS IAM)' }
    };

    if (meta[tabId]) {
      this.tabTitle.textContent = meta[tabId].title;
      this.tabDesc.textContent = meta[tabId].desc;
    }
  }

  async connect() {
    try {
      this.connStatus.textContent = 'Verificando GitHub Token...';
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${this.token}` }
      });
      if (!userRes.ok) throw new Error('Token inválido');
      this.currentUser = await userRes.json();

      this.connStatus.textContent = `Conectado como @${this.currentUser.login}`;
      this.authOverlay.classList.add('hidden');
      await this.loadVaultData();
    } catch (err) {
      alert('Error de conexión a GitHub: ' + err.message);
      this.authOverlay.classList.remove('hidden');
    }
  }

  async loadVaultData() {
    try {
      const owner = this.currentUser.login;
      const res = await fetch(`https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`, {
        headers: { 'Authorization': `token ${this.token}` }
      });

      if (res.ok) {
        const fileData = await res.json();
        const content = atob(fileData.content.replace(/\s/g, ''));
        this.state = JSON.parse(content);
      } else {
        // Vault file doesn't exist yet, initialize default
        this.state = { version: '1.0.0', users: {}, policies: {}, groupMappings: {}, activeSessions: {} };
      }

      this.renderUsers();
    } catch (err) {
      console.warn('Vault state read notice:', err.message);
      this.renderUsers();
    }
  }

  renderUsers() {
    const users = Object.values(this.state.users || {});
    this.userCount.textContent = `${users.length} Usuarios`;

    if (users.length === 0) {
      this.userTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No se encontraron usuarios. Haz clic en "➕ Nuevo Usuario" para añadir uno.</td></tr>`;
      return;
    }

    this.userTableBody.innerHTML = users.map(u => `
      <tr>
        <td><code>${u.id}</code></td>
        <td><strong>${u.email}</strong></td>
        <td>${u.name}</td>
        <td><span class="badge">${u.role}</span></td>
        <td><span class="badge" style="color:#10b981;">🟢 Activo</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn-secondary btn-sm" onclick="window.app.deleteUser('${u.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `).join('');
  }

  async handleSaveUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!email || !name) return alert('Por favor ingresa email y nombre.');

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const user = {
      id: userId,
      email,
      name,
      role,
      createdAt: now,
      updatedAt: now,
      active: true
    };

    if (!this.state.users) this.state.users = {};
    this.state.users[userId] = user;

    this.modalUser.classList.remove('active');
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserName').value = '';

    this.renderUsers();
    await this.persistVaultState(`Lumina Photuris: Created user ${email}`);
  }

  async deleteUser(userId) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    delete this.state.users[userId];
    this.renderUsers();
    await this.persistVaultState(`Lumina Photuris: Deleted user ${userId}`);
  }

  async persistVaultState(message) {
    try {
      const owner = this.currentUser.login;
      let sha = undefined;

      try {
        const getFile = await fetch(`https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`, {
          headers: { 'Authorization': `token ${this.token}` }
        });
        if (getFile.ok) {
          const fileInfo = await getFile.json();
          sha = fileInfo.sha;
        }
      } catch {}

      const contentBase64 = btoa(JSON.stringify(this.state, null, 2));
      await fetch(`https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          content: contentBase64,
          sha
        })
      });
    } catch (e) {
      console.warn('Vault persist error:', e.message);
    }
  }

  handleGenerateJwt() {
    const sub = document.getElementById('jwtSub').value.trim() || 'usr_demo_123';
    const role = document.getElementById('jwtRole').value.trim() || 'admin';
    const exp = parseInt(document.getElementById('jwtExp').value, 10) || 3600;

    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub, role, iat: now, exp: now + exp, iss: 'lumina-luciole' };

    const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${b64(header)}.${b64(payload)}.LUCIOLE_DEMO_SIG_${Date.now()}`;

    document.getElementById('jwtOutput').textContent = token;
  }

  handleFetchJwks() {
    const jwks = {
      keys: [
        { kty: 'oct', use: 'sig', alg: 'HS256', kid: 'luciole-key-live-01' }
      ]
    };
    document.getElementById('jwksOutput').textContent = JSON.stringify(jwks, null, 2);
  }

  handleEvalIam() {
    const action = document.getElementById('iamAction').value.trim();
    const resource = document.getElementById('iamResource').value.trim();
    const role = document.getElementById('iamRole').value.trim();

    const box = document.getElementById('iamResult');
    const badge = document.getElementById('iamResultBadge');
    const reason = document.getElementById('iamResultReason');

    box.classList.remove('hidden');
    if (role === 'admin' || action.includes('query')) {
      badge.textContent = 'ALLOW';
      badge.style.background = '#10b981';
      reason.textContent = `Acceso permitido para '${role}' sobre ${action} en '${resource}'`;
    } else {
      badge.textContent = 'DENY';
      badge.style.background = '#ef4444';
      reason.textContent = `Acceso denegado por política por defecto Pyralis IAM`;
    }
  }

  handleCreateMagic() {
    const email = document.getElementById('magicEmail').value.trim();
    const token = 'mgt_' + Math.random().toString(36).substring(2, 12);
    const url = `https://app.lumina.terra?magic_token=${token}&email=${encodeURIComponent(email)}`;
    document.getElementById('magicOutput').textContent = `Magic URL: ${url}\nToken OTP: ${token}\nCaducidad: 5 minutos`;
  }

  handleIssueGw() {
    const user = document.getElementById('gwUser').value.trim();
    const reason = document.getElementById('gwReason').value.trim();
    const tokenId = 'gw_' + Math.random().toString(36).substring(2, 8);
    const exp = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString();

    document.getElementById('gwOutput').textContent = `⚡ GLOWWORM BREAK-GLASS ISSUED:\nToken ID: ${tokenId}\nBeneficiario: ${user}\nMotivo: ${reason}\nExpiración: ${exp} (15 minutos)\nAcceso: Super-Administrator Full Grant`;
  }

  handleExportBridge() {
    const provider = document.getElementById('bridgeProvider').value;
    const users = Object.values(this.state.users || {});
    let out = '';

    if (provider === 'auth0') {
      out = JSON.stringify(users.map(u => ({ user_id: u.id, email: u.email, name: u.name, app_metadata: { role: u.role } })), null, 2);
    } else if (provider === 'supabase') {
      out = users.map(u => `INSERT INTO auth.users (id, email) VALUES ('${u.id}', '${u.email}');`).join('\n');
    } else {
      out = JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] }, null, 2);
    }

    document.getElementById('bridgeOutput').textContent = out || '// No hay datos para exportar';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new LuminaStudio();
});
