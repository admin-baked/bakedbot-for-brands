import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'BakedBot', headerShown: false }} />
                <Stack.Screen name="pay" options={{ title: 'Smokey Pay' }} />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
