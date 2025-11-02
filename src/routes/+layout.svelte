<script lang="ts">
  let { children } = $props();
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

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/">PetalBoard</a>
    <nav class="nav">
      <a href="/create">Create an event</a>
      <a href="/manage-signup">Manage a signup</a>
    </nav>
  </header>

  <main class="content">{@render children()}</main>

  <footer class="footer">
    <p>Built for effortless potlucks and house events.</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(180deg, #f8f5ff 0%, #fdfcff 35%, #f7fcff 100%);
    color: #2a1748;
    min-height: 100vh;
  }

  :global(a) {
    color: inherit;
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem clamp(1rem, 4vw, 3rem);
    backdrop-filter: blur(14px);
    background: rgba(252, 250, 255, 0.85);
    border-bottom: 1px solid rgba(122, 95, 230, 0.12);
  }

  .brand {
    font-family: 'Lexend', 'Inter', sans-serif;
    font-weight: 600;
    font-size: clamp(1.4rem, 2.4vw, 1.85rem);
    text-decoration: none;
    color: #5731a5;
  }

  .nav {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav a {
    text-decoration: none;
    font-weight: 500;
    color: #3e2a75;
  }

  .nav a:hover {
    color: #7c5dfa;
  }

  .content {
    flex: 1;
    width: min(1100px, 100%);
    margin: 0 auto;
    padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 3rem) 4rem;
  }

  .footer {
    text-align: center;
    padding: 2rem 1rem;
    color: rgba(46, 24, 83, 0.7);
    font-size: 0.9rem;
  }

  @media (max-width: 720px) {
    .nav {
      display: none;
    }

    .topbar {
      justify-content: center;
    }
  }
</style>
