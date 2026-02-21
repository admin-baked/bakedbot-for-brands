#!/usr/bin/env python3
"""
Configure Loyalty Settings for Organizations
Uses Firebase Admin SDK
"""

import firebase_admin
from firebase_admin import credentials, firestore
import sys

# Initialize Firebase Admin
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {
    'projectId': 'studio-567050101-bc6e8',
})

db = firestore.client()

ORG_ID = sys.argv[1] if len(sys.argv) > 1 else 'org_thrive_syracuse'

# Default loyalty settings
loyalty_settings = {
    'enabled': True,
    'programName': 'Rewards Program',
    'pointsPerDollar': 1,
    'dollarPerPoint': 0.01,
    'minPointsToRedeem': 100,
    'maxPointsPerOrder': 5000,
    'tiers': [
        {
            'name': 'Bronze',
            'requiredSpend': 0,
            'multiplier': 1,
            'benefits': ['Earn 1 point per dollar']
        },
        {
            'name': 'Silver',
            'requiredSpend': 500,
            'multiplier': 1.2,
            'benefits': ['Earn 1.2 points per dollar', 'Birthday bonus']
        },
        {
            'name': 'Gold',
            'requiredSpend': 1000,
            'multiplier': 1.5,
            'benefits': ['Earn 1.5 points per dollar', 'Birthday bonus', 'Exclusive deals']
        },
        {
            'name': 'Platinum',
            'requiredSpend': 2500,
            'multiplier': 2,
            'benefits': ['Earn 2 points per dollar', 'Birthday bonus', 'Exclusive deals', 'VIP events']
        }
    ],
    'tierInactivityDays': 180
}

print('🎁 Configuring Loyalty Settings')
print('════════════════════════════════')
print(f'Organization: {ORG_ID}')
print('')

try:
    # Create or update loyalty settings
    doc_ref = db.collection('tenants').document(ORG_ID).collection('settings').document('loyalty')
    doc_ref.set(loyalty_settings)

    print('✅ Loyalty settings configured successfully!')
    print('')
    print('Settings:')
    print(f'  - Bronze (default): 1 point per $1')
    print(f'  - Silver ($500+): 1.2 points per $1')
    print(f'  - Gold ($1000+): 1.5 points per $1')
    print(f'  - Platinum ($2500+): 2 points per $1')
    print('')
    print(f'💰 Redemption rate: 100 points = $1.00')
    print('')

except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
