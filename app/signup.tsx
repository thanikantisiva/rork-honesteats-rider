/**
 * Rider Signup Screen
 * Multi-step KYC form with document capture
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { SignupStepper } from '@/components/SignupStepper';
import { DocumentCapture } from '@/components/DocumentCapture';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderAuthAPI } from '@/lib/api';
import { validateAadharNumber, validatePANNumber, formatAadhar, formatPAN } from '@/utils/image-utils';
import { riderTheme } from '@/theme/riderTheme';

const STEPS = ['Personal Info', 'Aadhar', 'PAN', 'Review'];

export default function SignupScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    aadharNumber: '',
    aadharImageBase64: '',
    panNumber: '',
    panImageBase64: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.firstName.trim()) {
          showAlert('Required', 'Please enter your first name', undefined, 'warning');
          return false;
        }
        if (!formData.lastName.trim()) {
          showAlert('Required', 'Please enter your last name', undefined, 'warning');
          return false;
        }
        if (!formData.phone.trim() || formData.phone.length !== 10) {
          showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number', undefined, 'warning');
          return false;
        }
        if (!formData.address.trim()) {
          showAlert('Required', 'Please enter your address', undefined, 'warning');
          return false;
        }
        return true;

      case 2:
        if (!validateAadharNumber(formData.aadharNumber)) {
          showAlert('Invalid Aadhar', 'Please enter a valid 12-digit Aadhar number', undefined, 'warning');
          return false;
        }
        if (!formData.aadharImageBase64) {
          showAlert('Required', 'Please capture your Aadhar card photo', undefined, 'warning');
          return false;
        }
        return true;

      case 3:
        if (!validatePANNumber(formData.panNumber)) {
          showAlert('Invalid PAN', 'Please enter a valid PAN number (e.g., ABCDE1234F)', undefined, 'warning');
          return false;
        }
        if (!formData.panImageBase64) {
          showAlert('Required', 'Please capture your PAN card photo', undefined, 'warning');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await riderAuthAPI.signup({
        phone: `+91${formData.phone}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        aadharNumber: formData.aadharNumber.replace(/[\s-]/g, ''),
        aadharImageBase64: formData.aadharImageBase64,
        panNumber: formData.panNumber.toUpperCase(),
        panImageBase64: formData.panImageBase64,
      });

      showAlert(
        'Application Submitted!',
        response.message,
        [
          {
            text: 'OK',
            style: 'default',
            onPress: () => router.replace('/verification-pending'),
          },
        ],
        'success'
      );
    } catch (error: any) {
      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.message?.includes('presigned-url') || error.message?.includes('S3')) {
        errorMessage = 'Failed to upload documents. Please check your internet connection and try again.';
      }

      showAlert('Signup Failed', errorMessage, undefined, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={22} color={riderTheme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Onboarding</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.stepperWrap}>
          <SignupStepper currentStep={currentStep} steps={STEPS} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior="padding"
          keyboardVerticalOffset={0}
        >

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Personal Information</Text>
                <Text style={styles.stepDescription}>Add your basic profile and delivery address details.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter first name"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={formData.firstName}
                    onChangeText={(text) => updateField('firstName', text)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter last name"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={formData.lastName}
                    onChangeText={(text) => updateField('lastName', text)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <View style={styles.phoneInput}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.phoneInputField}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={riderTheme.colors.textMuted}
                      value={formData.phone}
                      onChangeText={(text) => updateField('phone', text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter your full address"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={formData.address}
                    onChangeText={(text) => updateField('address', text)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Aadhar Verification</Text>
                <Text style={styles.stepDescription}>We need your Aadhar for identity verification.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aadhar Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="XXXX-XXXX-XXXX"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={formData.aadharNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      updateField('aadharNumber', cleaned);
                    }}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  {formData.aadharNumber && (
                    <Text style={styles.hint}>Formatted: {formatAadhar(formData.aadharNumber)}</Text>
                  )}
                </View>

                <DocumentCapture
                  title="Aadhar Card Photo"
                  description="Take a clear photo of your Aadhar card (front side)"
                  onImageCaptured={(base64) => updateField('aadharImageBase64', base64)}
                  currentImage={formData.aadharImageBase64}
                />
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>PAN Verification</Text>
                <Text style={styles.stepDescription}>PAN card is required for tax and payouts.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PAN Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ABCDE1234F"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={formData.panNumber}
                    onChangeText={(text) => updateField('panNumber', text.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                  {formData.panNumber && (
                    <Text style={styles.hint}>Format: 5 letters, 4 digits, 1 letter</Text>
                  )}
                </View>

                <DocumentCapture
                  title="PAN Card Photo"
                  description="Take a clear photo of your PAN card"
                  onImageCaptured={(base64) => updateField('panImageBase64', base64)}
                  currentImage={formData.panImageBase64}
                />
              </View>
            )}

            {currentStep === 4 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Review & Submit</Text>
                <Text style={styles.stepDescription}>Check details before sending your application.</Text>

                <View style={styles.reviewCard}>
                  <Text style={styles.reviewSectionTitle}>Personal Information</Text>
                  <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Name:</Text><Text style={styles.reviewValue}>{formData.firstName} {formData.lastName}</Text></View>
                  <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Mobile:</Text><Text style={styles.reviewValue}>{formData.phone}</Text></View>
                  <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Address:</Text><Text style={styles.reviewValue}>{formData.address}</Text></View>
                </View>

                <View style={styles.reviewCard}>
                  <Text style={styles.reviewSectionTitle}>Aadhar Details</Text>
                  <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Number:</Text><Text style={styles.reviewValue}>{formatAadhar(formData.aadharNumber)}</Text></View>
                  <Text style={styles.reviewLabel}>Photo:</Text>
                  {formData.aadharImageBase64 && <View style={styles.docThumbnail}><Text style={styles.docThumbnailText}>Aadhar card uploaded</Text></View>}
                </View>

                <View style={styles.reviewCard}>
                  <Text style={styles.reviewSectionTitle}>PAN Details</Text>
                  <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Number:</Text><Text style={styles.reviewValue}>{formatPAN(formData.panNumber)}</Text></View>
                  <Text style={styles.reviewLabel}>Photo:</Text>
                  {formData.panImageBase64 && <View style={styles.docThumbnail}><Text style={styles.docThumbnailText}>PAN card uploaded</Text></View>}
                </View>

                <View style={styles.disclaimer}>
                  <ShieldCheck size={14} color={riderTheme.colors.info} />
                  <Text style={styles.disclaimerText}>
                    By submitting, you confirm that all details are accurate and can be verified.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {currentStep < 4 ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.88}>
                <Text style={styles.nextButtonText}>Continue</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Uploading documents...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: riderTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  stepperWrap: {
    backgroundColor: riderTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.border,
  },
  content: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: riderTheme.colors.textSecondary,
    marginBottom: 28,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    borderRadius: riderTheme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: riderTheme.colors.textPrimary,
    fontWeight: '500',
    ...riderTheme.shadow.small,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    borderRadius: riderTheme.radius.lg,
    overflow: 'hidden',
    ...riderTheme.shadow.small,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRightWidth: 2,
    borderRightColor: riderTheme.colors.border,
  },
  phoneInputField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
    color: riderTheme.colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 11,
    color: riderTheme.colors.success,
    marginTop: 6,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    ...riderTheme.shadow.medium,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  reviewLabel: {
    fontSize: 12,
    color: riderTheme.colors.textSecondary,
    width: 80,
    fontWeight: '700',
  },
  reviewValue: {
    fontSize: 12,
    color: riderTheme.colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  docThumbnail: {
    backgroundColor: riderTheme.colors.successSoft,
    padding: 12,
    borderRadius: riderTheme.radius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: riderTheme.colors.success,
  },
  docThumbnailText: {
    fontSize: 12,
    color: riderTheme.colors.success,
    fontWeight: '700',
  },
  disclaimer: {
    backgroundColor: riderTheme.colors.infoSoft,
    padding: 16,
    borderRadius: riderTheme.radius.lg,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: riderTheme.colors.info,
  },
  disclaimerText: {
    fontSize: 11,
    color: riderTheme.colors.infoDark,
    lineHeight: 17,
    flex: 1,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: riderTheme.colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: riderTheme.colors.border,
    ...riderTheme.shadow.medium,
  },
  nextButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...riderTheme.shadow.large,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: riderTheme.colors.success,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...riderTheme.shadow.large,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
