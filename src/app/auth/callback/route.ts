
import { createServerClient } from "@/firebase/server-client";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { auth } = await createServerClient();
    const requestUrl = new URL(request.url);
    // On the server, we can't access localStorage.
    // Firebase client SDK is smart enough to use localStorage if the email is not in the URL.
    // But for that to work, the check must happen on the client.
    // We will pass the full URL to a client component to handle the sign-in.
    // Let's create a dedicated callback page for this.
    // For now, let's try to get email from localStorage on client.
    // We can't do that here on the server route.

    const fullUrl = requestUrl.href;

    // The recommended flow is to have a client-side page that handles the callback.
    // Let's redirect to a client page that will perform the check.
    // However, to quickly fix the current implementation for the magic button:
    // We need the user's email. It's not in the URL.
    // Let's try to get it from a query param if it exists, but it likely won't.
    let email = requestUrl.searchParams.get('email');

    try {
        // This is the server-side check. It needs the email.
        if (isSignInWithEmailLink(auth, fullUrl)) {
             // The email is not available here. This is the core problem.
             // We can't use localStorage on the server.
             // The client-side `signInWithEmailLink` can access it.
             // For the dev magic button, let's temporarily assume the email.
             // A proper solution would be a client-side callback handler.

             // We will try to retrieve email from a temporary cookie or local storage on a client component.
             // Let's modify the login page to store the email and this page to handle it.
             // For now, let's just make the dev button work by passing the email in the URL from the client.
             
             // The user is clicking a link from their email, so we need a way to get their email.
             // The Firebase SDK handles this by using localStorage on the client.
             // Since this is a server route, we can't do that.
             // The quick fix is to redirect to a client page that does the check.

             // Let's assume the email is stored in localStorage by the login page.
             // We need a client-side component to read it.
             // We will create a new page for that.

             // Let's just fix the current flow.
             // The login page will now save the email to localStorage.
             // We need to read it on the client.
             // This server route can't do it.

             // Redirect to a client-side callback handler page
             const clientCallbackUrl = new URL('/auth/callback-client', requestUrl.origin);
             clientCallbackUrl.search = requestUrl.search; // forward all params
             return NextResponse.redirect(clientCallbackUrl.href);
        }
    } catch (error) {
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(errorMessage)}`);
    }

    // If not a magic link, it could be google redirect.
    // The previous implementation was flawed. Let's redirect to dashboard and let the client SDK handle it.
    // The `getRedirectResult` should be called on a client page after the redirect.
    // We will redirect to a client page that handles this.
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
