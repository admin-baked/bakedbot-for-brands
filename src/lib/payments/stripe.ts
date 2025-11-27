/**
 * Stripe Server-Side Integration
 */

 * @param metadata Optional metadata to attach to the intent(orderId, customerId)
    */
export async function createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return paymentIntent;
    } catch (error) {
        console.error('Error creating PaymentIntent:', error);
        throw error;
    }
}

/**
 * Retrieves a PaymentIntent by ID.
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
        return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
        console.error('Error retrieving PaymentIntent:', error);
        throw error;
    }
}
