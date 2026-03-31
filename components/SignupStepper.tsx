/**
 * Signup Stepper Component
 * Modern segmented progress indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { riderTheme } from '@/theme/riderTheme';

interface SignupStepperProps {
  currentStep: number;
  steps: string[];
}

export function SignupStepper({ currentStep, steps }: SignupStepperProps) {
  return (
    <View style={styles.container}>
      {/* Segmented Progress Bar */}
      <View style={styles.segmentsContainer}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={index}>
              <View style={styles.segmentWrapper}>
                {/* Segment Bar */}
                <View
                  style={[
                    styles.segment,
                    isActive && styles.segmentActive,
                    isCompleted && styles.segmentCompleted,
                  ]}
                >
                  {/* Check icon for completed */}
                  {isCompleted && (
                    <View style={styles.checkBadge}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                  {/* Step number for active */}
                  {isActive && (
                    <Text style={styles.activeStepNumber}>{stepNumber}</Text>
                  )}
                </View>
                
                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {step}
                </Text>
              </View>
              
              {/* Connector Line */}
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    (isCompleted || (isActive && index < currentStep - 1)) && styles.connectorActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  segmentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  segment: {
    width: '100%',
    height: 8,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: riderTheme.colors.primary,
    borderColor: riderTheme.colors.primary,
    height: 32,
    borderRadius: 16,
    ...riderTheme.shadow.medium,
  },
  segmentCompleted: {
    backgroundColor: riderTheme.colors.success,
    borderColor: riderTheme.colors.success,
    height: 24,
    borderRadius: 12,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  connector: {
    width: 8,
    height: 2,
    backgroundColor: riderTheme.colors.border,
    marginHorizontal: 2,
    marginBottom: 8,
  },
  connectorActive: {
    backgroundColor: riderTheme.colors.success,
  },
  stepLabel: {
    fontSize: 10,
    color: riderTheme.colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  stepLabelActive: {
    color: riderTheme.colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  stepLabelCompleted: {
    color: riderTheme.colors.success,
    fontWeight: '700',
  },
});
