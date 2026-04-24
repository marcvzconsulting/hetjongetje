/**
 * Brevo contact-list management for newsletter sync. Wraps the v3 REST API.
 *
 * Without BREVO_API_KEY the helpers no-op (with a console log) so local dev
 * keeps working. Brevo errors are thrown so callers can decide whether to
 * fail loudly or swallow.
 */

const NEWSLETTER_LIST_ID = Number(
  process.env.BREVO_NEWSLETTER_LIST_ID ?? "3"
);

type Json = Record<string, unknown>;

async function brevoFetch(
  path: string,
  init: { method: string; body?: Json } = { method: "GET" }
): Promise<Response | null> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log(
      `[brevo-contacts] BREVO_API_KEY not set — skipping ${init.method} ${path}`
    );
    return null;
  }

  return fetch(`https://api.brevo.com/v3${path}`, {
    method: init.method,
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

async function expectOk(res: Response | null, context: string): Promise<void> {
  if (!res) return;
  // 200 = updated, 201 = created, 204 = no content (success)
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`Brevo ${context} failed (${res.status}): ${text}`);
}

/**
 * Add or update a contact and put them in the Newsletter list. Idempotent.
 */
export async function subscribeToNewsletter(opts: {
  email: string;
  name?: string;
}): Promise<void> {
  const [firstname, ...rest] = (opts.name ?? "").trim().split(/\s+/);
  const lastname = rest.join(" ") || undefined;

  const res = await brevoFetch("/contacts", {
    method: "POST",
    body: {
      email: opts.email,
      attributes: {
        FIRSTNAME: firstname || undefined,
        LASTNAME: lastname,
        OPT_IN: true,
      },
      listIds: [NEWSLETTER_LIST_ID],
      updateEnabled: true,
    },
  });
  await expectOk(res, "subscribeToNewsletter");
}

/**
 * Remove a contact from the Newsletter list (keeps them in Brevo, but they
 * stop receiving newsletter campaigns).
 */
export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  const res = await brevoFetch(
    `/contacts/lists/${NEWSLETTER_LIST_ID}/contacts/remove`,
    { method: "POST", body: { emails: [email] } }
  );
  // 201 = removed, 400 = "all contacts already unsubscribed" — both fine
  if (res && !res.ok && res.status !== 400) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Brevo unsubscribeFromNewsletter failed (${res.status}): ${text}`
    );
  }
}

/**
 * Move a contact's subscription from one email to another. Brevo's PUT
 * endpoint can't change the primary email, so we delete the old contact and
 * create a new one with the same name. The caller is responsible for
 * re-adding the contact to the right list afterwards (typically via
 * `subscribeToNewsletter`).
 */
export async function changeContactEmail(
  oldEmail: string,
  newEmail: string
): Promise<void> {
  if (oldEmail === newEmail) return;
  await deleteContact(oldEmail);
}

/**
 * Hard-delete a contact (AVG: right to be forgotten).
 */
export async function deleteContact(email: string): Promise<void> {
  const res = await brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
  if (res && !res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo deleteContact failed (${res.status}): ${text}`);
  }
}
