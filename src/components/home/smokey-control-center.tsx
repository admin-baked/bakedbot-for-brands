// src/components/home/smokey-control-center.tsx
import styles from '@/app/home.module.css';

export function SmokeyControlCenter() {
    return (
        <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
                <div className={styles.heroCardTitle}>Smokey Control Center</div>
                <div className={styles.heroCardPill}>Live Demo</div>
            </div>
            <div className={styles.heroCardGrid}>
                <div className={styles.heroMiniCard}>
                    <h3 className={styles.heroMiniTitle}>Attributed Revenue</h3>
                    <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Last 7d</span>
                        <span className={styles.metricValue}>$18.4k</span>
                    </div>
                    <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Today</span>
                        <span className={styles.metricValue}>$2.1k</span>
                    </div>
                </div>
                <div className={styles.heroMiniCard}>
                    <h3 className={styles.heroMiniTitle}>Agent Activity</h3>
                    <div className={styles.heroChatBubble}>
                        <div className={styles.heroChatFrom}><span className={styles.dot} />Smokey</div>
                        <p className={styles.heroChatText}>
                            A customer asked for <span className={styles.highlight}>"relaxing indica pre-rolls"</span> and I recommended Gorilla Glue #4.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
