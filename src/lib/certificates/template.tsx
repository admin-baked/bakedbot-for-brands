/**
 * Certificate PDF Template
 *
 * Professional certificate design using React PDF
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (optional - for better typography)
// Font.register({
//     family: 'Playfair Display',
//     src: 'https://fonts.gstatic.com/s/playfairdisplay/v30/...',
// });

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        padding: 60,
        fontFamily: 'Helvetica',
    },
    border: {
        border: '4pt solid #667eea',
        padding: 40,
        height: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 10,
    },
    title: {
        fontSize: 42,
        fontFamily: 'Helvetica-Bold',
        color: '#667eea',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
    },
    body: {
        alignItems: 'center',
        marginTop: 30,
    },
    nameLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    name: {
        fontSize: 36,
        fontFamily: 'Helvetica-Bold',
        color: '#1a1a1a',
        marginBottom: 30,
        borderBottom: '2pt solid #667eea',
        paddingBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 20,
        maxWidth: 500,
    },
    program: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#667eea',
        marginBottom: 20,
    },
    skills: {
        marginTop: 30,
        marginBottom: 30,
    },
    skillsTitle: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    skillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    skillBadge: {
        backgroundColor: '#f0f4ff',
        borderRadius: 4,
        padding: '6pt 12pt',
    },
    skillText: {
        fontSize: 10,
        color: '#667eea',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        left: 60,
        right: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTop: '1pt solid #ddd',
        paddingTop: 20,
    },
    footerLeft: {
        flex: 1,
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    date: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    certId: {
        fontSize: 10,
        color: '#999',
        marginBottom: 10,
    },
    verifyText: {
        fontSize: 9,
        color: '#999',
    },
    qrCode: {
        width: 80,
        height: 80,
    },
    signature: {
        width: 120,
        height: 40,
        marginTop: 10,
    },
    signatureName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#333',
        marginTop: 5,
    },
    signatureTitle: {
        fontSize: 10,
        color: '#666',
    },
});

interface CertificateData {
    userName: string;
    cohortName: string;
    startDate: Date;
    endDate: Date;
    certificateId: string;
    issueDate: Date;
    skills: string[];
    verificationUrl: string;
    qrCodeDataUrl: string; // Base64 QR code image
}

export const CertificateTemplate: React.FC<{ data: CertificateData }> = ({ data }) => (
    <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.border}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Certificate of Completion</Text>
                    <Text style={styles.subtitle}>BakedBot Builder Bootcamp</Text>
                </View>

                {/* Body */}
                <View style={styles.body}>
                    <Text style={styles.nameLabel}>This is to certify that</Text>
                    <Text style={styles.name}>{data.userName}</Text>

                    <Text style={styles.description}>
                        has successfully completed the BakedBot Builder Bootcamp,
                        demonstrating proficiency in building AI-powered applications
                        with Next.js, TypeScript, Firebase, and cutting-edge agent architecture
                    </Text>

                    <Text style={styles.program}>{data.cohortName}</Text>

                    <Text style={styles.description}>
                        {data.startDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}{' '}
                        -{' '}
                        {data.endDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </Text>

                    {/* Skills Mastered */}
                    <View style={styles.skills}>
                        <Text style={styles.skillsTitle}>Skills Mastered:</Text>
                        <View style={styles.skillsGrid}>
                            {data.skills.map((skill, index) => (
                                <View key={index} style={styles.skillBadge}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <Text style={styles.date}>
                            Issued: {data.issueDate.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                        <Text style={styles.certId}>Certificate ID: {data.certificateId}</Text>
                        <Text style={styles.verifyText}>
                            Verify at: {data.verificationUrl}
                        </Text>

                        <View style={{ marginTop: 20 }}>
                            <Text style={styles.signatureName}>Linus Torvalds (AI)</Text>
                            <Text style={styles.signatureTitle}>Chief Technical Officer</Text>
                            <Text style={styles.signatureTitle}>BakedBot AI</Text>
                        </View>
                    </View>

                    <View style={styles.footerRight}>
                        <Image src={data.qrCodeDataUrl} style={styles.qrCode} />
                        <Text style={styles.verifyText}>Scan to verify</Text>
                    </View>
                </View>
            </View>
        </Page>
    </Document>
);
