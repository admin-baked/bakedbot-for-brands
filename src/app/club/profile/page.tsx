'use client';

import { useState, useCallback } from 'react';
import { useClub } from '../components/ClubProvider';
import { updateMemberProfile } from '@/server/actions/club';
import { Save, LogOut, ExternalLink } from 'lucide-react';

const CATEGORIES = ['Flower', 'Edibles', 'Vapes', 'Concentrates', 'Pre-Rolls', 'Topicals', 'Tinctures', 'Accessories'];

function maskPhone(phone?: string): string {
    if (!phone) return '---';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `(***) ***-${digits.slice(-4)}`;
}

export default function ClubProfilePage() {
    const { member, membership, loading, refresh } = useClub();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [smsConsent, setSmsConsent] = useState(false);
    const [emailConsent, setEmailConsent] = useState(false);
    const [pushConsent, setPushConsent] = useState(false);
    const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Initialize form state from member data once loaded
    if (member && !initialized) {
        setFirstName(member.firstName ?? '');
        setLastName(member.lastName ?? '');
        setEmail(member.email ?? '');
        setSmsConsent(member.communicationConsent?.sms ?? false);
        setEmailConsent(member.communicationConsent?.email ?? false);
        setPushConsent(member.communicationConsent?.push ?? false);
        setFavoriteCategories(member.preferences?.favoriteCategories ?? []);
        setInitialized(true);
    }

    const toggleCategory = useCallback((cat: string) => {
        setFavoriteCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!member) return;
        setSaving(true);
        setSaved(false);
        try {
            await updateMemberProfile(member.id, {
                firstName,
                lastName,
                email: email || undefined,
                preferences: { favoriteCategories },
                communicationConsent: { sms: smsConsent, email: emailConsent, push: pushConsent },
            });
            setSaved(true);
            refresh();
        } finally {
            setSaving(false);
        }
    }, [member, firstName, lastName, email, favoriteCategories, smsConsent, emailConsent, pushConsent, refresh]);

    if (loading) {
        return <ProfileLoadingSkeleton />;
    }

    if (!member) {
        return (
            <div className="px-4 pt-12 text-center space-y-4">
                <h2 className="text-lg font-semibold">Not Signed In</h2>
                <p className="text-sm text-white/50">
                    Add your phone number to the URL to view your profile.
                </p>
            </div>
        );
    }

    const memberSince = new Date(member.createdAt).toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
    });

    return (
        <div className="px-4 pt-6 space-y-6">
            <h1 className="text-xl font-bold">Profile</h1>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="First Name">
                    <input
                        type="text"
                        value={firstName}
                        onChange={e => { setFirstName(e.target.value); setSaved(false); }}
                        className="club-input"
                    />
                </FieldGroup>
                <FieldGroup label="Last Name">
                    <input
                        type="text"
                        value={lastName}
                        onChange={e => { setLastName(e.target.value); setSaved(false); }}
                        className="club-input"
                    />
                </FieldGroup>
            </div>

            {/* Phone (read-only) */}
            <FieldGroup label="Phone">
                <p className="club-input opacity-50 cursor-not-allowed">{maskPhone(member.phone)}</p>
            </FieldGroup>

            {/* Email */}
            <FieldGroup label="Email">
                <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setSaved(false); }}
                    placeholder="your@email.com"
                    className="club-input"
                />
            </FieldGroup>

            {/* Communication Preferences */}
            <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-white/60">Communication</legend>
                <Toggle label="SMS" checked={smsConsent} onChange={v => { setSmsConsent(v); setSaved(false); }} />
                <Toggle label="Email" checked={emailConsent} onChange={v => { setEmailConsent(v); setSaved(false); }} />
                <Toggle label="Push Notifications" checked={pushConsent} onChange={v => { setPushConsent(v); setSaved(false); }} />
            </fieldset>

            {/* Favorite Categories */}
            <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-white/60 mb-2">Favorite Categories</legend>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => {
                        const selected = favoriteCategories.includes(cat);
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    selected
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                                }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* Member since */}
            <p className="text-xs text-white/30">
                Member since {memberSince}
                {membership && ` \u00b7 ${membership.stats.visitCount} visits`}
            </p>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
                <Save size={16} />
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>

            {/* Links */}
            <div className="space-y-2 pt-2">
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50">
                    <ExternalLink size={12} /> Terms of Service
                </a>
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50">
                    <ExternalLink size={12} /> Privacy Policy
                </a>
            </div>

            {/* Sign Out */}
            <button className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <LogOut size={16} />
                Sign Out
            </button>

            {/* Powered by */}
            <p className="text-center text-[10px] text-white/20 pt-2 pb-2">
                Powered by BakedBot
            </p>

            {/* Inline styles for club inputs */}
            <style jsx global>{`
                .club-input {
                    display: block;
                    width: 100%;
                    height: 44px;
                    padding: 0 12px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: white;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.15s;
                }
                .club-input:focus {
                    border-color: rgba(34,197,94,0.5);
                }
                .club-input::placeholder {
                    color: rgba(255,255,255,0.25);
                }
            `}</style>
        </div>
    );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-white/40">{label}</label>
            {children}
        </div>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full h-11 px-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
            <span className="text-sm text-white/70">{label}</span>
            <div className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-white/15'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`} />
            </div>
        </button>
    );
}

function ProfileLoadingSkeleton() {
    return (
        <div className="px-4 pt-6 space-y-4 animate-pulse">
            <div className="h-6 w-16 bg-white/10 rounded" />
            <div className="grid grid-cols-2 gap-3">
                <div className="h-14 bg-white/5 rounded-xl" />
                <div className="h-14 bg-white/5 rounded-xl" />
            </div>
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-24 bg-white/5 rounded-xl" />
        </div>
    );
}
