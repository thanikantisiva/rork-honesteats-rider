/**
 * Themed Alert Component for Rider App
 * Uses blue theme instead of red
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { AlertCircle, CheckCircle, AlertTriangle, CookingPot } from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface ThemedAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }>;
  onClose?: () => void;
}

export function ThemedAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose
}: ThemedAlertProps) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: '#10B981',
      bgColor: '#D1FAE5',
      titleColor: '#10B981',
    },
    error: {
      icon: AlertCircle,
      iconColor: '#EF4444',
      bgColor: '#FEE2E2',
      titleColor: '#EF4444',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#F59E0B',
      bgColor: '#FEF3C7',
      titleColor: '#F59E0B',
    },
    info: {
      icon: CookingPot,
      iconColor: '#3B82F6',
      bgColor: '#DBEAFE',
      titleColor: '#3B82F6',
    },
  };

  const { icon: Icon, iconColor, bgColor, titleColor } = config[type];

  const handleClose = () => {
    onClose?.();
  };

  const handleButtonPress = (button: typeof buttons[0]) => {
    button.onPress?.();
    handleClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Icon size={32} color={iconColor} strokeWidth={2.5} />
          </View>

          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const isPrimary = button.style === 'default' || (!isDestructive && !isCancel);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isPrimary && styles.buttonPrimary,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonSecondary,
                    buttons.length === 1 && { flex: 1 }
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isPrimary && styles.buttonTextPrimary,
                      isDestructive && styles.buttonTextDestructive,
                      isCancel && styles.buttonTextSecondary,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',  // Blue theme for rider app
  },
  buttonDestructive: {
    backgroundColor: '#DC2626',
  },
  buttonSecondary: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#6B7280',
  },
});

export function useThemedAlert() {
  const [alert, setAlert] = React.useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    buttons: ThemedAlertProps['buttons'];
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: ThemedAlertProps['buttons'],
    type: AlertType = 'info'
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [{ text: 'OK', style: 'default' }],
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <ThemedAlert
      visible={alert.visible}
      type={alert.type}
      title={alert.title}
      message={alert.message}
      buttons={alert.buttons}
      onClose={hideAlert}
    />
  );

  return { showAlert, AlertComponent };
}
