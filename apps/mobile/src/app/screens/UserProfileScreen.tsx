import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { UserProfile } from '../types';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import {
  BellIcon,
  LockIcon,
  GlobeIcon,
  TrashIcon,
  ChevronRightIcon,
  EditIcon,
} from '../components/ProfileIcons';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'User'>,
  NativeStackScreenProps<RootStackParamList>
>;

const mockUser: UserProfile = {
  id: 'u1',
  name: 'Jane Doe',
  email: 'jane.doe@email.com',
  avatarUri: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop',
  stats: { caught: 4, total: 18, favorites: 2, followers: 18, following: 12 },
  language: 'English',
  notificationsEnabled: true,
};

export default function UserProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuthStore();
  const { summary } = useCollectionStore();

  const currentUser: UserProfile = {
    id: user?.id ?? 'u1',
    name: user?.name ?? 'Jane Doe',
    email: user?.email ?? 'jane.doe@email.com',
    avatarUri: user?.avatarUri ?? 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop',
    stats: {
      caught: summary.caughtCount,
      total: summary.totalCatalog,
      favorites: summary.favoritesCount,
      followers: 18,
      following: 12,
    },
    language: 'English',
    notificationsEnabled: true,
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          (navigation as any).reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your caught animals and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>My Profile</Text>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userInfoRow}>
            <View style={styles.avatarOuterCircle}>
              <View style={styles.avatarInnerBox}>
                {currentUser.avatarUri ? (
                  <Image
                    source={{ uri: currentUser.avatarUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarEmoji}>🦝</Text>
                )}
              </View>
            </View>

            <View style={styles.userDetails}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userEmail}>{currentUser.email}</Text>
              <Pressable onPress={() => {}} style={styles.editProfileRow}>
                <Text style={styles.editProfileText}>Edit Profile </Text>
                <EditIcon color="#BA796B" size={13} />
              </Pressable>
            </View>
          </View>

          {/* Stats Row with separators */}
          <View style={styles.statsContainer}>
            <StatItem label="Caught" value={currentUser.stats.caught} />
            <View style={styles.statDivider} />
            <StatItem label="Total" value={currentUser.stats.total} />
            <View style={styles.statDivider} />
            <StatItem label="Favorites" value={currentUser.stats.favorites} />
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<BellIcon color="#3A2E2B" size={18} />}
            label="Notification Preferences"
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            icon={<LockIcon color="#3A2E2B" size={18} />}
            label="Privacy Settings"
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            icon={<GlobeIcon color="#3A2E2B" size={18} />}
            label="Language"
            value={mockUser.language}
            onPress={() => {}}
          />
        </View>

        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<TrashIcon color="#DE5943" size={18} />}
            label="Delete Account"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  destructive,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <View
          style={[
            styles.iconWrapper,
            destructive && styles.iconWrapperDestructive,
          ]}
        >
          {icon}
        </View>
        <Text style={[styles.settingsLabel, destructive && styles.destructiveLabel]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingsRowRight}>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
        <ChevronRightIcon color={destructive ? '#DE5943' : 'rgba(58, 46, 43, 0.4)'} size={15} />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3A2E2B',
  },

  // ── User Card ─────────────────────────────────────────
  userCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOuterCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F4ECE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2E2B',
  },
  userEmail: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(58, 46, 43, 0.55)',
  },
  editProfileRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BA796B',
  },

  // ── Stats Row ─────────────────────────────────────────
  statsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 46, 43, 0.08)',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3A2E2B',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(58, 46, 43, 0.55)',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(58, 46, 43, 0.1)',
  },

  // ── Sections & Cards ──────────────────────────────────
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(58, 46, 43, 0.55)',
  },
  sectionCard: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F6EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperDestructive: {
    backgroundColor: '#FDECE8',
  },
  settingsLabel: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#3A2E2B',
  },
  destructiveLabel: {
    color: '#DE5943',
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    marginRight: 6,
    fontSize: 14,
    color: 'rgba(58, 46, 43, 0.5)',
  },

  // ── Logout Button ─────────────────────────────────────
  logoutContainer: {
    marginTop: 24,
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 9999, // Pill shape per Figma design
    borderWidth: 1.5,
    borderColor: '#3A2E2B',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2E2B',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(58, 46, 43, 0.06)',
    marginLeft: 66, // เว้นระยะให้เส้นเริ่มต้นใต้ข้อความตาม iOS design pattern
  },
});
