
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
  
    // --- Helper Functions ---
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isRole(role) {
      return request.auth.token.role == role;
    }

    function isBrandManager(brandId) {
      return isRole('brand') && request.auth.token.brandId == brandId;
    }
    
    function isDispensaryManager(locationId) {
      return isRole('dispensary') && request.auth.token.locationId == locationId;
    }

    // --- Public Collections (Read-Only) ---
    match /products/{productId} {
      // Anyone can read product details for the public menu.
      allow read: if true;
      
      // Only authenticated brand managers can create, update, or delete products
      // belonging to their own brand.
      allow create: if isBrandManager(request.resource.data.brandId);
      allow update, delete: if isBrandManager(resource.data.brandId);
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if false;
    }
     match /dispensaries/{dispensaryId} {
      allow read: if true;
      allow write: if false; // All location management must be done via Server Actions.
    }

    // --- User-Specific Data ---
    match /users/{userId} {
      // A user can read/update their own profile. An 'owner' can manage any user.
      allow read, update: if isOwner(userId) || isRole('owner');
      
      // Interactions are private to each user.
      match /interactions/{interactionId} {
         allow read, write: if isOwner(userId);
      }
    }
    
    // --- Sub-collections ---
    match /products/{productId} {
        // Anyone can read reviews.
        match /reviews/{reviewId} {
            allow read: if true;
            allow write: if false; // All writes via secure Server Action.
        }

        // Product feedback can only be written by a logged-in user.
        match /feedback/{userId} {
            allow read: if true;
            allow write: if isOwner(userId);
        }
        
        // AI embeddings are public-readable, but only server-writable (via Admin SDK).
        match /productReviewEmbeddings/{docId} {
            allow read: if true;
            allow write: if false;
        }
    }

    // This collection group query is necessary for the public "Recent Reviews" feed.
    match /{path=**}/reviews/{reviewId} {
      allow read: if true;
    }

     // This collection group query is necessary for vector search.
    match /{path=**}/productReviewEmbeddings/{docId} {
      allow read: if true;
    }
    
    // --- Orders Collection ---
    match /orders/{orderId} {
      // Allow creation through the secure server action.
      allow create: if true;

      // Read/Update access is granted based on role.
      allow read, update: if 
          // The customer who placed the order.
          isOwner(resource.data.userId) || 
          // The dispensary manager fulfilling the order.
          isDispensaryManager(resource.data.retailerId) ||
          // A global owner/admin.
          isRole('owner');
    }
  }
}
