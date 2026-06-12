<script lang="ts">
  import type { Mailbox, Folder } from '@casoon/helpdesk-types';

  interface Props {
    mailboxes: Mailbox[];
    folders: Folder[];
    activeMailboxId?: string;
    activeFolderType?: string;
    activeSection?: string;
  }

  let { mailboxes, folders, activeMailboxId, activeFolderType, activeSection = 'conversations' }: Props = $props();

  const folderIcons: Record<string, string> = {
    unassigned: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.151 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />`,
    mine: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />`,
    assigned: `<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />`,
    drafts: `<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />`,
    starred: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />`,
    closed: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
    spam: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />`,
    deleted: `<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />`,
  };

  const folderLabels: Record<string, string> = {
    unassigned: 'Unassigned',
    mine: 'Mine',
    assigned: 'All Assigned',
    drafts: 'Drafts',
    starred: 'Starred',
    closed: 'Closed',
    spam: 'Spam',
    deleted: 'Deleted',
  };

  // Only show folders with content or that are always visible
  const primaryFolders = ['unassigned', 'mine', 'assigned', 'drafts'];
  const secondaryFolders = ['starred', 'closed', 'spam', 'deleted'];

  function getFolderCount(type: string) {
    return folders.find(f => f.type === type)?.activeCount ?? 0;
  }
</script>

<aside
  class="flex h-full flex-col border-r"
  style="width: var(--sidebar-width); background: var(--color-surface); border-color: var(--color-border);"
>
  <!-- Mailbox selector -->
  <div class="px-3 py-3 border-b" style="border-color: var(--color-border);">
    <button
      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
      style="color: var(--color-text-primary);"
    >
      <span
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
        style="background: var(--color-accent);"
      >H</span>
      <span class="truncate">Helpdesk</span>
      <svg class="ml-auto h-3.5 w-3.5 shrink-0" style="color: var(--color-text-tertiary);" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    </button>
  </div>

  <!-- Nav -->
  <nav class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
    {primaryFolders.map(type => {
      const count = getFolderCount(type);
      const isActive = activeFolderType === type;
      return (
        <a
          href={`/conversations?folder=${type}`}
          class={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isActive
              ? 'font-medium'
              : 'font-normal hover:bg-gray-50'
          }`}
          style={isActive
            ? `background: var(--color-accent-subtle); color: var(--color-accent-text);`
            : `color: var(--color-text-secondary);`}
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            {@html folderIcons[type] ?? ''}
          </svg>
          <span class="truncate">{folderLabels[type]}</span>
          {count > 0 && (
            <span
              class="ml-auto text-xs font-medium tabular-nums"
              style={isActive ? `color: var(--color-accent-text);` : `color: var(--color-text-tertiary);`}
            >{count}</span>
          )}
        </a>
      );
    })}

    <div class="my-1 mx-2 border-t" style="border-color: var(--color-border);"></div>

    {secondaryFolders.map(type => {
      const count = getFolderCount(type);
      if (count === 0 && type !== 'closed') return null;
      const isActive = activeFolderType === type;
      return (
        <a
          href={`/conversations?folder=${type}`}
          class={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isActive ? 'font-medium' : 'font-normal hover:bg-gray-50'
          }`}
          style={isActive
            ? `background: var(--color-accent-subtle); color: var(--color-accent-text);`
            : `color: var(--color-text-secondary);`}
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            {@html folderIcons[type] ?? ''}
          </svg>
          <span class="truncate">{folderLabels[type]}</span>
          {count > 0 && (
            <span class="ml-auto text-xs tabular-nums" style="color: var(--color-text-tertiary);">{count}</span>
          )}
        </a>
      );
    })}
  </nav>

  <!-- Bottom: settings + new conversation -->
  <div class="border-t p-3 space-y-2" style="border-color: var(--color-border);">
    <a
      href="/settings/mailboxes"
      class={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        activeSection === 'settings'
          ? 'font-medium'
          : 'font-normal hover:bg-gray-50'
      }`}
      style={activeSection === 'settings'
        ? 'background: var(--color-accent-subtle); color: var(--color-accent-text);'
        : 'color: var(--color-text-secondary);'}
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
      Settings
    </a>
    <a
      href="/conversations/new"
      class="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
      style="background: var(--color-accent);"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      New Conversation
    </a>
  </div>
</aside>
