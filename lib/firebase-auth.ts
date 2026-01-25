/**
 * Firebase Phone Authentication for Rider App
 * Includes mock OTP for testing
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Test phone number - skip Firebase and use mock OTP
const TEST_PHONE = '+919999999999';
const TEST_OTP = '123456';

// Mock confirmation object for test phone
class MockConfirmation {
  async confirm(code: string) {
    if (code === TEST_OTP) {
      return {
        user: {
          phoneNumber: TEST_PHONE,
          getIdToken: async () => `test_token_rider_${TEST_PHONE}_${Date.now()}`
        },
        additionalUserInfo: {
          isNewUser: false
        }
      };
    }
    throw new Error('Invalid OTP');
  }
}

/**
 * Send OTP to phone number via Firebase SDK
 * Uses Play Integrity for device attestation
 * Test phone +919999999999 bypasses Firebase and uses mock OTP
 */
export async function sendFirebaseOTP(
  phoneNumber: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  confirmation?: any;
  testMessage?: string;
}> {
  try {
    // Test phone number - skip Firebase completely
    if (phoneNumber === TEST_PHONE) {
      console.log('🧪 Test phone detected:', phoneNumber, '- Using mock OTP');
      return {
        success: true,
        confirmation: new MockConfirmation(),
        testMessage: `Test mode for riders: OTP is ${TEST_OTP}`
      };
    }
    
    console.log('📤 Sending OTP via Firebase SDK to:', phoneNumber);
    
    // Firebase SDK automatically uses Play Integrity for device attestation
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    
    console.log('✅ OTP sent successfully via Firebase');
    
    return {
      success: true,
      confirmation: confirmation
    };
  } catch (error: any) {
    console.error('❌ Firebase OTP send failed:', error);
    
    // Map Firebase errors to user-friendly messages
    if (error.code === 'auth/invalid-phone-number') {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    } else if (error.code === 'auth/too-many-requests') {
      return {
        success: false,
        error: 'Too many attempts. Please try again later.'
      };
    } else if (error.code === 'auth/quota-exceeded') {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    } else if (error.code === 'auth/missing-client-identifier' || error.code === 'auth/unknown') {
      return {
        success: false,
        error: 'App verification failed. Please check Firebase App Check configuration.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send OTP. Please try again.'
    };
  }
}

/**
 * Verify OTP code via Firebase SDK
 */
export async function verifyFirebaseOTP(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<{
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  isNewUser?: boolean;
  error?: string;
}> {
  try {
    console.log('🔐 Verifying OTP with Firebase SDK...');
    
    // Verify the OTP code
    const result = await confirmation.confirm(code);
    
    console.log('✅ OTP verified successfully');
    
    // Get Firebase ID token (for backend authentication if needed)
    const idToken = await result.user.getIdToken();
    
    return {
      success: true,
      idToken: idToken,
      phoneNumber: result.user.phoneNumber || undefined,
      isNewUser: result.additionalUserInfo?.isNewUser
    };
  } catch (error: any) {
    console.error('❌ OTP verification failed:', error);
    
    // Map Firebase errors
    if (error.code === 'auth/invalid-verification-code') {
      return {
        success: false,
        error: 'Invalid OTP code'
      };
    } else if (error.code === 'auth/code-expired') {
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Verification failed'
    };
  }
}
