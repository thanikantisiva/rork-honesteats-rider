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
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SignupStepper } from '@/components/SignupStepper';
import { DocumentCapture } from '@/components/DocumentCapture';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderAuthAPI } from '@/lib/api';
import { validateAadharNumber, validatePANNumber, formatAadhar, formatPAN } from '@/utils/image-utils';

const STEPS = ['Personal Info', 'Aadhar', 'PAN', 'Review'];

export default function SignupScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
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
    if (validateStep()) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
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
      console.log('[Signup] Starting signup process...');
      console.log('[Signup] Uploading documents to S3...');
      
      const response = await riderAuthAPI.signup({
        phone: `+91${formData.phone}`,  // Add +91 prefix
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        aadharNumber: formData.aadharNumber.replace(/[\s-]/g, ''),
        aadharImageBase64: formData.aadharImageBase64,
        panNumber: formData.panNumber.toUpperCase(),
        panImageBase64: formData.panImageBase64,
      });

      console.log('[Signup] Application submitted successfully');
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
      console.error('[Signup] Signup error:', error);
      let errorMessage = 'Failed to submit application. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Specific error messages
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
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ChevronLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Become a Delivery Partner</Text>
            <View style={{ width: 40 }} />
          </View>

          <SignupStepper currentStep={currentStep} steps={STEPS} />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Personal Information</Text>
              <Text style={styles.stepDescription}>
                Please provide your basic details
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
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
                  value={formData.address}
                  onChangeText={(text) => updateField('address', text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* Step 2: Aadhar Verification */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Aadhar Verification</Text>
              <Text style={styles.stepDescription}>
                We need your Aadhar for identity verification
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Aadhar Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XXXX-XXXX-XXXX"
                  value={formData.aadharNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    updateField('aadharNumber', cleaned);
                  }}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                {formData.aadharNumber && (
                  <Text style={styles.hint}>
                    Formatted: {formatAadhar(formData.aadharNumber)}
                  </Text>
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

          {/* Step 3: PAN Verification */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>PAN Verification</Text>
              <Text style={styles.stepDescription}>
                PAN card is required for tax purposes
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PAN Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ABCDE1234F"
                  value={formData.panNumber}
                  onChangeText={(text) => updateField('panNumber', text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {formData.panNumber && (
                  <Text style={styles.hint}>
                    Format: 5 letters, 4 digits, 1 letter
                  </Text>
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

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Review & Submit</Text>
              <Text style={styles.stepDescription}>
                Please review your information before submitting
              </Text>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionTitle}>Personal Information</Text>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Name:</Text>
                  <Text style={styles.reviewValue}>
                    {formData.firstName} {formData.lastName}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Mobile:</Text>
                  <Text style={styles.reviewValue}>{formData.phone}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Address:</Text>
                  <Text style={styles.reviewValue}>{formData.address}</Text>
                </View>
              </View>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionTitle}>Aadhar Details</Text>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Number:</Text>
                  <Text style={styles.reviewValue}>{formatAadhar(formData.aadharNumber)}</Text>
                </View>
                <Text style={styles.reviewLabel}>Photo:</Text>
                {formData.aadharImageBase64 && (
                  <View style={styles.docThumbnail}>
                    <Text style={styles.docThumbnailText}>✓ Aadhar card uploaded</Text>
                  </View>
                )}
              </View>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionTitle}>PAN Details</Text>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Number:</Text>
                  <Text style={styles.reviewValue}>{formatPAN(formData.panNumber)}</Text>
                </View>
                <Text style={styles.reviewLabel}>Photo:</Text>
                {formData.panImageBase64 && (
                  <View style={styles.docThumbnail}>
                    <Text style={styles.docThumbnailText}>✓ PAN card uploaded</Text>
                  </View>
                )}
              </View>

              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  By submitting, you agree that the information provided is accurate and you consent to
                  verification of your documents.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {currentStep < 4 ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  phoneInputField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    fontWeight: '600',
  },
  docThumbnail: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  docThumbnailText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  disclaimer: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
