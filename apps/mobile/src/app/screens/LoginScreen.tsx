import React, { useState } from 'react';
import { View, Text, Image, ImageBackground, SafeAreaView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // TODO: wire up real Google auth (expo-auth-session / firebase / etc.)
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } finally {
      setLoading(false);
    }
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
                disabled={loading}
                onPress={handleGoogleSignIn}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.googleButtonPressed,
                  loading && styles.googleButtonDisabled,
                ]}
              >
                {loading ? (
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
});
