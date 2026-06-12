<script lang="ts">
  interface Props {
    visible: boolean;
  }

  let { visible }: Props = $props();

  let firstName = $state('');
  let email = $state('');
  let password = $state('');
  let role = $state('agent');
  let saving = $state(false);
  let error = $state('');

  function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    error = '';
    const token = getCookie('token');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstName, email, password, role }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        error = err.error ?? 'Failed to create user';
      }
    } catch {
      error = 'Network error';
    } finally {
      saving = false;
    }
  }
</script>

{#if visible}
<div
  class="rounded-lg border p-4 mb-4"
  style="border-color: var(--color-border); background: var(--color-surface);"
>
  <h3 class="text-sm font-semibold mb-4" style="color: var(--color-text-primary);">Add User</h3>
  <form onsubmit={handleSubmit} class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="au-firstname">First name</label>
      <input
        id="au-firstname"
        type="text"
        bind:value={firstName}
        required
        class="border rounded-md px-3 py-2 text-sm w-full"
        style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-bg);"
      />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="au-email">Email</label>
      <input
        id="au-email"
        type="email"
        bind:value={email}
        required
        class="border rounded-md px-3 py-2 text-sm w-full"
        style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-bg);"
      />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="au-password">Password</label>
      <input
        id="au-password"
        type="password"
        bind:value={password}
        required
        class="border rounded-md px-3 py-2 text-sm w-full"
        style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-bg);"
      />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);" for="au-role">Role</label>
      <select
        id="au-role"
        bind:value={role}
        class="border rounded-md px-3 py-2 text-sm w-full"
        style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-bg);"
      >
        <option value="agent">Agent</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div class="sm:col-span-2 flex items-center gap-3">
      <button
        type="submit"
        disabled={saving}
        class="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        style="background: var(--color-accent);"
      >
        {saving ? 'Creating…' : 'Create user'}
      </button>
      {#if error}
        <span class="text-sm" style="color: var(--color-danger);">{error}</span>
      {/if}
    </div>
  </form>
</div>
{/if}
