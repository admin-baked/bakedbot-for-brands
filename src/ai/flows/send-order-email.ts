
'use server';
/**
 * @fileOverview An AI flow that sends an order confirmation email.
 *
 * - sendOrderEmail - A function that takes order details and sends a formatted email.
 * - SendOrderEmailInput - The input type for the sendOrderEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {emailRequest} from '../genkit';

const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
  category: z.string(),
  imageUrl: z.string(),
});

const SendOrderEmailInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient (dispensary fulfillment).'),
  bcc: z.array(z.string().email()).optional().describe('BCC recipients, like brand owners.'),
  orderId: z.string().describe('The unique ID of the order.'),
  customerName: z.string().describe('The name of the customer.'),
  customerEmail: z.string().email().describe('The email of the customer.'),
  pickupLocationName: z.string().describe('The name of the pickup location.'),
  totalAmount: z.number().describe('The total amount of the order.'),
  cartItems: z.array(CartItemSchema).describe('The items in the order.'),
  orderPageUrl: z.string().url().describe('The URL to the order status page.'),
});

export type SendOrderEmailInput = z.infer<typeof SendOrderEmailInputSchema>;

export async function sendOrderEmail(input: SendOrderEmailInput): Promise<void> {
  return sendOrderEmailFlow(input);
}

const sendOrderEmailFlow = ai.defineFlow(
  {
    name: 'sendOrderEmailFlow',
    inputSchema: SendOrderEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, bcc, orderId, customerName, customerEmail, pickupLocationName, totalAmount, cartItems, orderPageUrl } = input;

    const itemsHtml = cartItems
      .map(
        (item) =>
          `<li>${item.name} (x${item.quantity}) - $${(
            item.price * item.quantity
          ).toFixed(2)}</li>`
      )
      .join('');

    const subject = `New Online Order for Pickup! (ID: ${orderId.slice(0, 8)})`;
    
    const htmlBody = `
      <h1>You have a new order for pickup!</h1>
      <p>Please prepare the following order for <strong>${customerName}</strong>.</p>
      
      <h2>Order Details</h2>
      <ul>
        <li><strong>Order ID:</strong> ${orderId}</li>
        <li><strong>Customer Name:</strong> ${customerName}</li>
        <li><strong>Customer Email:</strong> ${customerEmail}</li>
        <li><strong>Pickup Location:</strong> ${pickupLocationName}</li>
        <li><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</li>
      </ul>

      <h2>Items</h2>
      <ul>
        ${itemsHtml}
      </ul>

      <p>You can view the official order details here: <a href="${orderPageUrl}">${orderPageUrl}</a></p>
      <p>Please notify the customer when the order is ready for pickup.</p>
    `;

    // Call the emailRequest tool with the constructed email content.
    await emailRequest({
      to,
      subject,
      html: htmlBody,
      bcc,
    });
  }
);
