
import { CannabisDesertRecord } from "@/types/seo-engine";

export async function fetchDesertData(stateSlug: string): Promise<CannabisDesertRecord[]> {
    // In production, this would query a "deserts" collection or aggregate data from "retailers" + census data.
    // For V1, we return robust mock data to demonstrate the concept.

    // Normalize state
    const state = stateSlug.toUpperCase().slice(0, 2); // e.g. "mi" -> "MI" (Simple mock logic)

    const mockDeserts: CannabisDesertRecord[] = [
        {
            zipCode: "48001",
            city: "Algonac",
            state: "MI",
            underservedScore: 85,
            populationProxy: 12000,
            distanceToNearestDispensaryMiles: 15.2,
            dispensaryCount: 0
        },
        {
            zipCode: "48002",
            city: "Allenton",
            state: "MI",
            underservedScore: 62,
            populationProxy: 3500,
            distanceToNearestDispensaryMiles: 8.5,
            dispensaryCount: 0
        },
        {
            zipCode: "48003",
            city: "Almont",
            state: "MI",
            underservedScore: 91,
            populationProxy: 5000,
            distanceToNearestDispensaryMiles: 22.0,
            dispensaryCount: 0
        },
        // A "Not a desert" example for contrast
        {
            zipCode: "48201",
            city: "Detroit",
            state: "MI",
            underservedScore: 10,
            populationProxy: 35000,
            distanceToNearestDispensaryMiles: 0.2,
            dispensaryCount: 12
        }
    ];

    // Filter to "Deserts" only? Or return all and let page filter?
    // Let's return all so we can show "Top Deserts" vs "Served Areas"
    return mockDeserts.sort((a, b) => b.underservedScore - a.underservedScore);
}

export async function fetchStateStats(stateSlug: string) {
    return {
        totalDeserts: 142,
        residentsUnderserved: 250000,
        averageDriveTime: 18 // minutes
    };
}
