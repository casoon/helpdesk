<script lang="ts">
  interface MailboxData {
    id?: string;
    name?: string;
    email?: string;
    outServer?: string | null;
    outPort?: number | null;
    outUsername?: string | null;
    outEncryption?: string | null;
    inServer?: string | null;
    inPort?: number | null;
    inUsername?: string | null;
    inEncryption?: string | null;
    autoReplyEnabled?: boolean;
  }

  interface Props {
    mode: 'create' | 'edit';
    mailbox?: MailboxData;
  }

  let { mode, mailbox = {} }: Props = $props();

  let name = $state(mailbox.name ?? '');
  let email = $state(mailbox.email ?? '');
  let outServer = $state(mailbox.outServer ?? '');
  let outPort = $state(mailbox.outPort?.toString() ?? '');
  let outEncryption = $state(mailbox.outEncryption ?? 'none');
  let outUsername = $state(mailbox.outUsername ?? '');
  let outPassword = $state('');
  let inServer = $state(mailbox.inServer ?? '');
  let inPort = $state(mailbox.inPort?.toString() ?? '993');
  let inEncryption = $state(mailbox.inEncryption ?? 'ssl');
  let inUsername = $state(mailbox.inUsername ?? '');
  let inPassword = $state('');
  let autoReplyEnabled = $state(mailbox.autoReplyEnabled ?? false);

  let saving = $state(false);
  let saveError = $state('');
  let imapResult = $state('');
  let smtpResult = $state('');
  let testingImap = $state(false);
  let testingSmtp = $state(false);

  function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    saveError = '';

    const token = getCookie('token');
    const body: Record<string, unknown> = {
      name,
      email,
      outServer: outServer || null,
      outPort: outPort ? Number(outPort) : null,
      outEncryption: outEncryption || null,
      outUsername: outUsername || null,
      inServer: inServer || null,
      inPort: inPort ? Number(inPort) : null,
      inEncryption: inEncryption || null,
      inUsername: inUsername || null,
      autoReplyEnabled,
    };

    if (outPassword) body.outPassword = outPassword;
    if (inPassword) body.inPassword = inPassword;

    const url = mode === 'edit' ? `/api/mailboxes/${mailbox.id}` : '/api/mailboxes';
    const method = mode === 'edit' ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        window.location.href = '/settings/mailboxes';
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        saveError = err.error ?? 'Failed to save mailbox';
      }
    } catch (err) {
      saveError = 'Network error';
    } finally {
      saving = false;
    }
  }

  async function testImap() {
    testingImap = true;
    imapResult = '';
    const token = getCookie('token');
    try {
      const res = await fetch(`/api/mailboxes/${mailbox.id}/test-imap`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      imapResult = res.ok ? 'ok' : (data.error ?? 'error');
    } catch {
      imapResult = 'Network error';
    } finally {
      testingImap = false;
    }
  }

  async function testSmtp() {
    testingSmtp = true;
    smtpResult = '';
    const token = getCookie('token');
    try {
      const res = await fetch(`/api/mailboxes/${mailbox.id}/test-smtp`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      smtpResult = res.ok ? 'ok' : (data.error ?? 'error');
    } catch {
      smtpResult = 'Network error';
    } finally {
      testingSmtp = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-8 max-w-2xl">

  <!-- General -->
  <section>
    <h2 class="text-sm font-semibold pb-2 mb-4 border-b" style="color: var(--color-text-primary); border-color: var(--color-border);">General</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="mb-name">Name</label>
        <input
          id="mb-name"
          type="text"
          bind:value={name}
          required
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="mb-email">Email address</label>
        <input
          id="mb-email"
          type="email"
          bind:value={email}
          required
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
    </div>
  </section>

  <!-- Outbound (SMTP) -->
  <section>
    <h2 class="text-sm font-semibold pb-2 mb-4 border-b" style="color: var(--color-text-primary); border-color: var(--color-border);">Outbound (SMTP)</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="out-server">Server</label>
        <input
          id="out-server"
          type="text"
          bind:value={outServer}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="out-port">Port</label>
        <input
          id="out-port"
          type="number"
          bind:value={outPort}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="out-encryption">Encryption</label>
        <select
          id="out-encryption"
          bind:value={outEncryption}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        >
          <option value="none">None</option>
          <option value="ssl">SSL</option>
          <option value="tls">TLS</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="out-username">Username</label>
        <input
          id="out-username"
          type="text"
          bind:value={outUsername}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="out-password">Password</label>
        <input
          id="out-password"
          type="password"
          bind:value={outPassword}
          placeholder={mode === 'edit' ? 'Leave blank to keep' : ''}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
    </div>
  </section>

  <!-- Inbound (IMAP) -->
  <section>
    <h2 class="text-sm font-semibold pb-2 mb-4 border-b" style="color: var(--color-text-primary); border-color: var(--color-border);">Inbound (IMAP)</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="in-server">Server</label>
        <input
          id="in-server"
          type="text"
          bind:value={inServer}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="in-port">Port</label>
        <input
          id="in-port"
          type="number"
          bind:value={inPort}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="in-encryption">Encryption</label>
        <select
          id="in-encryption"
          bind:value={inEncryption}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        >
          <option value="none">None</option>
          <option value="ssl">SSL</option>
          <option value="tls">TLS</option>
          <option value="starttls">STARTTLS</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="in-username">Username</label>
        <input
          id="in-username"
          type="text"
          bind:value={inUsername}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="in-password">Password</label>
        <input
          id="in-password"
          type="password"
          bind:value={inPassword}
          placeholder={mode === 'edit' ? 'Leave blank to keep' : ''}
          class="border rounded-md px-3 py-2 text-sm w-full"
          style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
        />
      </div>
    </div>
  </section>

  <!-- Test buttons (edit only) -->
  {#if mode === 'edit'}
  <section>
    <h2 class="text-sm font-semibold pb-2 mb-4 border-b" style="color: var(--color-text-primary); border-color: var(--color-border);">Connection Test</h2>
    <div class="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onclick={testImap}
        disabled={testingImap}
        class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
        style="border-color: var(--color-border); color: var(--color-text-secondary);"
      >
        {testingImap ? 'Testing…' : 'Test IMAP'}
      </button>
      {#if imapResult}
        <span class="text-sm font-medium" style={imapResult === 'ok' ? 'color: #16a34a;' : 'color: var(--color-danger);'}>
          {imapResult === 'ok' ? 'IMAP OK' : `IMAP error: ${imapResult}`}
        </span>
      {/if}
      <button
        type="button"
        onclick={testSmtp}
        disabled={testingSmtp}
        class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
        style="border-color: var(--color-border); color: var(--color-text-secondary);"
      >
        {testingSmtp ? 'Testing…' : 'Test SMTP'}
      </button>
      {#if smtpResult}
        <span class="text-sm font-medium" style={smtpResult === 'ok' ? 'color: #16a34a;' : 'color: var(--color-danger);'}>
          {smtpResult === 'ok' ? 'SMTP OK' : `SMTP error: ${smtpResult}`}
        </span>
      {/if}
    </div>
  </section>
  {/if}

  <!-- Save -->
  <div class="flex items-center gap-3">
    <button
      type="submit"
      disabled={saving}
      class="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
      style="background: var(--color-accent);"
    >
      {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create mailbox'}
    </button>
    <a
      href="/settings/mailboxes"
      class="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
      style="color: var(--color-text-secondary);"
    >Cancel</a>
    {#if saveError}
      <span class="text-sm" style="color: var(--color-danger);">{saveError}</span>
    {/if}
  </div>

</form>
