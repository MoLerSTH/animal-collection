import React from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { MOCK_DEV_USERS } from '../../features/auth/services/googleAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signInWithGoogle, signInMock, isLoading, isDevMode } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED' && err?.code !== '12501') {
        Alert.alert('Sign-In Notice', 'Could not complete Google Sign-in. Switched to Dev Mode.', [
          {
            text: 'Continue with Mock Account',
            onPress: async () => {
              await signInMock();
              navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    }
  };

  const handleQuickMockLogin = async (userIndex: number) => {
    await signInMock(MOCK_DEV_USERS[userIndex]);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <ImageBackground
      source={require('../../../assets/animal-doodle-bg.png')}
      resizeMode="cover"
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredWrapper}>
          {/* Logo overlapping top of container */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Container card */}
          <View style={styles.card}>
            {/* Spacer for logo overlap */}
            <View style={styles.logoSpacer} />

            <Text style={styles.title}>Animal Collection</Text>

            <View style={styles.buttonContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                disabled={isLoading}
                onPress={handleGoogleSignIn}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.googleButtonPressed,
                  isLoading && styles.googleButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#3A2E2B" />
                ) : (
                  <>
                    <Image
                      source={require('../../../assets/Logo-google.png')}
                      style={styles.googleLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.googleLabel}>Sign in with Google</Text>
                  </>
                )}
              </Pressable>

              {/* Dev Mode Banner & Quick Selectors */}
              {isDevMode && (
                <View style={styles.devSection}>
                  <View style={styles.devBadge}>
                    <Text style={styles.devBadgeText}>🛠️ DEV MODE (MOCK ACTIVE)</Text>
                  </View>
                  <Text style={styles.devSubtext}>Quick switch test profiles:</Text>
                  <View style={styles.quickUserRow}>
                    <Pressable
                      disabled={isLoading}
                      style={[styles.quickUserChip, isLoading && { opacity: 0.5 }]}
                      onPress={() => handleQuickMockLogin(0)}
                    >
                      <Text style={styles.quickUserChipText}>👤 Jane (Ranger)</Text>
                    </Pressable>
                    <Pressable
                      disabled={isLoading}
                      style={[styles.quickUserChip, isLoading && { opacity: 0.5 }]}
                      onPress={() => handleQuickMockLogin(1)}
                    >
                      <Text style={styles.quickUserChipText}>👤 Alex (Collector)</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const LOGO_SIZE = 175;
const LOGO_OVERLAP = LOGO_SIZE / 2;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centeredWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: -175,
  },
  logoWrapper: {
    zIndex: 1,
    marginBottom: -LOGO_OVERLAP,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: LOGO_SIZE - 10,
    height: LOGO_SIZE - 10,
    borderRadius: (LOGO_SIZE - 10) / 2,
  },
  card: {
    width: '75%',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#f7ebdb',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoSpacer: {
    height: LOGO_OVERLAP + 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3A2E2B',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  googleButtonPressed: {
    opacity: 0.8,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#3A2E2B',
  },
  devSection: {
    marginTop: 18,
    alignItems: 'center',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 46, 43, 0.1)',
  },
  devBadge: {
    backgroundColor: '#BA796B',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  devBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  devSubtext: {
    fontSize: 12,
    color: 'rgba(58, 46, 43, 0.7)',
    marginBottom: 8,
  },
  quickUserRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  quickUserChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(186, 121, 107, 0.3)',
  },
  quickUserChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A2E2B',
  },
});
