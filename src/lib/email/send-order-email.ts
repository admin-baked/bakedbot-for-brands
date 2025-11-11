
import sgMail from "@sendgrid/mail";
import type { OrderInput } from "@/app/checkout/actions/submitOrder";
import type { Location } from "@/lib/types";

type SendArgs = {
  to: string | string[];
  bcc?: string[];
  subject: string;
  orderId: string;
  order: OrderInput;
  location: Location;
  recipientType: 'customer' | 'dispensary';
};

const generateHtml = (args: SendArgs): string => {
    const { order, orderId, recipientType, location } = args;
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.qty).toFixed(2)}</td>
        </tr>
    `).join('');

    const headerText = recipientType === 'customer' 
        ? `Thank you for your order, ${order.customer.name}!` 
        : `New Online Order for Pickup`;

    const introText = recipientType === 'customer'
        ? `We've received your order and are getting it ready for pickup at <strong>${location.name}</strong>. Please have your ID ready when you arrive.`
        : `The following order has been placed by <strong>${order.customer.name} (${order.customer.email})</strong> for pickup.`;

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h1 style="color: #333; text-align: center;">${headerText}</h1>
        <p style="text-align: center; color: #555;">Order ID: #${orderId.substring(0, 7)}</p>
        <p style="margin-bottom: 20px;">${introText}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Item</th>
                    <th style="text-align: center; padding: 8px; border-bottom: 2px solid #ddd;">Qty</th>
                    <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Price</th>
                    <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div style="text-align: right; margin-bottom: 20px;">
            <p>Subtotal: $${order.totals.subtotal.toFixed(2)}</p>
            <p>Tax (est.): $${order.totals.tax.toFixed(2)}</p>
            <p style="font-size: 1.2em; font-weight: bold;">Total: $${order.totals.total.toFixed(2)}</p>
        </div>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
          <h3 style="margin-top: 0;">Pickup Information</h3>
          <p><strong>${location.name}</strong></p>
          <p>${location.address}, ${location.city}, ${location.state} ${location.zip}</p>
          ${location.phone ? `<p>${location.phone}</p>` : ''}
        </div>

        <p style="text-align: center; font-size: 0.8em; color: #999; margin-top: 20px;">
            Powered by BakedBot AI
        </p>
      </div>
    `;
};


export async function sendOrderEmail(args: SendArgs) {
  const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME } = process.env;

  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    // Throwing here is good: it’s a *configuration* error
    throw new Error("SendGrid not configured (SENDGRID_API_KEY/SENDGRID_FROM_EMAIL).");
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  const htmlBody = generateHtml(args);
  const textBody = `Order ${args.orderId}\n\n${JSON.stringify(args.order, null, 2)}`;

  await sgMail.send({
    to: args.to,
    bcc: args.bcc,
    from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME || "BakedBot Orders" },
    subject: args.subject,
    text: textBody,
    html: htmlBody,
  });
}
