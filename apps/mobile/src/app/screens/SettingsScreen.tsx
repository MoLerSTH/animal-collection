import { PrivateImage as Image } from '../components/PrivateImage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { useTranslation } from '../../core/i18n/useLanguageStore';
import { SupportedLanguage } from '../../core/i18n/translations';
import { CameraIcon } from '../components/CatalogIcons';
import { LockIcon, TrashIcon, GlobeIcon } from '../components/ProfileIcons';
import AppIcon from '../components/AppIcon';
import { colors, Hippo, typography, ui } from '../components/Design';
import appConfig from '../../../app.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;
const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'bike2920@gmail.com';

function SettingRow({ title, subtitle, icon, onPress, danger = false, disabled = false, rightContent }: {
  title: string; subtitle?: string; icon: React.ReactNode; onPress: () => void; danger?: boolean; disabled?: boolean; rightContent?: React.ReactNode;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && { opacity: 0.5 }]}>
    <View style={[styles.icon, danger && { backgroundColor: colors.blush }]}>{icon}</View>
    <View style={{flex:1, gap:3}}><Text style={[styles.rowTitle, danger && {color:'#B4494D'}]}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>
    {rightContent ?? <AppIcon name="chevron-right" size={18} color={danger ? '#B4494D' : '#A48E7E'}/>}
  </Pressable>;
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, isLoading, signOut, deleteAccount, updateUsername } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [selectingLanguage, setSelectingLanguage] = useState(false);
  const [username, setUsername] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const busy = isLoading || deleting || savingName;
  const trimmedName = username.trim();
  const validName = trimmedName.length >= 2 && trimmedName.length <= 30 && !/[\u0000-\u001f\u007f]/.test(trimmedName);
  useEffect(() => { setEditingUsername(false); setNameError(''); }, [user?.id]);

  const saveUsername = async () => {
    if (!validName || busy || trimmedName === user?.name) return;
    const owner = user?.id;
    setSavingName(true);
    setNameError('');
    try {
      await updateUsername(trimmedName);
      if (useAuthStore.getState().user?.id === owner) setEditingUsername(false);
    } catch {
      if (useAuthStore.getState().user?.id === owner) setNameError('Could not save your username. Check your connection and try again.');
    } finally { setSavingName(false); }
  };

  const openPermissions = async () => {
    try { await Linking.openSettings(); }
    catch { Alert.alert(t.settings.cameraPermissions, 'Open your device Settings > Apps > Animal Collection > Permissions > Camera.'); }
  };
  const reportProblem = async () => {
    const subject = encodeURIComponent('Animal Collection — report a problem');
    const body = encodeURIComponent(`App version: ${appConfig.expo.version}\nDevice: ${Platform.OS} ${Platform.Version}\n\nWhat happened?\n\nSteps to reproduce:\n`);
    try { await Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`); }
    catch { Alert.alert('Contact support', `Send your report to ${supportEmail}.`); }
  };
  const logout = () => Alert.alert(t.settings.signOutConfirmTitle, t.settings.signOutConfirmMessage, [
    {text: t.common.cancel, style:'cancel'},
    {text: t.settings.signOut, onPress: async () => {
      try { await signOut(); navigation.reset({index:0, routes:[{name:'Login'}]}); }
      catch { Alert.alert('Could not sign out', 'Please try again.'); }
    }},
  ]);
  const removeAccount = async () => {
    if (confirmation.trim() !== 'DELETE' || busy) return;
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      navigation.reset({index:0, routes:[{name:'Login'}]});
    } catch {
      Alert.alert('Could not delete account', 'Could not complete account deletion. Please check your connection and try again.');
    } finally { setDeleting(false); }
  };

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setSelectingLanguage(false);
  };

  return <SafeAreaView style={ui.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.back} disabled={busy} onPress={() => navigation.goBack()} style={styles.back}><AppIcon name="back"/></Pressable>
        <Text style={ui.title}>{t.settings.title}</Text>
      </View>
      <View style={styles.account}>
        <View style={styles.avatar}>{user?.avatarUri ? <Image source={{uri:user.avatarUri}} style={styles.avatarImage}/> : <Hippo size={76}/>}</View>
        <Text style={styles.name}>{user?.name || 'Animal explorer'}</Text>
        <Text selectable style={styles.email}>{user?.email || 'Not signed in'}</Text>
        <View style={styles.accountBadge}><AppIcon name="paw" color={colors.pink} size={14}/><Text style={styles.accountBadgeText}>{t.settings.headerBadge}</Text></View>
      </View>

      <Text style={styles.section}>{t.settings.preferencesSection}</Text>
      <View style={styles.group}>
        <SettingRow
          title={t.settings.language}
          subtitle={language === 'th' ? t.settings.thai : t.settings.english}
          icon={<GlobeIcon color={colors.ink} size={22} />}
          onPress={() => setSelectingLanguage(true)}
          disabled={busy}
        />
      </View>

      <Text style={styles.section}>{t.settings.accountSection}</Text>
      <View style={styles.group}>
        <SettingRow title={t.settings.changeUsername} subtitle={t.settings.changeUsernameSubtitle} icon={<AppIcon name="edit"/>}
          disabled={busy || !user} onPress={() => {setUsername(user?.name || ''); setNameError(''); setEditingUsername(true);}}/>
        <View style={styles.divider}/>
        <SettingRow title={t.settings.signOut} subtitle={t.settings.signOutSubtitle} icon={<AppIcon name="logout"/>} onPress={logout} disabled={busy}/>
      </View>
      <Text style={styles.section}>{t.settings.permissionsSection}</Text>
      <View style={styles.group}>
        <SettingRow title={t.settings.cameraPermissions} subtitle={t.settings.cameraPermissionsSubtitle} icon={<CameraIcon color={colors.ink} size={23}/>} onPress={openPermissions} disabled={busy}/>
        <View style={styles.divider}/>
        <SettingRow title={t.settings.privacyData} subtitle={t.settings.privacyDataSubtitle} icon={<LockIcon size={23}/>} onPress={() => navigation.navigate('Privacy')} disabled={busy}/>
      </View>
      <Text style={styles.section}>{t.settings.helpSection}</Text>
      <View style={styles.group}>
        <SettingRow title={t.settings.howToPlay} subtitle={t.settings.howToPlaySubtitle} icon={<AppIcon name="help" color="#9E6C52"/>} onPress={() => navigation.navigate('Onboarding', {review:true})} disabled={busy}/>
        <View style={styles.divider}/>
        <SettingRow title={t.settings.reportProblem} subtitle={supportEmail} icon={<AppIcon name="mail"/>} onPress={reportProblem} disabled={busy}/>
        <View style={styles.divider}/>
        <View style={styles.versionRow}><Text style={styles.rowTitle}>{t.settings.appName}</Text><Text style={styles.subtitle}>{t.settings.version} {appConfig.expo.version}</Text></View>
      </View>
      <View style={[styles.group, {marginTop:12}]}>
        <SettingRow title={t.settings.deleteAccount} subtitle={t.settings.deleteAccountSubtitle} icon={<TrashIcon color="#B4494D" size={23}/>} danger disabled={busy || !user} onPress={() => { setConfirmation(''); setConfirmDelete(true); }}/>
      </View>
    </ScrollView>

    {/* Language Selection Modal */}
    <Modal visible={selectingLanguage} transparent animationType="fade" onRequestClose={() => setSelectingLanguage(false)}>
      <KeyboardAvoidingView style={{flex:1, backgroundColor:'#28180F99'}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrim} keyboardShouldPersistTaps="handled">
          <View style={styles.dialog}>
            <View style={[styles.icon, {alignSelf:'center', backgroundColor:colors.sand}]}>
              <GlobeIcon color={colors.pink} size={24}/>
            </View>
            <Text style={[ui.title, {fontSize:22, textAlign:'center'}]}>{t.settings.selectLanguageTitle}</Text>
            <Text style={[styles.subtitle, {textAlign:'center', marginTop:-8}]}>{t.settings.selectLanguageSubtitle}</Text>

            <View style={styles.languageOptionsContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ไทย (Thai)"
                onPress={() => handleSelectLanguage('th')}
                style={[styles.languageOption, language === 'th' && styles.languageOptionActive]}
              >
                <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
                  <Text style={{fontSize:22}}>🇹🇭</Text>
                  <View>
                    <Text style={[styles.languageOptionTitle, language === 'th' && styles.languageOptionTitleActive]}>
                      ไทย
                    </Text>
                    <Text style={styles.languageOptionSubtitle}>ภาษาไทย (Thai)</Text>
                  </View>
                </View>
                {language === 'th' && <AppIcon name="check" size={20} color={colors.pink} />}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="English (US)"
                onPress={() => handleSelectLanguage('en')}
                style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
              >
                <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
                  <Text style={{fontSize:22}}>🇺🇸</Text>
                  <View>
                    <Text style={[styles.languageOptionTitle, language === 'en' && styles.languageOptionTitleActive]}>
                      English
                    </Text>
                    <Text style={styles.languageOptionSubtitle}>English (US)</Text>
                  </View>
                </View>
                {language === 'en' && <AppIcon name="check" size={20} color={colors.pink} />}
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
              onPress={() => setSelectingLanguage(false)}
              style={{padding:12, alignItems:'center', marginTop:4}}
            >
              <Text style={styles.rowTitle}>{t.common.cancel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={editingUsername} transparent animationType="fade" onRequestClose={() => {if (!savingName) setEditingUsername(false);}}>
      <KeyboardAvoidingView style={{flex:1, backgroundColor:'#28180F99'}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrim} keyboardShouldPersistTaps="handled">
          <View style={styles.dialog}>
            <Text style={[ui.title, {fontSize:23, textAlign:'center'}]}>{t.settings.changeUsernameModalTitle}</Text>
            <Text style={styles.subtitle}>{t.settings.changeUsernameModalSubtitle}</Text>
            <TextInput accessibilityLabel={t.settings.usernameInputLabel} value={username} editable={!savingName} maxLength={30}
              onChangeText={value => {setUsername(value); setNameError('');}} autoCapitalize="none" autoCorrect={false}
              returnKeyType="done" onSubmitEditing={() => void saveUsername()} style={styles.input}/>
            <Text style={styles.subtitle}>{trimmedName.length}{t.settings.charactersCount}</Text>
            {!!nameError && <Text accessibilityRole="alert" style={{color:'#B4494D', fontSize:13}}>{nameError}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={t.settings.saveUsername} disabled={busy || !validName || trimmedName === user?.name}
              onPress={() => void saveUsername()} style={[styles.saveButton, (busy || !validName || trimmedName === user?.name) && {opacity:0.45}]}>
              {savingName ? <ActivityIndicator color="white"/> : <Text style={ui.buttonText}>{t.settings.saveUsername}</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t.settings.cancelNameChange} disabled={savingName}
              onPress={() => setEditingUsername(false)} style={{padding:12, alignItems:'center'}}><Text style={styles.rowTitle}>{t.common.cancel}</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmDelete(false); }}>
      <KeyboardAvoidingView style={{flex:1,backgroundColor:'#28180F99'}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrim} keyboardShouldPersistTaps="handled"><View style={styles.dialog}>
        <View style={[styles.icon, {alignSelf:'center', backgroundColor:colors.blush}]}><TrashIcon color="#B4494D" size={25}/></View>
        <Text style={[ui.title, {fontSize:23, textAlign:'center'}]}>{t.settings.deleteModalTitle}</Text>
        <Text style={[styles.subtitle,{textAlign:'center'}]}>{user?.email}</Text>
        <Text style={ui.text}>{t.settings.deleteModalWarning}</Text>
        <Text style={styles.rowTitle}>{t.settings.typeDeleteToConfirm}</Text>
        <TextInput accessibilityLabel="Delete account confirmation" value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" style={styles.input}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Confirm delete account" disabled={confirmation.trim() !== 'DELETE' || busy} onPress={removeAccount}
          style={[styles.deleteButton, (confirmation.trim() !== 'DELETE' || busy) && {opacity:0.45}]}>
          {deleting ? <ActivityIndicator color="white"/> : <Text style={ui.buttonText}>{t.settings.deleteButton}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel account deletion" disabled={busy} onPress={() => setConfirmDelete(false)} style={{padding:12, alignItems:'center'}}><Text style={styles.rowTitle}>{t.settings.keepAccount}</Text></Pressable>
      </View></ScrollView></KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content:{padding:20, paddingBottom:32, gap:12, width:'100%', maxWidth:520, alignSelf:'center'},
  header:{flexDirection:'row', alignItems:'center', gap:12, marginBottom:8},
  back:{width:44, height:44, borderRadius:16, backgroundColor:colors.sand, alignItems:'center', justifyContent:'center'},
  account:{alignItems:'center', backgroundColor:'#FFF5EC', borderWidth:1, borderColor:'#F0DECF', borderRadius:24, padding:22, gap:7},
  avatar:{width:80,height:80,borderRadius:40,backgroundColor:'#F5DFC5',overflow:'hidden',alignItems:'center',justifyContent:'center',marginBottom:4},
  avatarImage:{width:'100%',height:'100%'},
  name:{color:colors.ink,fontFamily:typography.extraBold,fontSize:22,textAlign:'center'},
  email:{color:'#8B6E5C',fontFamily:typography.regular,fontSize:14,textAlign:'center'},
  accountBadge:{flexDirection:'row',gap:6,alignItems:'center',backgroundColor:colors.blush,borderRadius:20,paddingHorizontal:12,paddingVertical:7,marginTop:4},
  accountBadgeText:{fontSize:12,color:colors.ink,fontFamily:typography.semiBold},
  section:{fontSize:11,color:'#9A7C68',fontFamily:typography.bold,letterSpacing:1.2,marginTop:12,marginLeft:4},
  group:{backgroundColor:colors.white,borderRadius:20,borderWidth:1,borderColor:'#F0E2D6',overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',gap:12,padding:15,minHeight:78},pressed:{backgroundColor:colors.sand},
  icon:{width:42,height:42,borderRadius:14,backgroundColor:colors.sand,alignItems:'center',justifyContent:'center'},
  rowTitle:{fontSize:15,fontFamily:typography.bold,color:colors.ink},
  subtitle:{fontSize:12,lineHeight:18,fontFamily:typography.regular,color:'#927866'},
  divider:{height:1,backgroundColor:'#F4E9E0',marginLeft:69},
  versionRow:{padding:18,flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'},
  scrim:{flexGrow:1,justifyContent:'center',padding:22},
  dialog:{padding:24,borderRadius:24,backgroundColor:colors.cream,gap:15,maxWidth:440,width:'100%',alignSelf:'center'},
  input:{borderWidth:1,borderColor:'#E5C6BD',backgroundColor:colors.white,borderRadius:14,padding:14,color:colors.ink,fontSize:16,fontFamily:typography.regular},
  deleteButton:{backgroundColor:'#BD5057',padding:16,borderRadius:24,alignItems:'center'},
  saveButton:{backgroundColor:colors.pink,padding:16,borderRadius:24,alignItems:'center'},
  languageOptionsContainer:{gap:10,marginTop:4},
  languageOption:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderRadius:16,backgroundColor:colors.white,borderWidth:1.5,borderColor:'#EFE4D8'},
  languageOptionActive:{borderColor:colors.pink,backgroundColor:'#FFF5F3'},
  languageOptionTitle:{fontSize:16,fontFamily:typography.bold,color:colors.ink},
  languageOptionTitleActive:{color:colors.pink},
  languageOptionSubtitle:{fontSize:12,fontFamily:typography.regular,color:'#9A8272',marginTop:2},
});
