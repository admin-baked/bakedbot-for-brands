
import Mailjet from 'node-mailjet';
import { logger } from '@/lib/monitoring';
import { UsageService } from '@/server/services/usage';

const API_KEY = process.env.MAILJET_API_KEY?.trim();
const SECRET_KEY = process.env.MAILJET_SECRET_KEY?.trim();
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'orders@bakedbot.ai'; // Reuse config for now or add new env
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'BakedBot Orders';

let mailjetClient: any = null;

if (API_KEY && SECRET_KEY) {
    mailjetClient = new Mailjet({
        apiKey: API_KEY,
        apiSecret: SECRET_KEY
    });
} else {
    logger.warn('MAILJET_API_KEY or MAILJET_SECRET_KEY is missing.');
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
    if (!mailjetClient) return false;

    const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

    const htmlContent = `
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
    `;

    try {
        const result = await mailjetClient
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": FROM_EMAIL,
                            "Name": FROM_NAME
                        },
                        "To": [
                            {
                                "Email": data.customerEmail,
                                "Name": data.customerName
                            }
                        ],
                        "Subject": `Order Confirmation #${data.orderId.substring(0, 7)}`,
                        "HTMLPart": htmlContent,
                        "CustomID": data.orderId
                    }
                ]
            });

        logger.info('Order confirmation email sent (Mailjet)', { orderId: data.orderId, email: data.customerEmail });

        if (data.retailerId) {
            await UsageService.increment(data.retailerId, 'messages_sent');
        }

        return true;
    } catch (error: any) {
        const maskedKey = API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'MISSING';
        logger.error('Failed to send email (Mailjet)', { 
            error: error.message, 
            statusCode: error.statusCode,
            response: error.response?.text,
            usedKey: maskedKey,
            keyLength: API_KEY?.length 
        });
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
    if (!mailjetClient) {
        logger.warn('Mailjet client not initialized');
        return { success: false, error: 'Mailjet API keys are missing in server environment.' };
    }

    try {
        const result = await mailjetClient
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": FROM_EMAIL,
                            "Name": FROM_NAME
                        },
                        "To": [
                            {
                                "Email": data.to,
                                "Name": data.name || data.to
                            }
                        ],
                        "Subject": data.subject,
                        "HTMLPart": data.htmlBody,
                        "TextPart": data.textBody || '',
                    }
                ]
            });

        logger.info('Generic email sent (Mailjet)', { to: data.to, subject: data.subject });
        return { success: true };
    } catch (error: any) {
        const maskedKey = API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'MISSING';
        logger.error('Failed to send generic email (Mailjet)', { 
             error: error.message, 
             statusCode: error.statusCode,
             usedKey: maskedKey 
        });
        
        return { 
            success: false, 
            error: `Mailjet Error ${error.statusCode}: ${error.message} (Key: ${maskedKey})` 
        };
    }
}
