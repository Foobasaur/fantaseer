<script lang="ts">
// ── Fill these in ─────────────────────────────────────────────
const lastUpdated = '18-June-2026';
const owner = 'Foobasaur Esquire';
const contactEmail = 'ezexrael@gmail.com';
// Set to false if you do NOT request real Twitch usernames —
// i.e. you only use the default opaque per-extension user ID.
const usesIdentityLinking = true;
// ──────────────────────────────────────────────────────────────
</script>

<svelte:head>
  <title>Fantaseer — Privacy Policy</title>
  <meta name="description" content="Privacy policy for Fantaseer, a Hearthstone fantasy-draft Twitch Extension." />
</svelte:head>

<main class="min-h-screen bg-base-100 px-4 py-12 text-base-content">
  <article class="prose prose-sm sm:prose-base mx-auto max-w-3xl">
    <h1>Fantaseer — Privacy Policy</h1>
    <p class="text-base-content/60"><em>Last updated: {lastUpdated}</em></p>

    <p>
      Fantaseer ("the Extension", "we", "us") is a Twitch Extension that runs Hearthstone fantasy-draft games inside a
      broadcaster's channel. This policy explains what data the Extension processes, why, and what choices you have. It
      applies to viewers who interact with the Extension and to broadcasters who install it.
    </p>

    <h2>Who we are</h2>
    <p>
      Fantaseer is operated by {owner}. For privacy questions or data requests, contact
      <a href="mailto:{contactEmail}">{contactEmail}</a>.
    </p>

    <h2>Data we collect</h2>
    <p>When you interact with Fantaseer, we may process:</p>
    <ul>
      <li>
        <strong>Twitch identifier.</strong> By default the Extension receives an
        <em>opaque</em> Twitch user ID — a pseudonymous identifier scoped to this Extension that does not reveal your account.
        {#if usesIdentityLinking}
          If you grant permission via Twitch's "Identity Linking" prompt, we additionally receive your Twitch user ID and may
          look up your username / display name to show it on leaderboards. Granting is optional, and you can revoke it at any
          time in your Twitch connection settings.
        {/if}
      </li>
      <li>
        <strong>Channel / broadcaster identifier</strong> of the channel where you are using the Extension.
      </li>
      <li>
        <strong>Gameplay data</strong> you generate: fantasy drafts, picks, selections, and related choices.
      </li>
      <li>
        <strong>Interaction and engagement events</strong> within the Extension (e.g. opening it, submitting a pick, viewing results),
        used to run the game and produce leaderboards and summaries.
      </li>
      <li>
        <strong>Game-state data</strong> supplied by the broadcaster's match tracker (e.g. the cards or board state being played),
        used to score the fantasy game. This is broadcaster gameplay data, not viewer personal data.
      </li>
    </ul>
    <p>
      We do <strong>not</strong> collect your email, real name, payment details, or any data beyond what Twitch exposes to the
      Extension and what you submit through gameplay.
    </p>

    <h2>How we use it</h2>
    <p>We use the above only to:</p>
    <ul>
      <li>run fantasy-draft games and score picks,</li>
      <li>display leaderboards, results, and engagement summaries,</li>
      <li>operate, debug, and improve the Extension.</li>
    </ul>
    <p>
      We do <strong>not</strong> sell your data, use it for advertising, or share it with third parties for their own marketing.
    </p>

    <h2>Storage and sub-processors</h2>
    <p>
      Data is stored in a PostgreSQL database hosted on Amazon Web Services (AWS), which acts as our hosting sub-processor.
      Data is transmitted over HTTPS. We retain gameplay and engagement data only as long as needed to operate the game and
      leaderboards; you may request deletion (see below).
    </p>

    <h2>Your choices and rights</h2>
    <ul>
      {#if usesIdentityLinking}
        <li>
          <strong>Identity Linking is optional.</strong> If you have granted it, you can revoke permission at any time via Twitch
          (Settings → Connections), which stops further linkage of your Twitch identity.
        </li>
      {/if}
      <li>
        <strong>Deletion / access.</strong> To request access to, or deletion of, data associated with your Twitch identifier,
        contact
        <a href="mailto:{contactEmail}">{contactEmail}</a>. Because the default identifier is opaque, please contact us from —
        or reference — the relevant Twitch account / channel so we can locate the data.
      </li>
      <li>
        Where applicable law (e.g. GDPR / UK GDPR, CCPA) grants you rights over your personal data, we will honor valid
        requests.
      </li>
    </ul>

    <h2>Local storage</h2>
    <p>
      The Extension may store small amounts of state in your browser (e.g. UI preferences or session data) so it functions
      correctly. This stays on your device.
    </p>

    <h2>Children</h2>
    <p>
      Fantaseer is not directed at children under 13, consistent with Twitch's Terms of Service. We do not knowingly collect
      data from anyone under 13.
    </p>

    <h2>Third-party services</h2>
    <p>
      The Extension runs inside Twitch and depends on the Twitch platform. Your use of Twitch is governed by Twitch's own
      Privacy Notice and Terms, which we do not control.
    </p>

    <h2>Changes</h2>
    <p>
      We may update this policy; material changes will be reflected by the "Last updated" date above. Continued use after an
      update constitutes acceptance.
    </p>

    <h2>Contact</h2>
    <p>{owner} — <a href="mailto:{contactEmail}">{contactEmail}</a></p>
  </article>
</main>
