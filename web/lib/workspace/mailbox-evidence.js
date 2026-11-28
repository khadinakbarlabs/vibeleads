export const ROLE_LOCALS = new Set(['info', 'contact', 'hello', 'hi', 'office', 'admin', 'sales', 'support', 'enquiries', 'inquiries', 'booking', 'bookings', 'reservations', 'service', 'team', 'mail', 'help', 'manager', 'accounts', 'billing', 'orders', 'reception', 'frontdesk']);

export function emailEvidence(lead) {
  const address = lead.workEmail || lead.email;
  if (!address) return { emailStatus: 'none' };
  const raw = String(
    lead.providerEmailStatus || lead.emailStatus || '',
  ).toLowerCase();
  const shared = lead.emailStatus === 'shared-inbox' || ROLE_LOCALS.has(
    address.trim().toLowerCase().split('@')[0].split('+')[0],
  );
  const invalid = [
    'invalid',
    'bad',
    'undeliverable',
    'disposable',
    'spamtrap',
    'abuse',
    'do_not_mail',
  ];
  const bad = invalid.includes(raw) || invalid.includes(String(lead.emailStatus || '').toLowerCase());
  const deliverable = [
    'valid',
    'verified',
    'deliverable',
    'ok',
    'safe',
  ].includes(raw);
  const emailStatus = bad
    ? 'bad'
    : shared || raw === 'shared-inbox'
      ? 'shared-inbox'
      : deliverable
        ? 'verified'
        : 'unconfirmed';
  return {
    email: address,
    emailStatus,
    emailDeliverability: bad
      ? 'undeliverable'
      : deliverable
        ? 'deliverable'
        : 'unknown',
    mailboxType: shared || raw === 'shared-inbox' ? 'shared' : 'unknown',
    emailOwnership: 'unverified',
    ...(raw && { providerEmailStatus: raw }),
    ...(lead.sourceUrl && { emailSourceContextUrl: lead.sourceUrl }),
  };
}
