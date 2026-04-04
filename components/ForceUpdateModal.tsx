import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { riderTheme } from '@/theme/riderTheme';

interface Props {
  visible: boolean;
  onUpdate: () => void;
}

export function ForceUpdateModal({ visible, onUpdate }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>↑</Text>
          </View>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A new version of YumDude Rider is available. Please update the app
            to continue accepting deliveries.
          </Text>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={onUpdate}
          >
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: riderTheme.colors.background,
    padding: riderTheme.spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: riderTheme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: riderTheme.spacing.xl,
  },
  icon: {
    fontSize: 36,
    color: riderTheme.colors.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: riderTheme.typography.h2,
    fontWeight: riderTheme.fontWeight.bold,
    color: riderTheme.colors.textPrimary,
    marginBottom: riderTheme.spacing.md,
  },
  message: {
    fontSize: riderTheme.typography.h5,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: riderTheme.spacing.xxl,
  },
  button: {
    backgroundColor: riderTheme.colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: riderTheme.radius.md,
  },
  buttonText: {
    color: riderTheme.colors.textInverse,
    fontSize: riderTheme.typography.h5,
    fontWeight: riderTheme.fontWeight.semibold,
  },
});
