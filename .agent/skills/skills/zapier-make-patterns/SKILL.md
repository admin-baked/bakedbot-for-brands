---
name: zapier-make-patterns
description: "Guide the user through building automations with Zapier and Make (Integromat), including trigger/action configuration, error handling, data mapping, and multi-step workflows. Use when the user needs to connect apps, automate repetitive tasks, or choose between Zapier and Make for a specific integration scenario."
metadata:
  source: vibeship-spawner-skills (Apache 2.0)
---

# Zapier & Make Automation Patterns

## Decision Matrix: Zapier vs Make

| Factor | Choose Zapier | Choose Make |
|--------|--------------|-------------|
| Complexity | Simple linear workflows (1 trigger, 1-3 actions) | Branching logic, loops, or parallel paths |
| User skill level | Non-technical users who prefer a guided UI | Users comfortable with visual flow builders and JSON |
| Budget sensitivity | Fewer zaps needed; higher per-task cost acceptable | High-volume tasks; pay-per-operation is cheaper at scale |
| Error handling | Built-in retry and auto-replay is sufficient | Need custom error routes, fallback branches, or partial rollbacks |
| Speed to deploy | Need a working automation in under 10 minutes | Willing to spend more time for a more robust setup |
| Data transformation | Light formatting (e.g., date format, uppercase) | Heavy restructuring, array iteration, or aggregation |
| App coverage | The required app has a native Zapier integration | The required app only has a Make module, or a raw HTTP/webhook approach is preferred |

## Pattern 1: Lead Capture to CRM

### Zapier Implementation

1. **Create a new Zap** in the Zapier dashboard.
2. **Set the trigger:**
   - App: Typeform (or Google Forms, Jotform, etc.)
   - Event: "New Entry"
   - Connect the account and select the specific form.
   - Test the trigger to confirm a sample submission is pulled.
3. **Add Action 1 — Create CRM contact:**
   - App: HubSpot (or Salesforce, Pipedrive)
   - Event: "Create Contact"
   - Map fields: Form "Email" to CRM "Email", Form "Full Name" to CRM "First Name" / "Last Name" (use a Formatter step to split if needed).
   - Set the "Lead Source" field to a static value like `typeform-landing-page`.
4. **Add Action 2 — Send Slack notification:**
   - App: Slack
   - Event: "Send Channel Message"
   - Channel: `#new-leads`
   - Message template: `New lead: {{full_name}} ({{email}}) — Source: Typeform`
5. **Turn the Zap on** and submit a real form entry to verify end-to-end.

### Make Implementation

1. **Create a new Scenario.**
2. **Add the trigger module:**
   - Module: Typeform — "Watch Responses"
   - Connect the account, choose the form, set the polling interval (e.g., every 15 minutes or use an instant webhook if available).
3. **Add a Router module** after the trigger (right-click, then Add Router). This enables parallel paths.
4. **Path A — CRM contact creation:**
   - Module: HubSpot — "Create/Update a Contact"
   - Map `Email`, `First Name`, `Last Name` from the Typeform output.
   - Add a filter on this path: only proceed if `email` is not empty.
5. **Path B — Slack notification:**
   - Module: Slack — "Create a Message"
   - Select the channel and compose the message using mapped variables.
6. **Add an Error Handler** on Path A:
   - Right-click the HubSpot module, then Add Error Handler, then choose "Resume" with a fallback that logs the failed record to a Google Sheet for manual review.
7. **Set scheduling** and activate the scenario.

## Pattern 2: E-Commerce Order Fulfillment

### Zapier Implementation

1. **Trigger:** Shopify — "New Paid Order"
2. **Action 1 — Filter:** Use a Zapier Filter step to continue only if `order.total_price > 0` and `order.fulfillment_status` is blank (unfulfilled).
3. **Action 2 — Create shipment:** ShipStation — "Create Order" — map line items, shipping address, and order number.
4. **Action 3 — Update spreadsheet:** Google Sheets — "Create Spreadsheet Row" — log order ID, customer email, total, and timestamp for reconciliation.
5. **Action 4 — Email customer:** Gmail or SendGrid — "Send Email" — use a template with the order summary and estimated shipping date.

### Make Implementation

1. **Trigger:** Shopify — "Watch Orders" (set status filter to "paid").
2. **Iterator module:** Add an Iterator to loop through `line_items` if the scenario needs per-item processing (e.g., different warehouses).
3. **HTTP module (if no native integration):** Use "Make an API Request" to call the fulfillment provider's REST API directly. Set method to POST, URL to the provider endpoint, and pass JSON body with mapped order data.
4. **Aggregator module:** After iterating, use an Array Aggregator to collect shipment tracking numbers back into a single bundle.
5. **Google Sheets module:** "Add a Row" — write consolidated order data.
6. **Error route:** Attach an error handler that sends a Slack DM to the ops team if the shipment creation fails, including the raw error message and order ID.

## Pattern 3: Content Publishing Pipeline

### Zapier Implementation

1. **Trigger:** Airtable — "New Record" in a "Content Calendar" table where the `Status` field equals "Approved."
2. **Action 1 — Format content:** Use a Formatter by Zapier step to convert Markdown body to HTML (Formatter, then Text, then Markdown to HTML).
3. **Action 2 — Publish:** WordPress — "Create Post" — map the title, HTML body, category, and featured image URL. Set status to "draft" or "publish" depending on a field value.
4. **Action 3 — Share on social:** Buffer or Twitter — "Create Post" — compose a summary with the published URL (use a Delay step if the URL is not immediately available).
5. **Action 4 — Update Airtable:** Airtable — "Update Record" — set `Status` to "Published" and write back the live URL.

### Make Implementation

1. **Trigger:** Airtable — "Search Records" with a filter formula `{Status} = 'Approved'`, scheduled every 30 minutes.
2. **Text Parser module:** Use the built-in Markdown-to-HTML function or a Text Parser with Replace to transform content.
3. **WordPress module:** "Create a Post" — map fields. Use the `featured_media` field by first uploading the image via WordPress — "Upload a Media File" if the image is a URL.
4. **Router:** Split into parallel paths for Twitter, LinkedIn, and Buffer.
5. **Sleep/Delay module:** Add a 60-second delay before the social sharing path to ensure WordPress generates the canonical URL.
6. **Airtable — Update a Record:** Write back the post URL and set status.

## Sharp Edges and Common Pitfalls

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Zapier task limits exceeded | Zaps pause mid-month; "task limit reached" email | Move high-volume zaps (e.g., row-per-order) to Make where operations are cheaper. Alternatively, batch records using Zapier's Looping or Digest step to group items before processing. |
| Make scenario timeout (40 min limit) | Scenario stops mid-execution on large data sets | Break the scenario into two: Scenario A fetches and stores data in a Data Store, Scenario B processes in smaller batches on a separate schedule. |
| Duplicate records created | CRM shows two contacts for the same email after re-runs | In Zapier, add a "Find or Create" action instead of "Create" so existing records are updated. In Make, add a Search module before Create and use a Router filter to skip existing records. |
| Webhook payload mismatch | Actions receive empty or wrong fields after the source app updates its API | Re-map the trigger: in Zapier, click "Refresh fields" on the trigger step and re-test. In Make, delete and re-add the webhook module to pull the new payload structure. |
| Date/timezone formatting errors | Events created at the wrong time; date filters skip valid records | Explicitly set timezone in Formatter (Zapier) or `formatDate()` function (Make). Always convert to UTC before comparing dates across modules. |
| API rate limits from downstream apps | 429 errors; incomplete workflow runs | In Zapier, add a "Delay by Zapier" step (e.g., 1 second) between repeated API calls. In Make, configure the module's advanced settings to enable automatic retry with exponential backoff, or increase the scenario execution interval. |
| Make JSON parsing failures | "Invalid JSON" error on HTTP response modules | Wrap the HTTP module output in a JSON Parse module. Confirm the Content-Type header is `application/json`. If the API returns plain text, use a Text Parser first. |

## Data Mapping Best Practices

- **Always test with real data.** Sample data in Zapier and Make can differ from production payloads in field names, nesting, and data types.
- **Handle null values explicitly.** In Zapier, use a Formatter "Default Value" step to substitute blanks. In Make, wrap mapped fields with `ifempty(field; "fallback")`.
- **Use consistent date formats.** Standardize on ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`) across all modules to avoid cross-app parsing failures.
- **Name every module.** Both platforms allow renaming steps. Use descriptive names like "Create HubSpot Contact" instead of "HTTP Module 3" so collaborators can read the workflow.
- **Document the workflow externally.** Maintain a simple table (in Notion, a Google Doc, or the repo) listing: trigger app, trigger event, each action app/event, field mappings, and any filters. This prevents knowledge loss when the original builder is unavailable.

## Multi-Step Error Handling Strategy

### Zapier

Zapier provides limited native error handling. To build resilience:

1. **Turn on Auto-Replay** in Zap settings. Zapier retries failed tasks automatically for transient errors (5xx, timeouts).
2. **Add a Paths step** after critical actions to branch on success or failure. Check the action's output for an ID or status field; route to an error-logging action (e.g., append to a Google Sheet or send an email) when the expected field is missing.
3. **Use Webhooks by Zapier as a dead-letter queue.** On failure, POST the failed payload to a webhook URL that triggers a separate error-handling Zap.

### Make

Make provides first-class error handling:

1. **Error Handler modules:** Right-click any module, then select "Add Error Handler." Choose from:
   - **Resume:** Supply fallback output and continue the scenario.
   - **Commit:** Save all successful operations up to the failure point, then stop.
   - **Rollback:** Undo all operations in the current cycle (useful for database writes).
   - **Break:** Pause the scenario and store the failed bundle for manual retry.
2. **Retry directive:** Inside an error handler, add a Retry module with max attempts (e.g., 3) and a delay between retries (e.g., 5 seconds).
3. **Incomplete executions:** Enable "Allow storing incomplete executions" in scenario settings. Failed bundles appear in a queue for manual inspection and re-processing.
