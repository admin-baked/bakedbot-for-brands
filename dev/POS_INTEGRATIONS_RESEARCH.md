# Cannabis POS & Marketing Integration Research

Research into "open" APIs (OpenAPI/Swagger) for Cannabis Tech integration.

## Top POS Candidates (OpenAPI / Public Specs)

### 1. Blaze POS
*   **Status**: ✅ **Excellent Candidate**
*   **API Spec**: [Swagger JSON](https://apidocs.blaze.me/swagger.json)
*   **Auth**: Partner API Key + Dispensary API Key
*   **Capabilities**: Full CRUD on Members, Orders, Inventory.
*   **Verdict**: Can be auto-generated via standard OpenAPI generators.

### 2. Cova POS
*   **Status**: ⚠️ **Good Candidate** (Portal Access)
*   **Docs**: [Developer Portal](https://api.covasoft.net/Documentation)
*   **Auth**: OAuth2 (Client Creds). Requires "Access Credentials" from onboarding.
*   **Capabilities**: Sales Orders, Pricing, Location, User Management. Postman collection available.

### 3. Treez (SellTreez)
*   **Status**: ⚠️ **Partner Required**
*   **Docs**: "Code Treez" Portal (Requires Sign-up)
*   **Auth**: Partner API Key.
*   **Capabilities**: Ticket API, Customer API, Product API.

### 4. Dutchie (Plus / Ecommerce)
*   **Status**: ⚠️ **Mixed**
*   **Docs**: Public docs for Ecommerce; POS requires partner access.
*   **Existing Integration**: We have `src/server/integrations/dutchie` (likely Ecommerce).
*   **Note**: "Dutchie Plus" is their enterprise POS API.

### 5. Flowhub (Maui)
*   **Status**: ⛔ **Closed / Contact Sales**
*   **Docs**: Not public. Requires manual request for keys/docs.

## Marketing & Loyalty Candidates

### 1. Alpine IQ
*   **Status**: ✅ **Excellent Candidate** (Already in progress)
*   **API Spec**: [Swagger UI](https://lab.alpineiq.com/swagger)
*   **Capabilities**: Loyalty, Campaigns, Sales Data ingestion.
*   **Existing**: `src/server/services/alpine-iq.ts` exists. Verify completeness.

### 2. Springbig
*   **Status**: ⚠️ **Good Candidate**
*   **Docs**: Developer Portal (Public references exist on API Tracker).
*   **Capabilities**: Loyalty, CRM, SMS.

## Strategic Recommendations

1.  **Prioritize Blaze**: Lowest barrier to entry with public Swagger JSON.
2.  **Hardening Alpine IQ**: Since we have `alpine-iq.ts` and there is a public Swagger, we should generate a full client to ensure coverage.
3.  **Formalize Cova**: If we have a mutual client, requesting Cova credentials is high value due to their market share.
