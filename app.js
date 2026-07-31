// LUMINA Studio v1.1.0 — Client Application

class LuminaStudio {
  constructor() {
    this.token = localStorage.getItem('lumina_pat') || '';
    this.storageRepo = '.lumina-storage';
    this.currentUser = null;
    this.state = {
      version: '1.1.0',
      activeSanct: 'default',
      sancts: {
        default: {
          sanctId: 'sanct_default',
          name: 'default',
          description: 'Entorno por defecto',
          createdAt: new Date().toISOString(),
          users: {},
          policies: {},
          roles: {},
          groupMappings: {},
          activeSessions: {},
          glowwormLogs: []
        }
      },
      users: {},
      policies: {},
      roles: {},
      groupMappings: {},
      activeSessions: {}
    };

    this.initDOM();
    this.bindEvents();
    if (this.token) this.connect();
  }

  // ─── DOM References ─────────────────────────────────────────────────────────
  initDOM() {
    this.authOverlay     = document.getElementById('authOverlay');
    this.patInput        = document.getElementById('patInput');
    this.btnConnect      = document.getElementById('btnConnect');
    this.btnDisconnect   = document.getElementById('btnDisconnect');
    this.connStatus      = document.getElementById('connStatus');
    this.sanctListEl     = document.getElementById('sanctList');
    this.btnNewSanct     = document.getElementById('btnNewSanct');
    this.userTableBody   = document.getElementById('userTableBody');
    this.userCount       = document.getElementById('userCount');
    this.policyTableBody = document.getElementById('policyTableBody');
    this.roleTableBody   = document.getElementById('roleTableBody');
    this.tabTitle        = document.getElementById('tabTitle');
    this.tabDesc         = document.getElementById('tabDesc');
    this.navItems        = document.querySelectorAll('.nav-item');
    this.tabPanels       = document.querySelectorAll('.tab-panel');
    this.subTabs         = document.querySelectorAll('.sub-tab');
    this.subPanels       = document.querySelectorAll('.sub-panel');
    this.modals          = {
      user:         document.getElementById('modalUser'),
      policy:       document.getElementById('modalPolicy'),
      role:         document.getElementById('modalRole'),
      sanct:        document.getElementById('modalSanct'),
      renameSanct:  document.getElementById('modalRenameSanct'),
      confirm:      document.getElementById('modalConfirm'),
    };
  }

  // ─── Current Active Sanct Helper ─────────────────────────────────────────────
  getActiveSanctData() {
    const sanctName = this.state.activeSanct || 'default';
    if (!this.state.sancts) this.state.sancts = {};
    if (!this.state.sancts[sanctName]) {
      this.state.sancts[sanctName] = {
        sanctId: `sanct_${Date.now()}`,
        name: sanctName,
        createdAt: new Date().toISOString(),
        users: this.state.users || {},
        policies: this.state.policies || {},
        roles: this.state.roles || {},
        groupMappings: {},
        activeSessions: {},
        glowwormLogs: []
      };
    }
    return this.state.sancts[sanctName];
  }

  syncLegacyTopLevelState() {
    const s = this.getActiveSanctData();
    this.state.users = s.users;
    this.state.policies = s.policies;
    this.state.roles = s.roles;
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

    this.patInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.btnConnect.click();
    });

    this.btnDisconnect.addEventListener('click', () => {
      localStorage.removeItem('lumina_pat');
      this.token = '';
      this.authOverlay.classList.remove('hidden');
    });

    // Sanctuary panel — new sanct button
    this.btnNewSanct.addEventListener('click', () => {
      document.getElementById('newSanctName').value = '';
      document.getElementById('newSanctDesc').value = '';
      this.openModal('sanct');
    });

    // Sanctuary modals
    document.getElementById('btnCancelSanct').addEventListener('click', () => this.closeModal('sanct'));
    document.getElementById('btnSaveSanct').addEventListener('click', () => this.handleSaveSanct());
    document.getElementById('btnCancelRenameSanct').addEventListener('click', () => this.closeModal('renameSanct'));
    document.getElementById('btnSaveRenameSanct').addEventListener('click', () => this.handleSaveRenameSanct());

    // Main tabs
    this.navItems.forEach(item => item.addEventListener('click', () => this.switchTab(item.dataset.tab)));

    // Pyralis sub-tabs
    this.subTabs.forEach(tab => tab.addEventListener('click', () => this.switchSubTab(tab.dataset.subtab)));

    // Photuris
    document.getElementById('btnCreateUser').addEventListener('click', () => this.openUserModal());
    document.getElementById('btnCancelUser').addEventListener('click', () => this.closeModal('user'));
    document.getElementById('btnSaveUser').addEventListener('click', () => this.handleSaveUser());

    // Luciole
    document.getElementById('btnGenerateJwt').addEventListener('click', () => this.handleGenerateJwt());
    document.getElementById('btnFetchJwks').addEventListener('click', () => this.handleFetchJwks());

    // Pyralis
    document.getElementById('btnEvalIam').addEventListener('click', () => this.handleEvalIam());
    document.getElementById('btnNewPolicy').addEventListener('click', () => this.openPolicyModal());
    document.getElementById('btnCancelPolicy').addEventListener('click', () => this.closeModal('policy'));
    document.getElementById('btnSavePolicy').addEventListener('click', () => this.handleSavePolicy());
    document.getElementById('btnNewRole').addEventListener('click', () => this.openRoleModal());
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
      if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Object.values(this.modals).forEach(m => m?.classList.remove('active'));
    });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  switchTab(tabId) {
    this.navItems.forEach(i => i.classList.toggle('active', i.dataset.tab === tabId));
    this.tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    const meta = {
      photuris:   { title: '🌌 Photuris Directory & Vault', desc: `Gestión de usuarios e identidades en Sanctuary '${this.state.activeSanct}'` },
      luciole:    { title: '💡 Luciole JWT & JWKS Engine', desc: 'Firma y verificación de tokens criptográficos a latencia cero' },
      pyralis:    { title: '📋 Pyralis IAM — Políticas y Roles', desc: `Políticas y roles en Sanctuary '${this.state.activeSanct}'` },
      lantern:    { title: '🏮 LanternLinks Magic Links', desc: 'Generación de accesos únicos sin contraseñas con protección anti-replay' },
      glowworm:   { title: '⚡ Glowworm Break-Glass', desc: 'Tokens efímeros de super-administrador de 15 minutos con audit log' },
      coleoptera: { title: '🐝 Coleoptera Enterprise Bridge', desc: 'Exportador multi-proveedor: Auth0, Supabase, AWS IAM, Firebase' },
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

        // Always ensure 'default' sanct exists (migration from v1.0 or fresh vault)
        if (!parsed.sancts) parsed.sancts = {};
        if (!parsed.sancts['default']) {
          parsed.sancts['default'] = {
            sanctId: 'sanct_default',
            name: 'default',
            description: 'Entorno por defecto',
            createdAt: new Date().toISOString(),
            users: parsed.users || {},
            policies: parsed.policies || {},
            roles: parsed.roles || {},
            groupMappings: {},
            activeSessions: {},
            glowwormLogs: []
          };
        }
        if (!parsed.activeSanct) parsed.activeSanct = 'default';
        // Ensure activeSanct still exists (could have been deleted externally)
        if (!parsed.sancts[parsed.activeSanct]) parsed.activeSanct = 'default';

        this.state = { ...this.state, ...parsed };
      }
    } catch (err) {
      console.info('Vault is empty or does not exist yet — starting fresh.');
    }

    // Guarantee default sanct always exists in state
    if (!this.state.sancts) this.state.sancts = {};
    if (!this.state.sancts['default']) {
      this.state.sancts['default'] = {
        sanctId: 'sanct_default',
        name: 'default',
        description: 'Entorno por defecto',
        createdAt: new Date().toISOString(),
        users: {}, policies: {}, roles: {},
        groupMappings: {}, activeSessions: {}, glowwormLogs: []
      };
    }
    if (!this.state.activeSanct || !this.state.sancts[this.state.activeSanct]) {
      this.state.activeSanct = 'default';
    }

    this.syncLegacyTopLevelState();
    this.renderAll();
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

  renderAll() {
    this.renderSanctPanel();
    this.renderUsers();
    this.renderPolicies();
    this.renderRoles();
  }

  // ─── Modals & Custom Confirmation Popup ──────────────────────────────────────
  openModal(key) { this.modals[key]?.classList.add('active'); }
  closeModal(key) { this.modals[key]?.classList.remove('active'); }

  showConfirm({ title, message, actionText = 'Eliminar', danger = true, onConfirm }) {
    document.getElementById('confirmTitle').textContent = title || '⚠️ Confirmación';
    document.getElementById('confirmMessage').textContent = message || '¿Deseas continuar?';
    const oldProceedBtn = document.getElementById('btnConfirmProceed');
    const newProceedBtn = oldProceedBtn.cloneNode(true);
    newProceedBtn.textContent = actionText;
    newProceedBtn.className = danger ? 'btn-primary btn-danger' : 'btn-primary';
    oldProceedBtn.parentNode.replaceChild(newProceedBtn, oldProceedBtn);

    newProceedBtn.onclick = () => {
      this.closeModal('confirm');
      if (onConfirm) onConfirm();
    };
    document.getElementById('btnConfirmCancel').onclick = () => this.closeModal('confirm');

    this.openModal('confirm');
  }

  // ─── 🏛️ Sanctuaries ──────────────────────────────────────────────────────────
  renderSanctPanel() {
    const sancts = Object.keys(this.state.sancts || { default: {} });
    const current = this.state.activeSanct || 'default';

    this.sanctListEl.innerHTML = sancts.map(name => {
      const isActive = name === current;
      const isDefault = name === 'default';
      const count = Object.keys(this.state.sancts[name]?.users || {}).length;
      return `
        <div class="sanct-item${isActive ? ' active' : ''}" data-sanct="${name}">
          <span class="sanct-item-icon">${isActive ? '▶' : '◯'}</span>
          <span class="sanct-item-name" title="${name}">${name}</span>
          ${isDefault ? '<span class="sanct-item-default">default</span>' : ''}
          <div class="sanct-item-actions">
            <button class="sanct-action-btn" onclick="event.stopPropagation();window.app.openRenameSanctModal('${name}')" title="Renombrar">✏️</button>
            ${!isDefault ? `<button class="sanct-action-btn delete" onclick="event.stopPropagation();window.app.handleDeleteSanct('${name}')" title="Eliminar">🗑</button>` : ''}
          </div>
        </div>`;
    }).join('');

    // Bind click to switch sanctuary
    this.sanctListEl.querySelectorAll('.sanct-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.sanct;
        if (name === this.state.activeSanct) return;
        this.state.activeSanct = name;
        this.syncLegacyTopLevelState();
        this.renderAll();
        this.toast(`Sanctuary cambiado a '${name}'`);
      });
    });
  }

  openRenameSanctModal(name) {
    document.getElementById('renameSanctOldName').value = name;
    document.getElementById('renameSanctOldDisplay').value = name;
    document.getElementById('renameSanctNewName').value = '';
    this.openModal('renameSanct');
  }

  async handleSaveRenameSanct() {
    const oldName = document.getElementById('renameSanctOldName').value;
    const newName = document.getElementById('renameSanctNewName').value.trim();
    if (!newName) return this.toast('Introduce un nombre nuevo', 'error');
    if (newName === oldName) return this.closeModal('renameSanct');
    if (this.state.sancts[newName]) return this.toast(`El Sanctuary '${newName}' ya existe`, 'error');
    if (!/^[a-z0-9_-]+$/i.test(newName)) return this.toast('Nombre inválido — solo letras, números, guiones y guiones bajos', 'error');

    const s = this.state.sancts[oldName];
    s.name = newName;
    this.state.sancts[newName] = s;
    delete this.state.sancts[oldName];
    if (this.state.activeSanct === oldName) this.state.activeSanct = newName;

    this.closeModal('renameSanct');
    this.syncLegacyTopLevelState();
    this.renderAll();
    await this.persistVaultState(`Lumina Sanct: Renamed sanctuary '${oldName}' to '${newName}'`);
    this.toast(`Sanctuary renombrado a '${newName}' ✔`);
  }

  async handleSaveSanct() {
    const name = document.getElementById('newSanctName').value.trim();
    const desc = document.getElementById('newSanctDesc').value.trim();
    if (!name) return this.toast('Introduce un nombre para el Sanctuary', 'error');

    if (this.state.sancts[name]) return this.toast(`El Sanctuary '${name}' ya existe`, 'error');

    this.state.sancts[name] = {
      sanctId: `sanct_${Date.now()}`,
      name,
      description: desc,
      createdAt: new Date().toISOString(),
      users: {},
      policies: {},
      roles: {},
      groupMappings: {},
      activeSessions: {},
      glowwormLogs: []
    };
    this.state.activeSanct = name;

    document.getElementById('newSanctName').value = '';
    document.getElementById('newSanctDesc').value = '';
    this.closeModal('sanct');
    this.syncLegacyTopLevelState();
    this.renderAll();
    await this.persistVaultState(`Lumina Sanct: Created sanctuary '${name}'`);
    this.toast(`Sanctuary '${name}' creado ✔`);
  }

  async handleDeleteSanct(name) {
    const target = name || this.state.activeSanct || 'default';
    if (target === 'default') return this.toast("No se puede eliminar el Sanctuary 'default'", 'error');
    
    this.showConfirm({
      title: '🗑️ Eliminar Sanctuary',
      message: `¿Estás seguro de que deseas eliminar el Sanctuary '${target}' y todas sus identidades, políticas y roles asociados? Esta acción no se puede deshacer.`,
      actionText: 'Eliminar Sanctuary',
      danger: true,
      onConfirm: async () => {
        delete this.state.sancts[target];
        if (this.state.activeSanct === target) this.state.activeSanct = 'default';
        this.syncLegacyTopLevelState();
        this.renderAll();
        await this.persistVaultState(`Lumina Sanct: Deleted sanctuary '${target}'`);
        this.toast(`Sanctuary '${target}' eliminado`);
      }
    });
  }

  // ─── 🌌 Photuris Vault & Users ────────────────────────────────────────────────
  renderUsers() {
    const sanct = this.getActiveSanctData();
    const users = Object.values(sanct.users || {});
    this.userCount.textContent = `${users.length} Usuario${users.length !== 1 ? 's' : ''}`;
    if (!users.length) {
      this.userTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay usuarios en el Sanctuary '${sanct.name}'. Crea el primero.</td></tr>`;
      return;
    }
    this.userTableBody.innerHTML = users.map(u => {
      const rolesArr = u.roles || (u.role ? [u.role] : ['user']);
      const roleBadges = rolesArr.map(r => `<span class="badge" style="margin-right:2px">${r}</span>`).join('');
      return `
      <tr>
        <td><code>${u.id}</code></td>
        <td><strong>${u.email}</strong></td>
        <td>${u.name}</td>
        <td>${roleBadges}</td>
        <td><span style="color:#10b981;font-size:.8rem">● Activo</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn-secondary btn-sm" onclick="window.app.editUser('${u.id}')" title="Editar">✏️</button>
          <button class="btn-secondary btn-sm" onclick="window.app.deleteUser('${u.id}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  }

  openUserModal(user = null) {
    const modalTitle = document.getElementById('modalUserTitle');
    const editId = document.getElementById('editUserId');
    const email = document.getElementById('newUserEmail');
    const name = document.getElementById('newUserName');
    const rolesContainer = document.getElementById('rolesCheckboxList');

    // Load available roles from active Sanct + defaults
    const sanct = this.getActiveSanctData();
    const existingRoles = Object.values(sanct.roles || {}).map(r => r.name);
    const defaultRoles = ['admin', 'editor', 'viewer', 'user'];
    const allRoles = [...new Set([...defaultRoles, ...existingRoles])];

    const selectedRoles = user ? (user.roles || [user.role]) : ['user'];

    rolesContainer.innerHTML = allRoles.map(r => `
      <label class="checkbox-label">
        <input type="checkbox" name="userRoleChk" value="${r}" ${selectedRoles.includes(r) ? 'checked' : ''} />
        <span>${r}</span>
      </label>
    `).join('');

    if (user) {
      modalTitle.textContent = '✏️ Editar Usuario';
      editId.value = user.id;
      email.value = user.email;
      name.value = user.name;
    } else {
      modalTitle.textContent = '➕ Nuevo Usuario';
      editId.value = '';
      email.value = '';
      name.value = '';
    }

    this.openModal('user');
  }

  editUser(userId) {
    const sanct = this.getActiveSanctData();
    const user = sanct.users[userId];
    if (user) this.openUserModal(user);
  }

  async handleSaveUser() {
    const editId = document.getElementById('editUserId').value;
    const email  = document.getElementById('newUserEmail').value.trim();
    const name   = document.getElementById('newUserName').value.trim();
    const chks   = document.querySelectorAll('input[name="userRoleChk"]:checked');
    const roles  = Array.from(chks).map(c => c.value);

    if (!email || !name) return this.toast('Email y nombre son obligatorios', 'error');
    if (roles.length === 0) return this.toast('Selecciona al menos un rol', 'error');

    const sanct = this.getActiveSanctData();
    const now = new Date().toISOString();

    if (editId && sanct.users[editId]) {
      // Edit
      const u = sanct.users[editId];
      u.email = email;
      u.name = name;
      u.roles = roles;
      u.role = roles[0];
      u.updatedAt = now;
      this.toast(`Usuario '${email}' actualizado ✔`);
    } else {
      // Create
      const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      sanct.users[userId] = {
        id: userId,
        email,
        name,
        role: roles[0],
        roles,
        createdAt: now,
        updatedAt: now,
        active: true
      };
      this.toast(`Usuario '${email}' creado ✔`);
    }

    this.closeModal('user');
    this.syncLegacyTopLevelState();
    this.renderUsers();
    await this.persistVaultState(`Lumina Photuris: Saved user ${email}`);
  }

  async deleteUser(userId) {
    const sanct = this.getActiveSanctData();
    const user = sanct.users[userId];
    const emailStr = user ? user.email : userId;

    this.showConfirm({
      title: '🗑️ Eliminar Usuario',
      message: `¿Estás seguro de que deseas eliminar el usuario '${emailStr}' del Sanctuary '${sanct.name}'?`,
      actionText: 'Eliminar Usuario',
      danger: true,
      onConfirm: async () => {
        delete sanct.users[userId];
        this.syncLegacyTopLevelState();
        this.renderUsers();
        await this.persistVaultState(`Lumina Photuris: Deleted user ${userId}`);
        this.toast('Usuario eliminado');
      }
    });
  }

  // ─── 💡 Luciole ──────────────────────────────────────────────────────────────
  handleGenerateJwt() {
    const sub  = document.getElementById('jwtSub').value.trim();
    const roleStr = document.getElementById('jwtRole').value.trim();
    const exp  = parseInt(document.getElementById('jwtExp').value, 10) || 3600;
    if (!sub || !roleStr) return this.toast('Completa User ID y Roles', 'error');

    const roles = roleStr.split(',').map(s => s.trim());
    const b64 = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const now = Math.floor(Date.now() / 1000);
    const header  = { alg: 'HS256', typ: 'JWT' };
    const payload = { sub, roles, role: roles[0], iat: now, exp: now + exp, iss: 'lumina-luciole', sanct: this.state.activeSanct };
    const sigPart = `LUCIOLE_SIG_${Date.now().toString(36).toUpperCase()}`;
    const token = `${b64(header)}.${b64(payload)}.${sigPart}`;
    document.getElementById('jwtOutput').textContent = token;
  }

  handleFetchJwks() {
    const jwks = { keys: [{ kty: 'oct', use: 'sig', alg: 'HS256', kid: `luciole-key-${Date.now().toString(36)}` }] };
    document.getElementById('jwksOutput').textContent = JSON.stringify(jwks, null, 2);
  }

  // ─── 📋 Pyralis IAM ──────────────────────────────────────────────────────────
  handleEvalIam() {
    const action   = document.getElementById('iamAction').value.trim();
    const resource = document.getElementById('iamResource').value.trim();
    const rolesStr = document.getElementById('iamRole').value.trim();
    if (!action || !resource) return this.toast('Completa Action y Resource', 'error');

    const box    = document.getElementById('iamResult');
    const badge  = document.getElementById('iamResultBadge');
    const reason = document.getElementById('iamResultReason');
    box.classList.remove('hidden');

    const sanct = this.getActiveSanctData();
    const policies = Object.values(sanct.policies || {});
    const roles = rolesStr ? rolesStr.split(',').map(s => s.trim()) : ['admin'];

    const result = this._evalPoliciesForRoles(policies, sanct.roles || {}, action, resource, roles);

    badge.textContent = result.allowed ? 'ALLOW' : 'DENY';
    badge.style.background = result.allowed ? '#10b981' : '#ef4444';
    reason.textContent = result.reason;
  }

  _evalPoliciesForRoles(policies, allRoles, action, resource, userRoles) {
    if (!policies.length) return { allowed: false, reason: 'No hay políticas en el vault — Implicit Deny' };
    let hasAllow = false;
    const glob = (pattern, text) => {
      if (pattern === '*') return true;
      return new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(text);
    };

    // Gather policies attached to user's roles
    const attachedPolicyIds = new Set();
    for (const rName of userRoles) {
      const roleObj = Object.values(allRoles).find(r => r.name === rName);
      if (roleObj && roleObj.policyIds) {
        roleObj.policyIds.forEach(id => attachedPolicyIds.add(id));
      }
    }

    // Filter policies (if roles matched explicit policyIds, use those; otherwise use all policies for backwards compatibility)
    const targetPolicies = attachedPolicyIds.size > 0
      ? policies.filter(p => attachedPolicyIds.has(p.policyId))
      : policies;

    for (const pol of targetPolicies) {
      for (const stmt of pol.statements || []) {
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
    const sanct = this.getActiveSanctData();
    const policies = Object.values(sanct.policies || {});
    if (!policies.length) {
      this.policyTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Sin políticas en '${sanct.name}'. Crea la primera.</td></tr>`;
      return;
    }
    this.policyTableBody.innerHTML = policies.map(p => `
      <tr>
        <td><code>${p.policyId}</code></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge">${p.provider ?? 'terra'}</span></td>
        <td>${p.statements?.length ?? 0} statements</td>
        <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
        <td>
          <button class="btn-secondary btn-sm" onclick="window.app.editPolicy('${p.policyId}')" title="Editar">✏️</button>
          <button class="btn-secondary btn-sm" onclick="window.app.deletePolicy('${p.policyId}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`).join('');
  }

  openPolicyModal(policy = null) {
    const title = document.getElementById('modalPolicyTitle');
    const editId = document.getElementById('editPolicyId');
    const name = document.getElementById('newPolicyName');
    const desc = document.getElementById('newPolicyDesc');
    const provider = document.getElementById('newPolicyProvider');
    const stmts = document.getElementById('newPolicyStatements');

    if (policy) {
      title.textContent = '✏️ Editar Política Pyralis';
      editId.value = policy.policyId;
      name.value = policy.name;
      desc.value = policy.description || '';
      provider.value = policy.provider || 'terra';
      stmts.value = JSON.stringify(policy.statements || [], null, 2);
    } else {
      title.textContent = '📋 Nueva Política Pyralis';
      editId.value = '';
      name.value = '';
      desc.value = '';
      provider.value = 'terra';
      stmts.value = JSON.stringify([{ Effect: 'Allow', Action: 'combase:*', Resource: 'arn:terra:combase:*' }], null, 2);
    }

    this.openModal('policy');
  }

  editPolicy(policyId) {
    const sanct = this.getActiveSanctData();
    const policy = sanct.policies[policyId];
    if (policy) this.openPolicyModal(policy);
  }

  async handleSavePolicy() {
    const editId   = document.getElementById('editPolicyId').value;
    const name     = document.getElementById('newPolicyName').value.trim();
    const desc     = document.getElementById('newPolicyDesc').value.trim();
    const provider = document.getElementById('newPolicyProvider').value;
    const raw      = document.getElementById('newPolicyStatements').value.trim();

    if (!name) return this.toast('El nombre de la política es obligatorio', 'error');

    let statements = [];
    try { statements = JSON.parse(raw || '[]'); } catch {
      return this.toast('Los statements no son JSON válido', 'error');
    }

    const sanct = this.getActiveSanctData();
    const now = new Date().toISOString();

    if (editId && sanct.policies[editId]) {
      const p = sanct.policies[editId];
      p.name = name;
      p.description = desc;
      p.provider = provider;
      p.statements = statements;
      p.updatedAt = now;
      this.toast(`Política '${name}' actualizada ✔`);
    } else {
      const policyId = `pol_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      sanct.policies[policyId] = { policyId, name, description: desc, statements, provider, createdAt: now };
      this.toast(`Política '${name}' creada ✔`);
    }

    this.closeModal('policy');
    this.syncLegacyTopLevelState();
    this.renderPolicies();
    await this.persistVaultState(`Lumina Pyralis: Saved policy '${name}'`);
  }

  async deletePolicy(policyId) {
    const sanct = this.getActiveSanctData();
    const policy = sanct.policies[policyId];
    const nameStr = policy ? policy.name : policyId;

    this.showConfirm({
      title: '🗑️ Eliminar Política Pyralis',
      message: `¿Estás seguro de que deseas eliminar la política '${nameStr}'?`,
      actionText: 'Eliminar Política',
      danger: true,
      onConfirm: async () => {
        delete sanct.policies[policyId];
        this.syncLegacyTopLevelState();
        this.renderPolicies();
        await this.persistVaultState(`Lumina Pyralis: Deleted policy ${policyId}`);
        this.toast('Política eliminada');
      }
    });
  }

  renderRoles() {
    const sanct = this.getActiveSanctData();
    const roles = Object.values(sanct.roles || {});
    if (!roles.length) {
      this.roleTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Sin roles en '${sanct.name}'. Crea el primero.</td></tr>`;
      return;
    }
    this.roleTableBody.innerHTML = roles.map(r => `
      <tr>
        <td><code>${r.roleId}</code></td>
        <td><strong>${r.name}</strong></td>
        <td><span class="badge">${r.provider ?? 'terra'}</span></td>
        <td>${r.policyIds?.length ?? 0} políticas</td>
        <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
        <td>
          <button class="btn-secondary btn-sm" onclick="window.app.editRole('${r.roleId}')" title="Editar">✏️</button>
          <button class="btn-secondary btn-sm" onclick="window.app.deleteRole('${r.roleId}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`).join('');
  }

  openRoleModal(role = null) {
    const title = document.getElementById('modalRoleTitle');
    const editId = document.getElementById('editRoleId');
    const name = document.getElementById('newRoleName');
    const desc = document.getElementById('newRoleDesc');
    const provider = document.getElementById('newRoleProvider');
    const policiesContainer = document.getElementById('policiesCheckboxList');

    const sanct = this.getActiveSanctData();
    const availablePolicies = Object.values(sanct.policies || {});

    const selectedPolicyIds = role ? (role.policyIds || []) : [];

    if (!availablePolicies.length) {
      policiesContainer.innerHTML = '<span class="text-muted" style="font-size:0.8rem;">No hay políticas creadas en este Sanctuary. Crea una primero.</span>';
    } else {
      policiesContainer.innerHTML = availablePolicies.map(p => `
        <label class="checkbox-label">
          <input type="checkbox" name="rolePolicyChk" value="${p.policyId}" ${selectedPolicyIds.includes(p.policyId) ? 'checked' : ''} />
          <span><strong>${p.name}</strong> (<code>${p.policyId}</code>)</span>
        </label>
      `).join('');
    }

    if (role) {
      title.textContent = '✏️ Editar Rol Pyralis';
      editId.value = role.roleId;
      name.value = role.name;
      desc.value = role.description || '';
      provider.value = role.provider || 'terra';
    } else {
      title.textContent = '🎭 Nuevo Rol Pyralis';
      editId.value = '';
      name.value = '';
      desc.value = '';
      provider.value = 'terra';
    }

    this.openModal('role');
  }

  editRole(roleId) {
    const sanct = this.getActiveSanctData();
    const role = sanct.roles[roleId];
    if (role) this.openRoleModal(role);
  }

  async handleSaveRole() {
    const editId   = document.getElementById('editRoleId').value;
    const name     = document.getElementById('newRoleName').value.trim();
    const desc     = document.getElementById('newRoleDesc').value.trim();
    const provider = document.getElementById('newRoleProvider').value;
    const chks     = document.querySelectorAll('input[name="rolePolicyChk"]:checked');
    const policyIds = Array.from(chks).map(c => c.value);

    if (!name) return this.toast('El nombre del rol es obligatorio', 'error');

    const sanct = this.getActiveSanctData();
    const now = new Date().toISOString();

    if (editId && sanct.roles[editId]) {
      const r = sanct.roles[editId];
      r.name = name;
      r.description = desc;
      r.provider = provider;
      r.policyIds = policyIds;
      r.updatedAt = now;
      this.toast(`Rol '${name}' actualizado ✔`);
    } else {
      const roleId = `role_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      sanct.roles[roleId] = { roleId, name, description: desc, policyIds, provider, createdAt: now };
      this.toast(`Rol '${name}' creado ✔`);
    }

    this.closeModal('role');
    this.syncLegacyTopLevelState();
    this.renderRoles();
    await this.persistVaultState(`Lumina Pyralis: Saved role '${name}'`);
  }

  async deleteRole(roleId) {
    const sanct = this.getActiveSanctData();
    const role = sanct.roles[roleId];
    const nameStr = role ? role.name : roleId;

    this.showConfirm({
      title: '🗑️ Eliminar Rol Pyralis',
      message: `¿Estás seguro de que deseas eliminar el rol '${nameStr}'?`,
      actionText: 'Eliminar Rol',
      danger: true,
      onConfirm: async () => {
        delete sanct.roles[roleId];
        this.syncLegacyTopLevelState();
        this.renderRoles();
        await this.persistVaultState(`Lumina Pyralis: Deleted role ${roleId}`);
        this.toast('Rol eliminado');
      }
    });
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
      `⚡ GLOWWORM BREAK-GLASS EMITIDO\n\nToken ID:   ${tokenId}\nUsuario:    ${userId}\nMotivo:     ${reason}\nExpira:     ${exp.toLocaleTimeString()} (15 min)\nSanctuary:  ${this.state.activeSanct}\nNivel:      Super-Administrator — Full Grant\n\n⚠️  Registrado en .lumina-storage audit log`;
    this.toast('Break-Glass emitido — válido 15 min', 'warn');
  }

  // ─── 🐝 Coleoptera ────────────────────────────────────────────────────────────
  handleExportBridge() {
    const provider = document.getElementById('bridgeProvider').value;
    const sanct    = this.getActiveSanctData();
    const users    = Object.values(sanct.users || {});
    const policies = Object.values(sanct.policies || {});
    let out = '';

    if (provider === 'auth0') {
      out = JSON.stringify(users.map(u => ({
        user_id: u.id, email: u.email, name: u.name,
        app_metadata: { roles: u.roles || [u.role], org_id: u.orgId ?? null, sanct: sanct.name }
      })), null, 2);
    } else if (provider === 'supabase') {
      out = users.length
        ? users.map(u => `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES\n  ('${u.id}', '${u.email}', '{"roles":${JSON.stringify(u.roles || [u.role])},"name":"${u.name}","sanct":"${sanct.name}"}');`).join('\n')
        : '-- No users to export';
    } else if (provider === 'aws_iam') {
      out = JSON.stringify(policies.map(p => ({
        PolicyName: p.name,
        PolicyDocument: { Version: '2012-10-17', Statement: p.statements }
      })), null, 2) || '[]';
    } else if (provider === 'firebase') {
      out = JSON.stringify({
        users: users.map(u => ({
          localId: u.id, email: u.email, displayName: u.name,
          customAttributes: JSON.stringify({ roles: u.roles || [u.role], sanct: sanct.name })
        }))
      }, null, 2);
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
