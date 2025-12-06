import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricGateProps {
    onSuccess: () => void;
    children: React.ReactNode;
    promptText?: string;
}

export function BiometricGate({ onSuccess, children, promptText = "Verify Identity" }: BiometricGateProps) {
    const [isCompatible, setIsCompatible] = useState(false);

    useEffect(() => {
        checkHardware();
    }, []);

    const checkHardware = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setIsCompatible(compatible);
    };

    const handleAuth = async () => {
        if (!isCompatible) {
            // Fallback for devices without biometrics
            onSuccess();
            return;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: promptText,
            fallbackLabel: 'Use System Passcode',
        });

        if (result.success) {
            onSuccess();
        } else {
            Alert.alert('Authentication Failed', 'Please try again.');
        }
    };

    // Render the children (usually a button) wrapped with the auth handler
    return (
        <TouchableOpacity onPress={handleAuth} style={styles.container}>
            {children}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        // Wrapper style
    }
});
