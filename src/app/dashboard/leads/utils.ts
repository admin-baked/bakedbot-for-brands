import { LeadType } from './actions';

export function getLeadTypeInfo(type: LeadType): { label: string; color: string; description: string } {
    const info: Record<LeadType, { label: string; color: string; description: string }> = {
        customer_inquiry: {
            label: 'Customer',
            color: 'bg-blue-100 text-blue-800',
            description: 'Customer lead or inquiry'
        },
        brand_request: {
            label: 'Brand Request',
            color: 'bg-purple-100 text-purple-800',
            description: 'Dispensary requesting a brand'
        },
        vendor_inquiry: {
            label: 'Vendor',
            color: 'bg-green-100 text-green-800',
            description: 'Vendor or supplier inquiry'
        },
        partnership: {
            label: 'Partnership',
            color: 'bg-yellow-100 text-yellow-800',
            description: 'Partnership or collaboration'
        },
        wholesale: {
            label: 'Wholesale',
            color: 'bg-orange-100 text-orange-800',
            description: 'Wholesale purchase inquiry'
        },
    };
    return info[type];
}
