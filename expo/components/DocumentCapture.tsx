/**
 * Document Capture Component
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { validateImageSize, getImageSizeMB } from '@/utils/image-utils';
import { riderTheme } from '@/theme/riderTheme';

interface DocumentCaptureProps {
  title: string;
  description: string;
  onImageCaptured: (base64: string) => void;
  currentImage?: string;
  required?: boolean;
}

export function DocumentCapture({
  title,
  description,
  onImageCaptured,
  currentImage,
  required = true,
}: DocumentCaptureProps) {
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      setLoading(true);

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is required');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;

        if (!validateImageSize(base64, 5)) {
          const sizeMB = getImageSizeMB(base64);
          Alert.alert('Image Too Large', `Image size is ${sizeMB.toFixed(1)}MB. Please choose an image smaller than 5MB.`);
          return;
        }

        onImageCaptured(base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    onImageCaptured('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      <Text style={styles.description}>{description}</Text>

      {currentImage ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: currentImage }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <ImageIcon size={42} color={riderTheme.colors.textMuted} />
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.captureButton, styles.cameraButton]}
          onPress={() => pickImage(true)}
          disabled={loading}
          activeOpacity={0.88}
        >
          <Camera size={18} color="#FFFFFF" />
          <Text style={styles.captureButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, styles.galleryButton]}
          onPress={() => pickImage(false)}
          disabled={loading}
          activeOpacity={0.88}
        >
          <ImageIcon size={18} color={riderTheme.colors.primary} />
          <Text style={styles.galleryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  required: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.danger,
    marginLeft: 4,
  },
  description: {
    fontSize: 13,
    color: riderTheme.colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  placeholder: {
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    borderStyle: 'dashed',
    borderRadius: riderTheme.radius.md,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 13,
    color: riderTheme.colors.textMuted,
    marginTop: 7,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 192,
    borderRadius: riderTheme.radius.md,
    backgroundColor: riderTheme.colors.surfaceMuted,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: riderTheme.colors.danger,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...riderTheme.shadow.soft,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  captureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: riderTheme.radius.md,
  },
  cameraButton: {
    backgroundColor: riderTheme.colors.primary,
  },
  galleryButton: {
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.primary,
  },
});
