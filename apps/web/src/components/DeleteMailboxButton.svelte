<script lang="ts">
  interface Props {
    mailboxId: string;
  }

  let { mailboxId }: Props = $props();

  function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this mailbox? This cannot be undone.')) return;
    const token = getCookie('token');
    const res = await fetch(`/api/mailboxes/${mailboxId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      alert(err.error ?? 'Failed to delete mailbox');
    }
  }
</script>

<button
  onclick={handleDelete}
  class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-red-50"
  style="color: var(--color-danger);"
>
  Delete
</button>
