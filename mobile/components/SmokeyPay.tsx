import React, { useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface SmokeyPayProps {
    widgetUrl: string; // e.g., "https://widget.canpayapp.com?intent_id=..."
    onSuccess: (data: any) => void;
    onCancel: () => void;
}

export function SmokeyPay({ widgetUrl, onSuccess, onCancel }: SmokeyPayProps) {
    const [loading, setLoading] = useState(true);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'CANPAY_SUCCESS') {
                onSuccess(data.payload);
            } else if (data.type === 'CANPAY_CANCEL') {
                onCancel();
            }
        } catch (e) {
            // Ignore non-JSON messages
        }
    };

    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text>Connecting to Smokey Pay...</Text>
                </View>
            )}
            <WebView
                source={{ uri: widgetUrl }}
                onLoadEnd={() => setLoading(false)}
                onMessage={handleMessage}
                style={{ flex: 1 }}
                // Inject JS to bridge CannPay callbacks to React Native
                injectedJavaScript={`
                    window.CannPay = {
                        init: function(config) {
                            // Mocking the init to hook into callbacks
                            if(config.onSuccess) window.onCannPaySuccess = config.onSuccess;
                            if(config.onCancel) window.onCannPayCancel = config.onCancel;
                        }
                    };
                    // Override fetch/ajax if needed or listen to postMessages
                    true;
                `}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        backgroundColor: '#fff',
    }
});
