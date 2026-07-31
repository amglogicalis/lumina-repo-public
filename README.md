<p align="center">
  <img src="logo_lumina.png" alt="LUMINA Logo" width="220" />
</p>

<h1 align="center">🔐 LUMINA — Terra Ecosystem Identity & Auth Engine</h1>

<p align="center">
  <strong>Infraestructura de Autenticación Serverless, Políticas IAM Granulares, Magic Links y Broker Empresarial a Coste $0</strong>
</p>

<p align="center">
  <a href="#-visión-y-filosofía">Visión</a> •
  <a href="#-nomenclatura-bioluminosa">Nomenclatura</a> •
  <a href="#-instalación-y-uso">Instalación</a> •
  <a href="#-referencia-completa-de-la-cli">CLI Reference</a> •
  <a href="#-uso-del-sdk">SDK</a> •
  <a href="#-puente-multicloud-coleoptera">Multicloud Bridge</a> •
  <a href="#-licencia">Licencia MIT</a>
</p>

---

## 🌐 Visión y Filosofía

**LUMINA** es el titán de autenticación, gestión de identidades (IdP), políticas granulares (estilo AWS IAM) y Single Sign-On (SSO) del **Ecosistema Terra**, diseñado para operar a **$0 facturas recurrentes** sin necesidad de mantener servidores ni pagar licencias de Auth0, Clerk, Supabase Auth u Okta Enterprise.

Toda la base de identidades se guarda de forma encriptada en tu repositorio privado **`.lumina-storage`** de GitHub.

---

## 🪲 Nomenclatura Bioluminosa

Inspirándonos en la fotobiología de las luciérnagas y coleópteros luminiscentes, cada módulo de **LUMINA** tiene una identidad única:

- **💡 Luciole**: Motor Criptográfico JWT & Emisor JWKS (`lumina Luciole`). Firma RS256/Ed25519 con llaves públicas abiertas en `/.well-known/jwks.json` para verificación offline a $0 latencia.
- **🪲 Pyralis**: Motor de Políticas Granulares Estilo AWS IAM (`lumina Pyralis`). Evaluador `Allow`/`Deny` con wildcards sobre recursos Terra (`arn:terra:...`) y nubes externas (`arn:aws:...`, `supabase:...`, `auth0:...`).
- **LanternLinks 🏮**: Enlaces Mágicos Serverless & OTPs sin contraseñas (`lumina LanternLinks`).
- **Glowworm ⚡**: Credenciales Efímeras de Emergencia Break-Glass de 15 minutos (`lumina Glowworm`).
- **Photuris Vault 🌌**: Bóveda Inmutable de Usuarios en `.lumina-storage` (`lumina Photuris`).
- **Coleoptera Bridge 🐝**: Broker Enterprise Active Directory / SAML 2.0 & Multicloud Bridge (`lumina Coleoptera`).

---

## 🖼️ Demostración Visual — LUMINA Studio

Accede a la consola web oficial en directo 24/7:  
👉 **[https://amglogicalis.github.io/lumina-repo-public/](https://amglogicalis.github.io/lumina-repo-public/)**

---

## 📦 Instalación y Uso

Instala el paquete unificado globalmente para acceder a la CLI y la Consola Web local desde cualquier directorio:

```bash
npm install -g terra-lumina
```

O ejecútalo directamente usando `npx`:

```bash
npx terra-lumina studio
# o también:
npx lumina studio
```

---

## 🛠️ Referencia Completa de la CLI

| Comando | Descripción |
| :--- | :--- |
| `npx lumina init` | Configura LUMINA en el proyecto y genera `lumina.config.json`. |
| `npx lumina studio` | Abre la consola web local en `http://localhost:3720`. |
| `npx lumina Luciole sign <user_id>` | Genera y firma un JWT de acceso con Luciole. |
| `npx lumina Luciole verify <token>` | Verifica la firma y validez de un token JWT. |
| `npx lumina Luciole jwks` | Muestra la clave pública JWKS en formato JSON. |
| `npx lumina Pyralis eval <action> <res> [role]` | Evalúa permisos estilo AWS IAM sobre recursos Terra o AWS/Supabase. |
| `npx lumina LanternLinks <email>` | Genera un Magic Link OTP sin contraseña. |
| `npx lumina Glowworm <user_id> [motivo]` | Emite credenciales de emergencia de 15 min (Break-Glass admin). |
| `npx lumina Photuris ls` | Lista todos los usuarios registrados en `.lumina-storage`. |
| `npx lumina Photuris create <email> <nombre>` | Crea un nuevo usuario en la bóveda de identidades. |
| `npx lumina Photuris delete <user_id>` | Elimina un usuario de la bóveda. |
| `npx lumina Coleoptera export <provider>` | Exporta identidades a Auth0, Supabase Auth o AWS IAM. |

---

## ⚡ Uso del SDK en Node.js / TypeScript

```typescript
import { Lumina } from 'terra-lumina';

const lumina = new Lumina({
  githubToken: process.env.GITHUB_TOKEN!,
  storageRepo: '.lumina-storage'
});

await lumina.init();

// 1. Crear un usuario en Photuris Vault
const user = await lumina.createUser('adrian@terra.org', 'Adrián', 'admin');

// 2. Firmar un JWT con Luciole
const token = lumina.signToken({ sub: user.id, role: user.role });

// 3. Evaluar política Pyralis IAM sobre un recurso Terra o AWS
const evaluation = lumina.evaluatePolicy('combase:query', 'arn:terra:combase:prod_db/users', user.role);
console.log(evaluation.allowed ? '✅ Permitido' : '❌ Denegado');

// 4. Generar un Magic Link OTP
const magic = lumina.createMagicLink('adrian@terra.org');
console.log(`Magic URL: ${magic.url}`);
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** — Libre para uso personal y comercial.
