import { View } from 'react-native';
import { SmokeyPay } from '../components/SmokeyPay';
import { router } from 'expo-router';

export default function PayScreen() {
    return (
        <View style={{ flex: 1 }}>
            <SmokeyPay
                widgetUrl="https://widget.canpayapp.com?intent_id=mock_intent_123"
                onSuccess={() => {
                    alert('Payment Successful!');
                    router.back();
                }}
                onCancel={() => router.back()}
            />
        </View>
    );
}
