<script lang="ts">
  import type { ActionData } from './$types';

  const { form } = $props<{ form: ActionData | null }>();
  const errors = $derived<Record<string, string[]>>((form?.errors ?? {}) as Record<string, string[]>);
  const values = $derived<Record<string, string>>((form?.values ?? {}) as Record<string, string>);
  const message = $derived<string | null>(form?.message ?? null);
  const createdEvent = $derived(form?.success ? form.event : null);
</script>

<h1>Create an event</h1>
<p class="lead">
  Set up your potluck or house event, then share the public link with your guests. You can always
  come back to update slots or details from the manage link.
</p>

{#if createdEvent}
  <section class="success">
    <h2>{createdEvent.title} is ready!</h2>
    <p class="hint">Save these links—they won't be shown again.</p>
    <div class="links">
      <div>
        <p class="label">Public link</p>
        <a href={createdEvent.publicUrl}>{createdEvent.publicUrl}</a>
      </div>
      <div>
        <p class="label">Manage link</p>
        <a href={createdEvent.manageUrl}>{createdEvent.manageUrl}</a>
      </div>
    </div>
  </section>
{/if}

{#if message}
  <p class="error-banner">{message}</p>
{/if}

<form method="POST" class="form-card">
  <label>
    <span>Event title</span>
    <input name="title" required value={values.title ?? ''} />
    {#if errors.title}
      <small>{errors.title[0]}</small>
    {/if}
  </label>

  <label>
    <span>Date &amp; time</span>
    <input type="datetime-local" name="date" required value={values.date ?? ''} />
    {#if errors.date}
      <small>{errors.date[0]}</small>
    {/if}
  </label>

  <label>
    <span>Location</span>
    <input
      name="location"
      placeholder="123 Market Street, or &quot;Online&quot;"
      value={values.location ?? ''}
    />
    {#if errors.location}
      <small>{errors.location[0]}</small>
    {/if}
  </label>

  <label>
    <span>Description</span>
    <textarea name="description" rows="4">{values.description ?? ''}</textarea>
    {#if errors.description}
      <small>{errors.description[0]}</small>
    {/if}
  </label>

  <button type="submit">Create event</button>
</form>

<style>
  h1 {
    margin-bottom: 0.5rem;
  }

  .lead {
    color: rgba(42, 23, 72, 0.75);
    max-width: 60ch;
    margin-bottom: 2rem;
  }

  .form-card {
    display: grid;
    gap: 1.5rem;
    background: white;
    padding: clamp(1.5rem, 4vw, 2.5rem);
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(60, 35, 110, 0.08);
    max-width: 620px;
  }

  label {
    display: grid;
    gap: 0.5rem;
    font-weight: 500;
    color: #40246b;
  }

  input,
  textarea {
    border-radius: 12px;
    border: 1px solid rgba(123, 95, 250, 0.25);
    padding: 0.75rem 1rem;
    font: inherit;
    background: rgba(255, 255, 255, 0.9);
  }

  textarea {
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #7c5dfa;
    box-shadow: 0 0 0 3px rgba(124, 93, 250, 0.18);
  }

  button {
    justify-self: start;
    padding: 0.85rem 1.75rem;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #7c5dfa, #9b6bff);
    color: white;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 18px 30px rgba(95, 61, 170, 0.25);
  }

  button:hover {
    transform: translateY(-1px);
  }

  small {
    color: #c23b4b;
  }

  .error-banner {
    background: rgba(194, 59, 75, 0.12);
    border-radius: 16px;
    padding: 0.75rem 1rem;
    color: #781728;
    max-width: 620px;
    margin-bottom: 1.5rem;
  }

  .success {
    background: rgba(120, 94, 245, 0.12);
    border-radius: 20px;
    padding: 1.75rem;
    margin-bottom: 2rem;
    max-width: 620px;
  }

  .success .links {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }

  .success a {
    color: #5533a5;
    word-break: break-all;
  }

  .success .label {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .hint {
    color: rgba(42, 23, 72, 0.7);
  }
</style>
