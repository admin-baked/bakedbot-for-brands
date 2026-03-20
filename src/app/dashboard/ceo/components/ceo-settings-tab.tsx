'use client';

import { useState, useEffect } from 'react';
import {
    getSafeEmailProviderAction as getEmail,
    updateSafeEmailProviderAction as updateEmail,
    getOrgVideoProviderAction as getVideo,
    updateOrgVideoProviderAction as updateVideo,
} from '@/server/actions/super-admin/safe-settings';

export default function CeoSettingsTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [emailProvider, setEmailProvider] = useState<'sendgrid' | 'mailjet'>('sendgrid');
    const [videoProvider, setVideoProvider] = useState<'veo' | 'sora' | 'sora-pro' | 'kling' | 'wan' | 'remotion'>('kling');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load Settings using Promise Chains (No async/await)
        Promise.all([
            getEmail(),
            getVideo()
        ])
        .then(([emailRes, videoRes]) => {
            if (emailRes) setEmailProvider(emailRes as 'sendgrid' | 'mailjet');
            if (videoRes) setVideoProvider(videoRes as 'veo' | 'sora' | 'sora-pro' | 'kling' | 'wan' | 'remotion');
        })
        .catch(err => {
            console.error('Failed to load settings:', err);
        })
        .finally(() => {
            setLoading(false);
        });
    }, []);

    if (!mounted) {
        return <div style={{ padding: 20 }}>Loading System Settings...</div>;
    }

    const handleSave = () => {
        setSaving(true);
        
        // Save Settings using Promise Chains (No async/await)
        Promise.all([
            updateEmail({ provider: emailProvider }),
            updateVideo({ provider: videoProvider })
        ])
        .then(() => {
            alert('Settings Saved Successfully');
        })
        .catch((error) => {
            console.error('Failed to save settings:', error);
            alert('Error saving settings. Check console.');
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>System Settings</h2>

            {/* Video Provider Selection */}
            <div style={{ border: '1px solid #ccc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Video Provider</h3>
                <p style={{ color: '#666', marginBottom: 10 }}>Select the primary AI model for video generation.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {/* ── fal.ai row ── */}
                    <div
                        onClick={() => setVideoProvider('kling')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'kling' ? '2px solid #22c55e' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'kling' ? '#f0fdf4' : 'white'
                        }}
                    >
                        <strong>⭐ Kling v2 Master</strong>
                        <p style={{ color: '#16a34a', fontWeight: 600 }}>fal.ai — $0.045/sec</p>
                        <p style={{ fontSize: 12, color: '#666' }}>Cinema motion quality. 8× cheaper than Veo. Recommended for pilots.</p>
                    </div>

                    <div
                        onClick={() => setVideoProvider('wan')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'wan' ? '2px solid #22c55e' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'wan' ? '#f0fdf4' : 'white'
                        }}
                    >
                        <strong>Wan 2.1</strong>
                        <p style={{ color: '#16a34a', fontWeight: 600 }}>fal.ai — $0.01/sec</p>
                        <p style={{ fontSize: 12, color: '#666' }}>Ultra-cheap drafts. 35× cheaper than Veo. High volume campaigns.</p>
                    </div>

                    <div
                        onClick={() => setVideoProvider('remotion')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'remotion' ? '2px solid #8b5cf6' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'remotion' ? '#faf5ff' : 'white'
                        }}
                    >
                        <strong>Remotion React</strong>
                        <p style={{ color: '#7c3aed', fontWeight: 600 }}>Branded — $0 render cost</p>
                        <p style={{ fontSize: 12, color: '#666' }}>Brand colors, logo, CTA. Needs Cloud Run + bundle. Falls back to Kling.</p>
                    </div>

                    {/* ── legacy row ── */}
                    <div
                        onClick={() => setVideoProvider('veo')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'veo' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'veo' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>Google Veo 3</strong>
                        <p style={{ color: '#666', fontSize: 12 }}>$0.35/sec — Preview access required</p>
                    </div>

                    <div
                        onClick={() => setVideoProvider('sora')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'sora' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'sora' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>OpenAI Sora 2</strong>
                        <p style={{ color: '#666', fontSize: 12 }}>Social media speed</p>
                    </div>

                    <div
                        onClick={() => setVideoProvider('sora-pro')}
                        style={{
                            cursor: 'pointer',
                            border: videoProvider === 'sora-pro' ? '2px solid blue' : '2px solid #ddd',
                            padding: 15, borderRadius: 6,
                            backgroundColor: videoProvider === 'sora-pro' ? '#f0f9ff' : 'white'
                        }}
                    >
                        <strong>OpenAI Sora 2 Pro</strong>
                        <p style={{ color: '#666', fontSize: 12 }}>Marketing quality</p>
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
