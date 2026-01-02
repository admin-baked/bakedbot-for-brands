// src/lib/email/sendgrid.ts
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/monitoring';
import { UsageService } from '@/server/services/usage';

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'orders@bakedbot.ai';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'BakedBot Orders';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
} else {
  logger.warn('SENDGRID_API_KEY is missing. Emails will not be sent.');
}

type OrderEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  retailerName: string;
  pickupAddress: string;
  retailerId?: string;
};

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  if (!API_KEY) return false;

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const msg = {
    to: data.customerEmail,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `Order Confirmation #${data.orderId.substring(0, 7)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2e7d32;">Order Confirmed!</h1>
        <p>Hi ${data.customerName},</p>
        <p>Thanks for your order. It has been sent to <strong>${data.retailerName}</strong> for preparation.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Pickup Location</h3>
          <p>${data.retailerName}<br>${data.pickupAddress}</p>
        </div>

        <h3>Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 8px; font-weight: bold;">$${data.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          Order ID: ${data.orderId}<br>
          If you have any questions, please contact the dispensary directly.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info('Order confirmation email sent', { orderId: data.orderId, email: data.customerEmail });

    if (data.retailerId) {
      await UsageService.increment(data.retailerId, 'messages_sent');
    }

    return true;
  } catch (error: any) {
    logger.error('Failed to send email', { error: error.message, response: error.response?.body });
    return false;
  }
}

export type GenericEmailData = {
  to: string;
  name?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

export async function sendGenericEmail(data: GenericEmailData): Promise<{ success: boolean; error?: string }> {
  if (!API_KEY) {
    logger.warn('SendGrid API key not configured');
    return { success: false, error: 'SendGrid API key is missing in server environment.' };
  }

  const msg = {
    to: data.to,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: data.subject,
    html: data.htmlBody,
    text: data.textBody || data.htmlBody.replace(/<[^>]*>?/gm, ''),
  };

  try {
    await sgMail.send(msg);
    logger.info('Generic email sent (SendGrid)', { to: data.to, subject: data.subject });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to send generic email (SendGrid)', { error: error.message, response: error.response?.body });
    return { success: false, error: error.message || 'Unknown SendGrid Error' };
  }
}
