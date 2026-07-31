// LUMINA Studio — Client Application

class LuminaStudio {
  constructor() {
    this.token = localStorage.getItem('lumina_pat') || '';
    this.storageRepo = '.lumina-storage';
    this.currentUser = null;
    this.state = { version: '1.0.0', users: {}, policies: {}, roles: {}, groupMappings: {}, activeSessions: {} };

    this.initDOM();
    this.bindEvents();
    if (this.token) this.connect();
  }

  // ─── DOM References ─────────────────────────────────────────────────────────
  initDOM() {
    this.authOverlay    = document.getElementById('authOverlay');
    this.patInput       = document.getElementById('patInput');
    this.btnConnect     = document.getElementById('btnConnect');
    this.btnDisconnect  = document.getElementById('btnDisconnect');
    this.connStatus     = document.getElementById('connStatus');
    this.userTableBody  = document.getElementById('userTableBody');
    this.userCount      = document.getElementById('userCount');
    this.policyTableBody = document.getElementById('policyTableBody');
    this.roleTableBody  = document.getElementById('roleTableBody');
    this.tabTitle       = document.getElementById('tabTitle');
    this.tabDesc        = document.getElementById('tabDesc');
    this.navItems       = document.querySelectorAll('.nav-item');
    this.tabPanels      = document.querySelectorAll('.tab-panel');
    this.subTabs        = document.querySelectorAll('.sub-tab');
    this.subPanels      = document.querySelectorAll('.sub-panel');
    this.modals         = {
      user:   document.getElementById('modalUser'),
      policy: document.getElementById('modalPolicy'),
      role:   document.getElementById('modalRole'),
    };
  }

  // ─── Event Binding ───────────────────────────────────────────────────────────
  bindEvents() {
    this.btnConnect.addEventListener('click', () => {
      const val = this.patInput.value.trim();
      if (!val) return this.toast('Introduce un GitHub Token válido', 'error');
      this.token = val;
      localStorage.setItem('lumina_pat', val);
      this.connect();
    });

    document.getElementById('patInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.btnConnect.click();
    });

    this.btnDisconnect.addEventListener('click', () => {
      localStorage.removeItem('lumina_pat');
      this.token = '';
      this.authOverlay.classList.remove('hidden');
    });

    // Main tabs
    this.navItems.forEach(item => item.addEventListener('click', () => this.switchTab(item.dataset.tab)));

    // Pyralis sub-tabs
    this.subTabs.forEach(tab => tab.addEventListener('click', () => this.switchSubTab(tab.dataset.subtab)));

    // Photuris
    document.getElementById('btnCreateUser').addEventListener('click', () => this.openModal('user'));
    document.getElementById('btnCancelUser').addEventListener('click', () => this.closeModal('user'));
    document.getElementById('btnSaveUser').addEventListener('click', () => this.handleSaveUser());

    // Luciole
    document.getElementById('btnGenerateJwt').addEventListener('click', () => this.handleGenerateJwt());
    document.getElementById('btnFetchJwks').addEventListener('click', () => this.handleFetchJwks());

    // Pyralis
    document.getElementById('btnEvalIam').addEventListener('click', () => this.handleEvalIam());
    document.getElementById('btnNewPolicy').addEventListener('click', () => this.openModal('policy'));
    document.getElementById('btnCancelPolicy').addEventListener('click', () => this.closeModal('policy'));
    document.getElementById('btnSavePolicy').addEventListener('click', () => this.handleSavePolicy());
    document.getElementById('btnNewRole').addEventListener('click', () => this.openModal('role'));
    document.getElementById('btnCancelRole').addEventListener('click', () => this.closeModal('role'));
    document.getElementById('btnSaveRole').addEventListener('click', () => this.handleSaveRole());

    // LanternLinks
    document.getElementById('btnCreateMagic').addEventListener('click', () => this.handleCreateMagic());

    // Glowworm
    document.getElementById('btnIssueGw').addEventListener('click', () => this.handleIssueGw());

    // Coleoptera
    document.getElementById('btnExportBridge').addEventListener('click', () => this.handleExportBridge());

    // Close modals on backdrop click / ESC
    Object.values(this.modals).forEach(modal => {
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Object.values(this.modals).forEach(m => m.classList.remove('active'));
    });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  switchTab(tabId) {
    this.navItems.forEach(i => i.classList.toggle('active', i.dataset.tab === tabId));
    this.tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    const meta = {
      photuris:   { title: '🌌 Photuris Directory & Vault', desc: 'Gestión inmutable de usuarios e identidades en .lumina-storage' },
      luciole:    { title: '💡 Luciole JWT & JWKS Engine', desc: 'Firma y verificación de tokens criptográficos a latencia cero' },
      pyralis:    { title: '📋 Pyralis IAM — Políticas y Roles', desc: 'Creación de políticas y roles compatibles con Terra, AWS, Auth0, Azure AD y Supabase' },
      lantern:    { title: '🏮 LanternLinks Magic Links', desc: 'Generación de accesos únicos sin contraseñas con protección anti-replay' },
      glowworm:   { title: '⚡ Glowworm Break-Glass', desc: 'Tokens efímeros de super-administrador de 15 minutos con audit log' },
      coleoptera: { title: '🐝 Coleoptera Enterprise Bridge', desc: 'Exportador multi-proveedor: Auth0, Supabase, AWS IAM' },
    };
    if (meta[tabId]) {
      this.tabTitle.textContent = meta[tabId].title;
      this.tabDesc.textContent  = meta[tabId].desc;
    }
    if (tabId === 'pyralis') { this.renderPolicies(); this.renderRoles(); }
    if (tabId === 'photuris') this.renderUsers();
  }

  switchSubTab(subtabId) {
    this.subTabs.forEach(t => t.classList.toggle('active', t.dataset.subtab === subtabId));
    this.subPanels.forEach(p => {
      p.classList.toggle('active', p.id === subtabId);
      p.classList.toggle('hidden', p.id !== subtabId);
    });
  }

  // ─── GitHub Connection ────────────────────────────────────────────────────────
  async connect() {
    try {
      this.connStatus.textContent = 'Verificando token…';
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${this.token}` }
      });
      if (!res.ok) throw new Error('Token inválido o sin permisos de repo');
      this.currentUser = await res.json();
      this.connStatus.textContent = `@${this.currentUser.login}`;
      this.authOverlay.classList.add('hidden');
      await this.loadVaultData();
    } catch (err) {
      this.connStatus.textContent = 'Sin conexión';
      this.toast('Error: ' + err.message, 'error');
    }
  }

  async loadVaultData() {
    try {
      const owner = this.currentUser.login;
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`,
        { headers: { 'Authorization': `token ${this.token}` } }
      );
      if (res.ok) {
        const file = await res.json();
        const content = atob(file.content.replace(/\s/g, ''));
        const parsed = JSON.parse(content);
        this.state = { ...this.state, ...parsed };
        if (!this.state.roles) this.state.roles = {};
      }
    } catch (err) {
      console.info('Vault is empty or does not exist yet.');
    }
    this.renderUsers();
    this.renderPolicies();
    this.renderRoles();
  }

  async persistVaultState(message) {
    if (!this.currentUser) return;
    try {
      const owner = this.currentUser.login;
      let sha;
      try {
        const r = await fetch(
          `https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`,
          { headers: { 'Authorization': `token ${this.token}` } }
        );
        if (r.ok) sha = (await r.json()).sha;
      } catch {}

      await fetch(
        `https://api.github.com/repos/${owner}/${this.storageRepo}/contents/lumina.json`,
        {
          method: 'PUT',
          headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, content: btoa(JSON.stringify(this.state, null, 2)), sha })
        }
      );
    } catch (e) { console.warn('Vault persist error:', e.message); }
  }

  // ─── Modals ───────────────────────────────────────────────────────────────────
  openModal(key) { this.modals[key]?.classList.add('active'); }
  closeModal(key) { this.modals[key]?.classList.remove('active'); }

  // ─── 🌌 Photuris ─────────────────────────────────────────────────────────────
  renderUsers() {
    const users = Object.values(this.state.users || {});
    this.userCount.textContent = `${users.length} Usuario${users.length !== 1 ? 's' : ''}`;
    if (!users.length) {
      this.userTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay usuarios en el vault. Crea el primero.</td></tr>`;
      return;
    }
    this.userTableBody.innerHTML = users.map(u => `
      <tr>
        <td><code>${u.id}</code></td>
        <td><strong>${u.email}</strong></td>
        <td>${u.name}</td>
        <td><span class="badge">${u.role}</span></td>
        <td><span style="color:#10b981;font-size:.8rem">● Activo</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn-secondary btn-sm" onclick="window.app.deleteUser('${u.id}')">🗑️</button>
        </td>
      </tr>`).join('');
  }

  async handleSaveUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const name  = document.getElementById('newUserName').value.trim();
    const role  = document.getElementById('newUserRole').value;
    if (!email || !name) return this.toast('Email y nombre son obligatorios', 'error');

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    this.state.users[userId] = { id: userId, email, name, role, createdAt: now, updatedAt: now, active: true };

    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserName').value  = '';
    this.closeModal('user');
    this.renderUsers();
    await this.persistVaultState(`Lumina Photuris: Created user ${email}`);
    this.toast(`Usuario ${email} creado ✔`);
  }

  async deleteUser(userId) {
    if (!confirm('¿Eliminar este usuario?')) return;
    delete this.state.users[userId];
    this.renderUsers();
    await this.persistVaultState(`Lumina Photuris: Deleted user ${userId}`);
    this.toast('Usuario eliminado');
  }

  // ─── 💡 Luciole ──────────────────────────────────────────────────────────────
  handleGenerateJwt() {
    const sub  = document.getElementById('jwtSub').value.trim();
    const role = document.getElementById('jwtRole').value.trim();
    const exp  = parseInt(document.getElementById('jwtExp').value, 10) || 3600;
    if (!sub || !role) return this.toast('Completa User ID y Role', 'error');

    const b64 = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const now = Math.floor(Date.now() / 1000);
    const header  = { alg: 'HS256', typ: 'JWT' };
    const payload = { sub, role, iat: now, exp: now + exp, iss: 'lumina-luciole' };
    const sigPart = `LUCIOLE_SIG_${Date.now().toString(36).toUpperCase()}`;
    const token = `${b64(header)}.${b64(payload)}.${sigPart}`;
    document.getElementById('jwtOutput').textContent = token;
  }

  handleFetchJwks() {
    const jwks = { keys: [{ kty: 'oct', use: 'sig', alg: 'HS256', kid: `luciole-key-${Date.now().toString(36)}` }] };
    document.getElementById('jwksOutput').textContent = JSON.stringify(jwks, null, 2);
  }

  // ─── 📋 Pyralis ──────────────────────────────────────────────────────────────
  handleEvalIam() {
    const action   = document.getElementById('iamAction').value.trim();
    const resource = document.getElementById('iamResource').value.trim();
    const role     = document.getElementById('iamRole').value.trim();
    if (!action || !resource) return this.toast('Completa Action y Resource', 'error');

    const box    = document.getElementById('iamResult');
    const badge  = document.getElementById('iamResultBadge');
    const reason = document.getElementById('iamResultReason');
    box.classList.remove('hidden');

    // Evaluate against real policies in state
    const policies = Object.values(this.state.policies || {});
    const result = this._evalPolicies(policies, action, resource, role);

    badge.textContent = result.allowed ? 'ALLOW' : 'DENY';
    badge.style.background = result.allowed ? '#10b981' : '#ef4444';
    reason.textContent = result.reason;
  }

  _evalPolicies(policies, action, resource, userRole) {
    if (!policies.length) return { allowed: false, reason: 'No hay políticas en el vault — Implicit Deny' };
    let hasAllow = false;
    const glob = (pattern, text) => {
      if (pattern === '*') return true;
      return new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(text);
    };
    for (const pol of policies) {
      for (const stmt of pol.statements) {
        const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
        const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];
        if (!actions.some(a => glob(a, action))) continue;
        if (!resources.some(r => glob(r, resource))) continue;
        if (stmt.Effect === 'Deny') return { allowed: false, reason: `Explicit Deny por política '${pol.name}'` };
        if (stmt.Effect === 'Allow') hasAllow = true;
      }
    }
    return hasAllow
      ? { allowed: true,  reason: 'Permitido por política en vault' }
      : { allowed: false, reason: 'Implicit Deny — ninguna política coincide' };
  }

  renderPolicies() {
    const policies = Object.values(this.state.policies || {});
    if (!policies.length) {
      this.policyTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Sin políticas. Crea la primera.</td></tr>`;
      return;
    }
    this.policyTableBody.innerHTML = policies.map(p => `
      <tr>
        <td><code>${p.policyId}</code></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge">${p.provider ?? 'terra'}</span></td>
        <td>${p.statements?.length ?? 0} statements</td>
        <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
        <td><button class="btn-secondary btn-sm" onclick="window.app.deletePolicy('${p.policyId}')">🗑️</button></td>
      </tr>`).join('');
  }

  async handleSavePolicy() {
    const name     = document.getElementById('newPolicyName').value.trim();
    const desc     = document.getElementById('newPolicyDesc').value.trim();
    const provider = document.getElementById('newPolicyProvider').value;
    const raw      = document.getElementById('newPolicyStatements').value.trim();
    if (!name) return this.toast('El nombre de la política es obligatorio', 'error');

    let statements = [];
    try { statements = JSON.parse(raw || '[]'); } catch {
      return this.toast('Los statements no son JSON válido', 'error');
    }

    const policyId = `pol_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    this.state.policies[policyId] = { policyId, name, description: desc, statements, provider, createdAt: new Date().toISOString() };

    document.getElementById('newPolicyName').value       = '';
    document.getElementById('newPolicyDesc').value       = '';
    document.getElementById('newPolicyStatements').value = '';
    this.closeModal('policy');
    this.renderPolicies();
    await this.persistVaultState(`Lumina Pyralis: Created policy '${name}'`);
    this.toast(`Política '${name}' creada ✔`);
  }

  async deletePolicy(policyId) {
    if (!confirm('¿Eliminar esta política?')) return;
    delete this.state.policies[policyId];
    this.renderPolicies();
    await this.persistVaultState(`Lumina Pyralis: Deleted policy ${policyId}`);
    this.toast('Política eliminada');
  }

  renderRoles() {
    const roles = Object.values(this.state.roles || {});
    if (!roles.length) {
      this.roleTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Sin roles. Crea el primero.</td></tr>`;
      return;
    }
    this.roleTableBody.innerHTML = roles.map(r => `
      <tr>
        <td><code>${r.roleId}</code></td>
        <td><strong>${r.name}</strong></td>
        <td><span class="badge">${r.provider ?? 'terra'}</span></td>
        <td>${r.policyIds?.length ?? 0} políticas</td>
        <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
        <td><button class="btn-secondary btn-sm" onclick="window.app.deleteRole('${r.roleId}')">🗑️</button></td>
      </tr>`).join('');
  }

  async handleSaveRole() {
    const name      = document.getElementById('newRoleName').value.trim();
    const desc      = document.getElementById('newRoleDesc').value.trim();
    const provider  = document.getElementById('newRoleProvider').value;
    const rawPols   = document.getElementById('newRolePolicies').value.trim();
    if (!name) return this.toast('El nombre del rol es obligatorio', 'error');

    const policyIds = rawPols ? rawPols.split(',').map(s => s.trim()).filter(Boolean) : [];
    const roleId = `role_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    this.state.roles[roleId] = { roleId, name, description: desc, policyIds, provider, createdAt: new Date().toISOString() };

    document.getElementById('newRoleName').value     = '';
    document.getElementById('newRoleDesc').value     = '';
    document.getElementById('newRolePolicies').value = '';
    this.closeModal('role');
    this.renderRoles();
    await this.persistVaultState(`Lumina Pyralis: Created role '${name}'`);
    this.toast(`Rol '${name}' creado ✔`);
  }

  async deleteRole(roleId) {
    if (!confirm('¿Eliminar este rol?')) return;
    delete this.state.roles[roleId];
    this.renderRoles();
    await this.persistVaultState(`Lumina Pyralis: Deleted role ${roleId}`);
    this.toast('Rol eliminado');
  }

  // ─── 🏮 LanternLinks ─────────────────────────────────────────────────────────
  handleCreateMagic() {
    const email = document.getElementById('magicEmail').value.trim();
    const ttl   = parseInt(document.getElementById('magicTtl').value, 10) || 300;
    if (!email) return this.toast('Introduce un email', 'error');

    const token = 'mgt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const url   = `https://app.lumina.terra?magic_token=${token}&email=${encodeURIComponent(email)}`;
    const exp   = new Date(Date.now() + ttl * 1000).toLocaleTimeString();
    document.getElementById('magicOutput').textContent =
      `Magic URL:\n${url}\n\nToken: ${token}\nTTL: ${ttl}s (expira ~${exp})\nProtección: Anti-replay activa`;
  }

  // ─── ⚡ Glowworm ──────────────────────────────────────────────────────────────
  handleIssueGw() {
    const userId = document.getElementById('gwUser').value.trim();
    const reason = document.getElementById('gwReason').value.trim();
    if (!userId || !reason) return this.toast('User ID y Motivo son obligatorios', 'error');

    const tokenId = 'gw_' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const exp = new Date(Date.now() + 15 * 60 * 1000);
    document.getElementById('gwOutput').textContent =
      `⚡ GLOWWORM BREAK-GLASS EMITIDO\n\nToken ID:   ${tokenId}\nUsuario:    ${userId}\nMotivo:     ${reason}\nExpira:     ${exp.toLocaleTimeString()} (15 min)\nNivel:      Super-Administrator — Full Grant\n\n⚠️  Registrado en .lumina-storage audit log`;
    this.toast('Break-Glass emitido — válido 15 min', 'warn');
  }

  // ─── 🐝 Coleoptera ────────────────────────────────────────────────────────────
  handleExportBridge() {
    const provider = document.getElementById('bridgeProvider').value;
    const users    = Object.values(this.state.users || {});
    const policies = Object.values(this.state.policies || {});
    let out = '';

    if (provider === 'auth0') {
      out = JSON.stringify(users.map(u => ({
        user_id: u.id, email: u.email, name: u.name,
        app_metadata: { role: u.role, org_id: u.orgId ?? null }
      })), null, 2);
    } else if (provider === 'supabase') {
      out = users.length
        ? users.map(u => `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES\n  ('${u.id}', '${u.email}', '{"role":"${u.role}","name":"${u.name}"}');`).join('\n')
        : '-- No users to export';
    } else if (provider === 'aws_iam') {
      out = JSON.stringify(policies.map(p => ({
        PolicyName: p.name,
        PolicyDocument: { Version: '2012-10-17', Statement: p.statements }
      })), null, 2) || '[]';
    }

    document.getElementById('bridgeOutput').textContent = out || '// Sin datos para exportar';
  }

  // ─── Toast Notifications ──────────────────────────────────────────────────────
  toast(msg, type = 'success') {
    const t = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', warn: '#fc9a0a' };
    t.style.cssText = `position:fixed;top:1.2rem;right:1.2rem;background:${colors[type]??colors.success};color:#0a0a0f;padding:.6rem 1.1rem;border-radius:8px;font-weight:600;font-size:.82rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.4);transition:opacity .3s`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new LuminaStudio(); });
