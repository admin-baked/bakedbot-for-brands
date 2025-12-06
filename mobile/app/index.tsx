import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { BiometricGate } from '../components/BiometricGate';
import { AgeGate } from '../components/AgeGate';

export default function MobileApp() {
    const [ageVerified, setAgeVerified] = useState(false);

    if (!ageVerified) {
        return (
            <View style={styles.safeArea}>
                <AgeGate onVerified={() => setAgeVerified(true)} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brand}>BakedBot Mobile</Text>
                <Text style={styles.badge}>White Label</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Your Cart</Text>
                <View style={styles.cartItem}>
                    <Text>1x Blue Dream (3.5g)</Text>
                    <Text>$45.00</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>$45.00</Text>
                </View>

                {/* Biometric Payment Button */}
                <BiometricGate onSuccess={() => router.push('/pay')} promptText="Authorize $45.00 Payment">
                    <View style={styles.payButton}>
                        <Text style={styles.payButtonText}>Pay with Smokey Pay</Text>
                    </View>
                </BiometricGate>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#10b981',
    },
    brand: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    badge: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 5,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 30,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#10b981',
    },
    payButton: {
        backgroundColor: '#000',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
