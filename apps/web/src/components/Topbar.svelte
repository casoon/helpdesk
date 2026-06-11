<script lang="ts">
  import type { User } from '@casoon/helpdesk-types';

  interface Props {
    user: Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>;
    title?: string;
  }

  let { user, title }: Props = $props();

  function initials(u: typeof user) {
    return (u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '');
  }
</script>

<header
  class="flex shrink-0 items-center gap-3 border-b px-4"
  style="height: var(--topbar-height); background: var(--color-surface); border-color: var(--color-border);"
>
  <!-- Search -->
  <div class="flex flex-1 items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
    style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text-tertiary); max-width: 400px;">
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
    <span>Search conversations…</span>
    <kbd class="ml-auto rounded px-1 text-xs" style="background: var(--color-border); color: var(--color-text-tertiary);">⌘K</kbd>
  </div>

  <div class="ml-auto flex items-center gap-2">
    <!-- Notifications -->
    <button
      class="rounded-md p-1.5 transition-colors hover:bg-gray-100"
      style="color: var(--color-text-secondary);"
      aria-label="Notifications"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    </button>

    <!-- Avatar / user menu -->
    <button
      class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
      style="background: var(--color-accent);"
      aria-label="User menu"
    >
      {#if user.avatarUrl}
        <img src={user.avatarUrl} alt="" class="h-7 w-7 rounded-full object-cover" />
      {:else}
        {initials(user)}
      {/if}
    </button>
  </div>
</header>
