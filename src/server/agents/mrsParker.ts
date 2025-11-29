const { firestore: db } = await createServerClient();
const agentId = 'mrs_parker';

const eventRef = db.collection("organizations").doc(orgId).collection("events").doc(eventId);
const eventSnap = await eventRef.get();

if (!eventSnap.exists) return;
const event = eventSnap.data() as any;

// Check if this agent has already handled this event.
if (event.processedBy && event.processedBy[agentId]) {
  return;
}

if (!HANDLED_TYPES.includes(event.type)) {
  // Mark as processed even if not handled to prevent re-scanning
  await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
  return;
}

const orderId = event.refId;
if (!orderId) {
  await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
  return;
};

try {
  const orderSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("orders")
    .doc(orderId)
    .get();

  if (!orderSnap.exists) {
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
    return;
  };
  const order = orderSnap.data() as any;

  const customerKey = buildCustomerKey(order);
  if (!customerKey) {
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
    return;
  };

  const loyaltyRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("loyaltyProfiles")
    .doc(customerKey);

  const total = order.total || 0;
  const earnedPoints = Math.round(total); // 1 point per $ for now

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(loyaltyRef);
    const current = (snap.exists ? snap.data() : {}) as any;

    const newTotalOrders = (current.totalOrders || 0) + 1;
    const newTotalGmv = (current.totalGmv || 0) + total;
    const newPoints = (current.points || 0) + earnedPoints;
    const tier = computeTier(newPoints);

    // Check if this is the first order to send a welcome SMS.
    const isFirstOrder = !current.totalOrders || current.totalOrders === 0;

    if (isFirstOrder && order.customerPhone) {
      const welcomeMessage = `Welcome to the ${orgId} family! You've earned ${earnedPoints} points on your first order. Thanks for your business!`;
      // We can call the SMS function directly from here, within the transaction's scope.
      await sendSms(orgId, "NY", order.customerPhone, welcomeMessage);
    }

    tx.set(
      loyaltyRef,
      {
        customerKey,
        totalOrders: newTotalOrders,
        totalGmv: newTotalGmv,
        points: newPoints,
        tier,
        lastOrderAt: FieldValue.serverTimestamp(),
        lastOrderId: orderId,
      },
      { merge: true }
    );
  });

  await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

} catch (error) {
  console.error(`[${agentId}] Error processing event ${eventId}:`, error);
  await handleDeadLetter(orgId, eventId, event, error);
}
}
