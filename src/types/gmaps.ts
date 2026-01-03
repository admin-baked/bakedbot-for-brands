/**
 * TypeScript types for Google Maps Discovery (Apify) data
 */

// ============== Input Types ==============

export interface GMapsSearchInput {
    // Search terms
    searchStringsArray?: string[];

    // Location
    locationQuery?: string;
    lat?: string;
    lng?: string;

    // Geolocation
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;

    // Custom search area (GeoJSON)
    customGeolocation?: {
        type: 'Point' | 'Polygon' | 'MultiPolygon';
        coordinates: number[] | number[][] | number[][][];
        radiusKm?: number;
    };

    // Limits
    maxCrawledPlacesPerSearch?: number;
    maxImages?: number;
    maxReviews?: number;

    // Options
    language?: string;
    searchMatching?: 'all' | 'exact';
    placeMinimumStars?: number;

    // Enrichment add-ons
    skipClosedPlaces?: boolean;
    discoverContacts?: boolean;  // Paid add-on
    discoverLeads?: boolean;     // Paid add-on
    discoverSocialProfiles?: boolean;  // Paid add-on
}

// ============== Output Types ==============

export interface GMapsPlace {
    // Basic info
    title: string;
    placeId: string;
    cid?: string;
    fid?: string;
    url: string;

    // Category
    categoryName?: string;
    categories?: string[];

    // Location
    address: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
    neighborhood?: string;
    plusCode?: string;
    location: {
        lat: number;
        lng: number;
    };

    // Contact
    phone?: string;
    phoneUnformatted?: string;
    website?: string;

    // Ratings
    totalScore?: number;
    reviewsCount?: number;
    reviewsDistribution?: {
        oneStar: number;
        twoStar: number;
        threeStar: number;
        fourStar: number;
        fiveStar: number;
    };

    // Status
    permanentlyClosed?: boolean;
    temporarilyClosed?: boolean;
    claimThisBusiness?: boolean;

    // Media
    imageUrl?: string;
    imageUrls?: string[];
    imagesCount?: number;

    // Hours
    openingHours?: GMapsOpeningHours[];

    // Restaurant specific
    price?: string;
    menu?: string;
    reserveTableUrl?: string;

    // Hotel specific
    hotelStars?: string;
    hotelDescription?: string;

    // Additional info (amenities, features)
    additionalInfo?: Record<string, Array<Record<string, boolean>>>;

    // Reviews
    reviews?: GMapsReview[];
    reviewsTags?: { title: string; count: number }[];

    // Related
    peopleAlsoSearch?: {
        category: string;
        title: string;
        reviewsCount: number;
        totalScore: number;
    }[];

    // Metadata
    discoveredAt: string;
    searchString?: string;
    rank?: number;
    isAdvertisement?: boolean;
}

export interface GMapsOpeningHours {
    day: string;
    hours: string;
}

export interface GMapsReview {
    name: string;
    text?: string;
    stars: number;
    publishedAtDate?: string;
    publishAt?: string;
    likesCount?: number;
    reviewId: string;
    reviewUrl?: string;
    reviewerId?: string;
    reviewerUrl?: string;
    reviewerPhotoUrl?: string;
    reviewerNumberOfReviews?: number;
    isLocalGuide?: boolean;
    responseFromOwnerText?: string;
    responseFromOwnerDate?: string;
    reviewImageUrls?: string[];
}

// ============== Company Contacts Enrichment ==============

export interface GMapsCompanyContacts {
    title: string;
    instagrams?: string[];
    facebooks?: string[];
    linkedIns?: string[];
    youtubes?: string[];
    tiktoks?: string[];
    twitters?: string[];
    pinterests?: string[];
}

// ============== Business Leads Enrichment ==============

export interface GMapsBusinessLead {
    personId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    linkedinProfile?: string;
    email?: string;
    mobileNumber?: string;
    headline?: string;
    jobTitle?: string;
    department?: string[];
    industry?: string;
    seniority?: string[];
    country?: string;
    city?: string;
    state?: string;
    photoUrl?: string;
    companyId?: string;
    companyName?: string;
    companyWebsite?: string;
    companySize?: string;
    companyLinkedin?: string;
}

// ============== Run Types ==============

export interface GMapsRunInput {
    taskId?: string;
    searchTerms?: string[];
    location?: string;
    customGeolocation?: GMapsSearchInput['customGeolocation'];
    maxResults?: number;
}

export interface GMapsRunResponse {
    id: string;
    actId: string;
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
    startedAt: string;
    finishedAt?: string;
    defaultDatasetId: string;
    defaultKeyValueStoreId: string;
}

export interface GMapsIngestionRun {
    id: string;
    apifyRunId: string;
    searchTerms: string[];
    location?: string;
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    placesFound: number;
    placesIngested: number;
    errors: string[];
}

// ============== Firestore Document Types ==============

export interface GMapsDispensaryDoc {
    id: string;
    placeId: string;
    title: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    phone?: string;
    website?: string;
    location: {
        lat: number;
        lng: number;
    };
    rating?: number;
    reviewsCount?: number;
    categories?: string[];
    openingHours?: GMapsOpeningHours[];
    imageUrl?: string;
    priceLevel?: string;
    permanentlyClosed?: boolean;
    temporarilyClosed?: boolean;
    lastDiscoveredAt: Date;
    source: 'gmaps';
}
