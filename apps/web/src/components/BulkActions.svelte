<script lang="ts">
  interface Props {
    selectedIds: string[];
    onClear: () => void;
  }

  let { selectedIds, onClear }: Props = $props();

  let loading = $state(false);

  function getToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function closeAll() {
    loading = true;
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/conversations/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'closed' }),
        }),
      ),
    );
    loading = false;
    window.location.reload();
  }

  async function deleteAll() {
    loading = true;
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/conversations/${id}`, { method: 'DELETE', headers }),
      ),
    );
    loading = false;
    window.location.reload();
  }
</script>

{#if selectedIds.length > 0}
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-lg"
    style="background: var(--color-surface); border-color: var(--color-border);"
  >
    <span class="text-sm font-medium" style="color: var(--color-text-primary);">
      {selectedIds.length} selected
    </span>

    <button
      type="button"
      onclick={closeAll}
      disabled={loading}
      class="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
      style="background: var(--color-accent);"
    >
      {loading ? 'Working…' : 'Close all'}
    </button>

    <button
      type="button"
      onclick={deleteAll}
      disabled={loading}
      class="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
      style="background: var(--color-status-spam);"
    >
      {loading ? 'Working…' : 'Delete all'}
    </button>

    <button
      type="button"
      onclick={onClear}
      disabled={loading}
      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 disabled:opacity-50"
      style="color: var(--color-text-secondary);"
    >
      Clear selection
    </button>
  </div>
{/if}
