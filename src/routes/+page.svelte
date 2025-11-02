<section class="hero">
  <div class="hero-copy">
    <h1>Signup lists your guests will actually love using.</h1>
    <p>
      PetalBoard helps hosts collect potluck items, organize house events, and keep guests in the
      loop without requiring accounts.
    </p>
    <div class="cta-row">
      <a class="cta" href="/create">Create an event</a>
      <a class="secondary" href="/manage-signup">Manage a signup</a>
    </div>
  </div>
  <div class="hero-card">
    <p class="card-title">Instant overview</p>
    <ul>
      <li>Track remaining slots in real time</li>
      <li>Share public and manage links with one click</li>
      <li>Secure edits with a PIN instead of passwords</li>
    </ul>
  </div>
</section>

<section class="features">
  <article>
    <h2>Organizers</h2>
    <p>Create an event, add slots, and share the link—done.</p>
    <ul>
      <li>Edit event details any time</li>
      <li>Prevent overbooking with server-side checks</li>
      <li>Print an attendee list in a couple taps</li>
    </ul>
  </article>
  <article>
    <h2>Guests</h2>
    <p>No accounts. Just pick a slot, add your name, and choose a PIN.</p>
    <ul>
      <li>Mobile-first sign up experience</li>
      <li>Make changes later with your signup ID</li>
      <li>Automatic email reminders (coming soon)</li>
    </ul>
  </article>
  <article>
    <h2>Built for real life</h2>
    <p>All data stays private to your event. No ads, no dark patterns.</p>
    <ul>
      <li>SQLite by default, Postgres-ready for production</li>
      <li>Scrypt hashed PINs for secure edit links</li>
      <li>Open source and ready to self-host</li>
    </ul>
  </article>
</section>

<section class="flow">
  <div>
    <h2>How it works</h2>
    <ol>
      <li>Create an event and add the items you need.</li>
      <li>Share the public link with your guests.</li>
      <li>Guests reserve their slot and lock it with a PIN.</li>
      <li>They can edit or cancel later with their signup ID.</li>
    </ol>
  </div>
  <div class="callout">
    <h3>Ready to go?</h3>
    <p>PetalBoard can be deployed in a couple commands. Start with SQLite today and upgrade later.</p>
    <a class="cta" href="/create">Launch your event</a>
  </div>
</section>

<style>
  .hero {
    display: grid;
    gap: 3rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    align-items: center;
  }

  .hero-copy h1 {
    font-size: clamp(2.6rem, 5vw, 3.6rem);
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }

  .hero-copy p {
    font-size: 1.1rem;
    max-width: 38ch;
    color: rgba(42, 23, 72, 0.8);
  }

  .cta-row {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    flex-wrap: wrap;
  }

  .cta,
  .secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.85rem 1.75rem;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .cta {
    background: linear-gradient(135deg, #7c5dfa, #9b6bff);
    color: white;
    box-shadow: 0 18px 30px rgba(95, 61, 170, 0.25);
  }

  .secondary {
    background: rgba(124, 93, 250, 0.12);
    color: #5533a5;
  }

  .cta:hover,
  .secondary:hover {
    transform: translateY(-2px);
  }

  .hero-card {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 25px 40px rgba(66, 32, 121, 0.12);
  }

  .hero-card .card-title {
    font-weight: 600;
    color: #5533a5;
    margin-bottom: 1rem;
  }

  .hero-card ul,
  .features ul,
  .flow ol {
    padding-left: 1.2rem;
    display: grid;
    gap: 0.5rem;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-top: 4rem;
  }

  .features article {
    background: white;
    border-radius: 18px;
    padding: 2rem;
    box-shadow: 0 18px 32px rgba(66, 32, 121, 0.08);
  }

  .features h2 {
    margin-top: 0;
  }

  .flow {
    margin-top: 5rem;
    display: grid;
    gap: 2rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .callout {
    background: linear-gradient(135deg, rgba(124, 93, 250, 0.12), rgba(155, 107, 255, 0.18));
    border-radius: 20px;
    padding: 2.5rem;
  }

  .callout h3 {
    margin-top: 0;
  }
</style>
