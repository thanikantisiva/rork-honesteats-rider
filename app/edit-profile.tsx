import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Save, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/lib/api';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderTheme } from '@/theme/riderTheme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider, updateRider } = useAuth();
  const { showAlert, AlertComponent } = useThemedAlert();

  const [name, setName] = useState(rider?.name || '');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const normalizeDob = (value?: string) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yyyy, mm, dd] = value.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    return value;
  };

  const formatDobInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!rider?.phone) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await userAPI.getUser(rider.phone, 'RIDER');
        setName(profile.name || rider.name || '');
        setEmail(profile.email || '');
        setDateOfBirth(normalizeDob(profile.dateOfBirth));
        setUpiId(profile.upiId || '');
      } catch (error) {
        console.error('Failed to load rider profile:', error);
        setName(rider.name || '');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [rider?.phone, rider?.name]);

  const handleSave = async () => {
    if (!rider?.phone) {
      showAlert('Error', 'Rider profile not available', undefined, 'error');
      return;
    }

    if (!name.trim()) {
      showAlert('Required', 'Please enter your name', undefined, 'warning');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address', undefined, 'warning');
      return;
    }

    if (dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
      showAlert('Invalid Date', 'Please enter date in DD/MM/YYYY format', undefined, 'warning');
      return;
    }

    if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      showAlert('Invalid UPI', 'UPI ID should be like name@bank or name@upi', undefined, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const response = await userAPI.updateUser(rider.phone, {
        role: 'RIDER',
        name: name.trim(),
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });

      await updateRider({
        name: response.name || name.trim(),
      });

      showAlert(
        'Success',
        'Profile updated successfully',
        [{ text: 'OK', onPress: () => router.back() }],
        'success'
      );
    } catch (error) {
      console.error('Failed to update rider profile:', error);
      showAlert('Error', 'Failed to update profile. Please try again.', undefined, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={20} color={riderTheme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={riderTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={riderTheme.colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={riderTheme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={riderTheme.colors.textMuted}
                  value={dateOfBirth}
                  onChangeText={(value) => setDateOfBirth(formatDobInput(value))}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'number-pad'}
                  maxLength={10}
                />
                <Text style={styles.hint}>Format: DD/MM/YYYY</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>UPI ID (for settlements)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@bank or name@upi"
                  placeholderTextColor={riderTheme.colors.textMuted}
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{rider?.phone}</Text>
                <Text style={styles.infoHint}>Phone number cannot be changed</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Rider ID</Text>
                <Text style={styles.infoValue}>{rider?.riderId}</Text>
              </View>

              <View style={styles.bottomSpacing} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: riderTheme.spacing.lg,
    paddingBottom: riderTheme.spacing.lg,
    backgroundColor: riderTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: riderTheme.radius.xl,
    backgroundColor: riderTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingTop: riderTheme.spacing.lg,
  },
  section: {
    paddingHorizontal: riderTheme.spacing.lg,
    marginBottom: riderTheme.spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
    color: riderTheme.colors.textPrimary,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    color: riderTheme.colors.textMuted,
    marginTop: 6,
  },
  infoBox: {
    backgroundColor: riderTheme.colors.surface,
    padding: riderTheme.spacing.lg,
    marginHorizontal: riderTheme.spacing.lg,
    marginBottom: riderTheme.spacing.md,
    borderRadius: riderTheme.radius.md,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 4,
  },
  infoHint: {
    fontSize: 11,
    fontWeight: '400',
    color: riderTheme.colors.textMuted,
  },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    backgroundColor: riderTheme.colors.surface,
    padding: riderTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: riderTheme.colors.borderLight,
  },
  saveButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: riderTheme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...riderTheme.shadow.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
