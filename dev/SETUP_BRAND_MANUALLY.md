# Manual Brand Setup for Loyalty Sync

## Quick Fix: Create Brand Document in Firebase Console

Since Firebase credentials aren't configured locally, here's the easiest way to get your loyalty sync working:

---

## Steps

### 1. Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** in the left sidebar

### 2. Create Brand Document

1. Click on the **"brands"** collection (or create it if it doesn't exist)

2. Click **"Add Document"**

3. Set **Document ID** to: `thrive_syracuse`

4. Add the following fields:

```
Field Name       | Type   | Value
---------------- | ------ | -----
id               | string | thrive_syracuse
name             | string | Thrive Syracuse
posConfig        | map    | (see below)
createdAt        | timestamp | (auto-generated)
updatedAt        | timestamp | (auto-generated)
```

### 3. Add POS Config (nested in posConfig map)

Click on the `posConfig` field and add these nested fields:

```
Field Name       | Type   | Value
---------------- | ------ | -----
provider         | string | alleaves
storeId          | string | 1000
locationId       | string | 1000
username         | string | bakedbotai@thrivesyracuse.com
password         | string | Dreamchasing2030!!@@!!
pin              | string | 1234
environment      | string | production
```

### 4. Save the Document

Click **"Save"** and your brand is ready!

---

## Alternative: Use Firebase CLI

If you have Firebase CLI installed:

```bash
# Login to Firebase
firebase login

# Add the document via CLI
firebase firestore:write brands/thrive_syracuse '{
  "id": "thrive_syracuse",
  "name": "Thrive Syracuse",
  "posConfig": {
    "provider": "alleaves",
    "storeId": "1000",
    "locationId": "1000",
    "username": "bakedbotai@thrivesyracuse.com",
    "password": "Dreamchasing2030!!@@!!",
    "pin": "1234",
    "environment": "production"
  },
  "createdAt": { "_seconds": 1738281600, "_nanoseconds": 0 },
  "updatedAt": { "_seconds": 1738281600, "_nanoseconds": 0 }
}'
```

---

## Verify Setup

After creating the document:

1. **Refresh the dashboard**: `http://localhost:3000/dashboard/loyalty`

2. **Click "Sync Now"** button

3. **Check the console** - it should now work!

---

## Expected Result

Once the brand document exists with the POS config, the sync will:
- ✅ Connect to Alleaves API
- ✅ Fetch all 1,641 customers
- ✅ Calculate points from 2,689 orders
- ✅ Update Firestore customer profiles
- ✅ Display stats in dashboard

---

## Troubleshooting

**Still seeing "Organization not found"?**
- Double-check the document ID is exactly: `thrive_syracuse`
- Ensure `posConfig.provider` is set to `"alleaves"`
- Verify all required fields are present

**"Alleaves authentication failed"?**
- Check the username/password/pin are correct
- Verify locationId is "1000"

**"No customers found"?**
- The sync is working! It means there are no customers in Alleaves yet

---

**Once the brand document is created, your sync button will work!** 🎉
