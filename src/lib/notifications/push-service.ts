 */
export async function subscribeToPush(
    userId: string,
    fcmToken: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore.collection('users').doc(userId).update({
        fcmTokens: FieldValue.arrayUnion(fcmToken),
    });
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPush(
    userId: string,
    fcmToken: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore.collection('users').doc(userId).update({
        fcmTokens: FieldValue.arrayRemove(fcmToken),
    });
}
