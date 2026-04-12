const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the full checkout form.
 * Returns { valid: boolean, buyerErrors: {}, attendeeErrors: [{},…], termsErrors: {}, firstErrorMessage: string|null }
 */
export function validateCheckout({
  buyer,
  attendees,
  sendAllToBuyer,
  customFields,
  waiverText,
  waiverAccepted,
  termsText,
  termsAccepted,
}) {
  const buyerErrors = {};
  const attendeeErrors = attendees.map(() => ({}));
  const termsErrors = {};
  const messages = [];

  // --- Buyer validation ---
  if (!buyer.first_name?.trim()) {
    buyerErrors.first_name = 'First name is required';
    messages.push('Please enter your first name.');
  }
  if (!buyer.last_name?.trim()) {
    buyerErrors.last_name = 'Last name is required';
    messages.push('Please enter your last name.');
  }
  if (!buyer.email?.trim()) {
    buyerErrors.email = 'Email is required';
    messages.push('Please enter your email.');
  } else if (!EMAIL_RE.test(buyer.email)) {
    buyerErrors.email = 'Enter a valid email address';
    messages.push('Please enter a valid email address.');
  }

  // --- Attendee validation ---
  const seenAttendees = new Map(); // "email|mode" -> index

  for (let i = 0; i < attendees.length; i++) {
    const a = attendees[i];
    const errs = attendeeErrors[i];

    if (!a.first_name?.trim()) {
      errs.first_name = 'Required';
      errs._hasErrors = true;
      if (!messages.length) messages.push(`Please fill in the name for Ticket ${i + 1}.`);
    }
    if (!a.last_name?.trim()) {
      errs.last_name = 'Required';
      errs._hasErrors = true;
      if (!messages.length) messages.push(`Please fill in the name for Ticket ${i + 1}.`);
    }

    const needsEmail = !sendAllToBuyer || i === 0;
    const email = (a.email || '').trim().toLowerCase();

    if (needsEmail) {
      if (!email) {
        errs.email = 'Email is required';
        errs._hasErrors = true;
        if (!messages.length) messages.push(`Please enter an email for Ticket ${i + 1}.`);
      } else if (!EMAIL_RE.test(email)) {
        errs.email = 'Enter a valid email';
        errs._hasErrors = true;
        if (!messages.length) messages.push(`Please enter a valid email for Ticket ${i + 1}.`);
      }
    }

    // Duplicate detection: same email + same attendance mode = likely duplicate
    if (email) {
      const key = `${email}|${a.attendance_mode}`;
      if (seenAttendees.has(key)) {
        const prevIdx = seenAttendees.get(key);
        errs._duplicate = `Same email & mode as Ticket ${prevIdx + 1}. Each attendee needs a unique email per attendance mode.`;
        errs._hasErrors = true;
        if (!messages.length) messages.push(`Duplicate attendee detected for Ticket ${i + 1}.`);
      } else {
        seenAttendees.set(key, i);
      }
    }

    // Custom field validation
    for (const field of customFields) {
      if (field._required) {
        const val = a.custom_fields?.[field.field_key];
        if (!val || (typeof val === 'string' && !val.trim())) {
          errs[`cf_${field.field_key}`] = `${field.label} is required`;
          errs._hasErrors = true;
          if (!messages.length) messages.push(`Please fill in "${field.label}" for Ticket ${i + 1}.`);
        }
      }
      // Email custom field validation
      if (field.field_type === 'email') {
        const val = a.custom_fields?.[field.field_key];
        if (val && !EMAIL_RE.test(val)) {
          errs[`cf_${field.field_key}`] = 'Enter a valid email';
          errs._hasErrors = true;
        }
      }
    }
  }

  // --- Terms validation ---
  if (waiverText && !waiverAccepted) {
    termsErrors.waiver = 'You must accept the waiver to continue.';
    messages.push('Please accept the participant waiver.');
  }
  if (termsText && !termsAccepted) {
    termsErrors.terms = 'You must agree to the terms & conditions.';
    messages.push('Please agree to the terms & conditions.');
  }

  const valid = Object.keys(buyerErrors).length === 0
    && attendeeErrors.every(e => !e._hasErrors)
    && Object.keys(termsErrors).length === 0;

  return {
    valid,
    buyerErrors,
    attendeeErrors,
    termsErrors,
    firstErrorMessage: messages[0] || null,
  };
}