export const TABLET_MOODS = [
    { id: 'relaxed',   emoji: '😌', label: 'Relaxed & Calm',      context: 'indica dominant, CBD-heavy, body relaxation, stress relief, couch-friendly' },
    { id: 'energized', emoji: '⚡', label: 'Energized & Creative', context: 'sativa dominant, uplifting, creative boost, clear-headed, daytime use' },
    { id: 'sleep',     emoji: '😴', label: 'Need Sleep',           context: 'high indica, heavy sedation, sleep aid, nighttime, body high' },
    { id: 'anxious',   emoji: '😰', label: 'Stressed / Anxious',   context: 'high CBD low THC, calming, anxiety relief, gentle, non-intoxicating' },
    { id: 'social',    emoji: '🎉', label: 'Social & Happy',       context: 'hybrid balanced, euphoric, mood-lift, social, giggly, fun' },
    { id: 'pain',      emoji: '😣', label: 'Pain / Discomfort',    context: 'high THC, topicals, pain relief, anti-inflammatory, muscle soreness' },
    { id: 'new',       emoji: '🌱', label: 'New to Cannabis',      context: 'low dose, microdose, beginner friendly, CBD dominant, gentle onset, forgiving' },
] as const;

export type TabletMoodId = typeof TABLET_MOODS[number]['id'];
