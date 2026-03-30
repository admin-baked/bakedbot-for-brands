export const VISITOR_CHECKIN_STAFF_TRAINING_STEPS = [
  'Check ID visually before handing the tablet or pointing to the QR code.',
  'Ask every visitor to complete check-in with first name and phone before shopping.',
  'Explain that email is optional and marketing opt-in is never required to enter.',
  'If the flow fails, let staff continue entry and note the outage for follow-up.',
  'For returning visitors, confirm the welcome-back screen before sending them to the floor.',
];

export const VISITOR_CHECKIN_QA_CHECKLIST = [
  'New visitor through public rewards check-in with phone only.',
  'New visitor through public rewards check-in with phone, email, SMS consent, and email consent.',
  'Returning visitor with the same phone number to confirm dedupe and welcome-back copy.',
  'Tablet flow completion with recommendations, then a second pass using Skip for now.',
];

export const VISITOR_CHECKIN_EXPECTED_RESULTS = [
  'Success copy should show "You are checked in" for new visitors and "Welcome back" for returning visitors.',
  'Marketing consent should stay off by default until the visitor explicitly turns it on.',
  'Repeat check-ins should reuse the existing customer record for the same normalized phone.',
  'checkin_visits.reviewSequence.status should be pending only when email plus email consent is present.',
];

export const VISITOR_CHECKIN_FIRESTORE_CHECKS = [
  'email_leads: source should be brand_rewards_checkin or loyalty_tablet_checkin, with normalized phone.',
  'customers: repeat visits should reuse the same customer record for the same normalized phone.',
  'checkin_visits: visitedAt should be populated on every check-in record.',
  'reviewSequence.status: pending when email plus email consent exists, skipped_no_email otherwise.',
];
