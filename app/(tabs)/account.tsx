/**
 * Account Screen — Full redesign
 * iOS Settings-style layout with dark hero + sectioned rows
 */

import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { User, HelpCircle, LogOut, ChevronRight, Shield, Lock, Star, Phone, Mail, CakeSlice, Hash } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useThemedAlert } from '@/components/ThemedAlert';
import { userAPI } from '@/lib/api';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider, logout } = useAuth();
  const { goOffline } = useLocation();
  const { activeOrders } = useOrders();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [profile, setProfile] = useState<{ email?: string; dateOfBirth?: string; upiId?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = React.useCallback(async () => {
    if (!rider?.phone) { setProfileLoading(false); return; }
    setProfileLoading(true);
    try {
      const p = await userAPI.getUser(rider.phone, 'RIDER');
      setProfile({ email: p.email, dateOfBirth: p.dateOfBirth, upiId: p.upiId });
    } catch { setProfile({}); }
    finally { setProfileLoading(false); }
  }, [rider?.phone]);

  useFocusEffect(React.useCallback(() => { loadProfile(); }, [loadProfile]));

  const initials = rider?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'RD';

  const handleEditProfile = () => router.push('/edit-profile' as any);

  const handleHelpSupport = () =>
    showAlert('Need Help?', 'Contact our support team at support@honesteats.com or call +91-1234567890', undefined, 'info');

  const handleDataAndPrivacy = () =>
    showAlert(
      'Data & Privacy',
      'YumDude Rider collects your precise location (including in the background while online) to assign nearby orders, show routes, and share live ETA. We also use your phone number for sign-in, your camera/photos for document verification, and notifications for order alerts.\n\nYour location and contact details are shared with the assigned restaurant and customer during active deliveries.',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Full policy', style: 'default', onPress: () => Linking.openURL('https://yumdude.com/rider-policy').catch(() => {}) },
      ],
      'info',
    );

  const handleLogout = () => {
    if (activeOrders.length > 0) {
      showAlert('Cannot Logout',
        `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. Complete all deliveries first.`,
        undefined, 'warning');
      return;
    }
    showAlert('Logout', 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => { await logout(goOffline); router.replace('/welcome'); } },
      ],
      'warning',
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>

        {/* ── DARK HERO ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {/* Name / phone */}
            <View style={styles.heroCopy}>
              <Text style={styles.heroName} numberOfLines={1}>{rider?.name ?? 'Rider'}</Text>
              <Text style={styles.heroPhone}>{rider?.phone}</Text>
              {profile?.upiId && <Text style={styles.heroUpi}>UPI: {profile.upiId}</Text>}
              {profileLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" style={{ marginTop: 4 }} />}
            </View>
            {/* Verified badge */}
            <View style={styles.verifiedBadge}>
              <Shield size={11} color="#FFC52E" strokeWidth={2.5} fill="none" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── PROFILE DETAILS ── */}
          {!profileLoading && (profile?.email || profile?.dateOfBirth || rider?.riderId) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PROFILE</Text>
              <View style={styles.card}>
                {profile?.email ? (
                  <InfoRow icon={<Mail size={16} color="#E8352A" strokeWidth={2.5} />} label="Email" value={profile.email} last={!profile?.dateOfBirth && !rider?.riderId} />
                ) : null}
                {profile?.dateOfBirth ? (
                  <InfoRow icon={<CakeSlice size={16} color="#E8352A" strokeWidth={2.5} />} label="Date of Birth" value={profile.dateOfBirth} last={!rider?.riderId} />
                ) : null}
                {rider?.riderId ? (
                  <InfoRow icon={<Hash size={16} color="#E8352A" strokeWidth={2.5} />} label="Rider ID" value={rider.riderId} last />
                ) : null}
              </View>
            </View>
          )}

          {/* ── SETTINGS ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.card}>
              <MenuRow
                icon={<User size={18} color="#E8352A" strokeWidth={2.5} />}
                iconBg="#FCECEA"
                title="Edit Profile"
                desc="Update your personal information"
                onPress={handleEditProfile}
              />
              <MenuRow
                icon={<Lock size={18} color="#8B5CF6" strokeWidth={2.5} />}
                iconBg="#F3EFFE"
                title="Data & Privacy"
                desc="Review what data we collect"
                onPress={handleDataAndPrivacy}
              />
              <MenuRow
                icon={<HelpCircle size={18} color="#0284C7" strokeWidth={2.5} />}
                iconBg="#E0F2FE"
                title="Help & Support"
                desc="Get assistance and FAQs"
                onPress={handleHelpSupport}
                last
              />
            </View>
          </View>

          {/* ── LOGOUT ── */}
          <View style={styles.section}>
            <View style={styles.card}>
              <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.8}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#E8352A" strokeWidth={2.5} />
                </View>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
      <AlertComponent />
    </>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.rowLast]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({ icon, iconBg, title, desc, onPress, last }: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string; onPress: () => void; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuRow, last && styles.rowLast]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      <ChevronRight size={18} color="#C4A99B" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF7' },

  // HERO
  hero: {
    backgroundColor: '#1A0C08',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E8352A', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  heroCopy: { flex: 1, gap: 2 },
  heroName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  heroPhone: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  heroUpi: { fontSize: 11, fontWeight: '600', color: 'rgba(255,197,46,0.8)', marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,197,46,0.12)', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,197,46,0.25)',
    flexShrink: 0,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#FFC52E', letterSpacing: 0.3 },

  // FEED
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  // SECTIONS
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9E7A6A', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 6, marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F0E8E4',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  rowLast: { borderBottomWidth: 0 },

  // INFO ROW
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F5EDE9',
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FCECEA', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#9E7A6A', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1A0C08' },

  // MENU ROW
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5EDE9',
  },
  menuIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuCopy: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1A0C08' },
  menuDesc: { fontSize: 12, fontWeight: '400', color: '#9E7A6A', marginTop: 1 },

  // LOGOUT
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#E8352A' },
});
