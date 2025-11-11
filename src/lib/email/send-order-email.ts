import sgMail from "@sendgrid/mail";

type SendArgs = {
  to: string | string[];
  bcc?: string[];
  subject: string;
  orderId: string;
  order: unknown;
};

export async function sendOrderEmail(args: SendArgs) {
  const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME } = process.env;

  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    // Throwing here is good: it’s a *configuration* error
    throw new Error("SendGrid not configured (SENDGRID_API_KEY/SENDGRID_FROM_EMAIL).");
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  await sgMail.send({
    to: args.to,
    bcc: args.bcc,
    from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME || "BakedBot Orders" },
    subject: args.subject,
    text: `Order ${args.orderId}\n\n${JSON.stringify(args.order, null, 2)}`,
    html: `<h2>Order ${args.orderId}</h2><pre>${escapeHtml(JSON.stringify(args.order, null, 2))}</pre>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
