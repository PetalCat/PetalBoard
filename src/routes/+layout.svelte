<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';

  let { children, data } = $props<{ children: any; data: LayoutData }>();
  const user = $derived(data.user);
  let mobileNavOpen = $state(false);

  function closeMobileNav() {
    mobileNavOpen = false;
  }

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('no-scroll', mobileNavOpen);
  });
</script>

<svelte:head>
  <title>PetalBoard</title>
  <meta
    name="description"
    content="Create polished potluck and house event signups without forcing guests to make accounts."
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="flex flex-col min-h-screen">
  <header class="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:px-12 backdrop-blur-[14px] bg-[rgba(252,250,255,0.92)] border-b border-[rgba(122,95,230,0.12)]">
    <a class="font-brand font-bold text-2xl lg:text-[1.85rem] no-underline text-dark-600 flex items-center gap-2" href="/" onclick={closeMobileNav}>
      <span class="text-3xl lg:text-4xl">🌸</span>
      <span>PetalBoard</span>
    </a>

    <div class="flex items-center gap-3 md:hidden">
      {#if user}
        <a href="/create" class="btn-secondary px-4 py-2 rounded-2xl text-sm font-semibold" onclick={closeMobileNav}>
          New Event
        </a>
      {/if}
      <button
        class="mobile-nav-toggle"
        type="button"
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
        onclick={() => (mobileNavOpen = !mobileNavOpen)}
      >
        <span class:open={mobileNavOpen}></span>
        <span class:open={mobileNavOpen}></span>
        <span class:open={mobileNavOpen}></span>
      </button>
    </div>

    <nav class="hidden md:flex gap-6 items-center">
      {#if user}
        <a href="/dashboard" class="no-underline font-medium text-dark-700 hover:text-primary-700">Dashboard</a>
        <a href="/create" class="no-underline font-medium text-dark-700 hover:text-primary-700">Create Event</a>
        <a href="/settings" class="no-underline font-medium text-dark-700 hover:text-primary-700">Settings</a>
        <span class="text-dark-700/70 text-sm">{user.email}</span>
        <form method="POST" action="/logout" class="inline">
          <button type="submit" class="bg-transparent border-none text-dark-700 font-inherit font-medium cursor-pointer p-0 hover:text-primary-700">Log out</button>
        </form>
      {:else}
        <a href="/login" class="no-underline font-medium text-dark-700 hover:text-primary-700">Log in</a>
        <a href="/register" class="no-underline font-medium text-dark-700 hover:text-primary-700">Register</a>
      {/if}
    </nav>
  </header>

  {#if mobileNavOpen}
    <div class="mobile-nav-overlay" onclick={closeMobileNav}></div>
  {/if}

  <aside class:hidden={!mobileNavOpen} class="mobile-nav-panel">
    <nav class="flex flex-col gap-3">
      {#if user}
        <a href="/dashboard" class="mobile-nav-link" onclick={closeMobileNav}>Dashboard</a>
        <a href="/create" class="mobile-nav-link" onclick={closeMobileNav}>Create Event</a>
        <a href="/settings" class="mobile-nav-link" onclick={closeMobileNav}>Settings</a>
        <div class="mobile-nav-meta">
          <span>{user.email}</span>
          <form method="POST" action="/logout">
            <button type="submit" class="mobile-nav-link text-left w-full" onclick={closeMobileNav}>Log out</button>
          </form>
        </div>
      {:else}
        <a href="/login" class="mobile-nav-link" onclick={closeMobileNav}>Log in</a>
        <a href="/register" class="mobile-nav-link" onclick={closeMobileNav}>Register</a>
      {/if}
    </nav>
  </aside>

  <main class="flex-1 w-full max-w-[1100px] mx-auto px-4 pt-6 pb-20 lg:px-12 lg:py-12">{@render children()}</main>

  <footer class="text-center py-8 px-4 text-[rgba(46,24,83,0.7)] text-sm">
    <p>Built for effortless potlucks and house events.</p>
  </footer>
</div>
