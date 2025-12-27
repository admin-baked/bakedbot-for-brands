'use client';

import { useState, useEffect } from 'react';

export default function CeoSettingsTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [emailProvider, setEmailProvider] = useState<'sendgrid' | 'mailjet'>('sendgrid');
    const [videoProvider, setVideoProvider] = useState<'veo' | 'sora'>('veo');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load Settings (Mock) - Using Promise chain, NO async/await
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) {
        return <div style={{ padding: 20 }}>Loading Promise Mode...</div>;
    }

    const handleSave = () => {
        // NO async keyword here
        setSaving(true);
        
        // Use Promise constructor and chains
        new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 500);
        })
        .then(() => {
            alert('Settings Saved (Promise Mode)');
        })
        .catch((error) => {
            console.error('Failed to save settings:', error);
            alert('Error saving settings');
        })
        .finally(() => {
            setSaving(false);
        });
    };

    if (loading) {
        return (
            <div style={{ padding: 20 }}>
                Loading Settings...
            </div>
        );
    }

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>System Settings (Promise Mode)</h2>
            <p className="mb-4 text-green-600 font-mono text-sm">Async/Await removed to bypass compiler bug.</p>

            {/* Video Provider Selection */}
            <div style={{ border: '1px solid #ccc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Video Provider</h3>
                <p style={{ color: '#666', marginBottom: 10 }}>Select the primary AI model for video generation.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div 
                        onClick={() => setVideoProvider('veo')}
                        style={{ 
                            cursor: 'pointer', 
                            border: videoProvider === 'veo' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15,
                            borderRadius: 6,
                            backgroundColor: videoProvider === 'veo' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>Google Veo 3</strong>
                        <p>Vertex AI (Default)</p>
                    </div>

                    <div 
                        onClick={() => setVideoProvider('sora')}
                        style={{ 
                            cursor: 'pointer', 
                            border: videoProvider === 'sora' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15,
                            borderRadius: 6,
                            backgroundColor: videoProvider === 'sora' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>OpenAI Sora 2</strong>
                        <p>High Fidelity Fallback</p>
                    </div>
                </div>
            </div>

             {/* Email Provider Selection */}
             <div style={{ border: '1px solid #ccc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Email Provider</h3>
                <p style={{ color: '#666', marginBottom: 10 }}>Configure transactional email service.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div 
                        onClick={() => setEmailProvider('sendgrid')}
                        style={{ 
                            cursor: 'pointer', 
                            border: emailProvider === 'sendgrid' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15,
                            borderRadius: 6,
                            backgroundColor: emailProvider === 'sendgrid' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>SendGrid</strong>
                        <p>Legacy Default</p>
                    </div>

                    <div 
                        onClick={() => setEmailProvider('mailjet')}
                        style={{ 
                            cursor: 'pointer', 
                            border: emailProvider === 'mailjet' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15,
                            borderRadius: 6,
                            backgroundColor: emailProvider === 'mailjet' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>Mailjet</strong>
                        <p>New Provider</p>
                    </div>
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 20 }}>
                <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'black',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                >
                    {saving ? 'Saving...' : 'Save System Changes'}
                </button>
            </div>
        </div>
    );
}
