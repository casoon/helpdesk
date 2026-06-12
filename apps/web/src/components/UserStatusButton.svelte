<script lang="ts">
  interface Props {
    userId: string;
    currentStatus: string;
  }

  let { userId, currentStatus }: Props = $props();

  let loading = $state(false);

  function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function handleToggle() {
    loading = true;
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const token = getCookie('token');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert(err.error ?? 'Failed to update user status');
      }
    } catch {
      alert('Network error');
    } finally {
      loading = false;
    }
  }
</script>

<button
  onclick={handleToggle}
  disabled={loading}
  class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
  style="color: var(--color-text-secondary); border: 1px solid var(--color-border);"
>
  {loading ? '…' : currentStatus === 'active' ? 'Disable' : 'Enable'}
</button>
