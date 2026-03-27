/**
 * Themed Alert Component for Rider App
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react-native';
import { riderTheme } from '@/theme/riderTheme';

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
  onClose,
}: ThemedAlertProps) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: riderTheme.colors.success,
      bgColor: riderTheme.colors.successSoft,
      titleColor: riderTheme.colors.success,
    },
    error: {
      icon: AlertCircle,
      iconColor: riderTheme.colors.danger,
      bgColor: riderTheme.colors.dangerSoft,
      titleColor: riderTheme.colors.danger,
    },
    warning: {
      icon: AlertTriangle,
      iconColor: riderTheme.colors.warning,
      bgColor: riderTheme.colors.warningSoft,
      titleColor: riderTheme.colors.warning,
    },
    info: {
      icon: Info,
      iconColor: riderTheme.colors.info,
      bgColor: riderTheme.colors.infoSoft,
      titleColor: riderTheme.colors.info,
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
            <Icon size={30} color={iconColor} strokeWidth={2.5} />
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
                    buttons.length === 1 && { flex: 1 },
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.88}
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
    backgroundColor: riderTheme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    ...riderTheme.shadow.card,
  },
  iconContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: riderTheme.radius.md,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: riderTheme.colors.primary,
  },
  buttonDestructive: {
    backgroundColor: riderTheme.colors.danger,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: riderTheme.colors.textSecondary,
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
