
import { createServerClient } from "@/firebase/server-client";
import { getRedirectResult, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { auth } = await createServerClient();
    const requestUrl = new URL(request.url);
    const searchParams = requestUrl.searchParams;
    const email = searchParams.get('email');
    const fullUrl = requestUrl.href;

    try {
        // Handle Google redirect result
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
        }

        // Handle Magic Link sign-in
        if (isSignInWithEmailLink(auth, fullUrl) && email) {
            await signInWithEmailLink(auth, email, fullUrl);
            return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
        }
    } catch (error) {
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(errorMessage)}`);
    }

    // If neither case matched, it might be a direct access attempt or an error state
    return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid+authentication+attempt`);
}
