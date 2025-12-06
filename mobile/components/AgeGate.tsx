import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export function AgeGate({ onVerified }: { onVerified: () => void }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Age</Text>
            <Text style={styles.subtitle}>You must be 21+ to enter.</Text>

            <View style={styles.card}>
                <Text style={styles.instruction}>Scan Driver's License</Text>
                {/* Camera preview would go here */}
                <View style={styles.cameraPlaceholder} />

                <TouchableOpacity style={styles.button} onPress={onVerified}>
                    <Text style={styles.buttonText}>Simulate Scan (21+)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    card: {
        width: '100%',
        padding: 20,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        alignItems: 'center',
    },
    instruction: {
        marginBottom: 20,
        fontWeight: '600',
    },
    cameraPlaceholder: {
        width: 200,
        height: 120,
        backgroundColor: '#ddd',
        marginBottom: 20,
        borderRadius: 8,
    },
    button: {
        backgroundColor: '#10b981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
