import { Platform } from 'react-native';
import { startActivityAsync, ResultCode } from 'expo-intent-launcher';
import * as DocumentPicker from 'expo-document-picker';

export interface PickedSound {
  uri: string;
  name: string;
}

// Opens the system ringtone picker (Android only)
export async function pickSystemRingtone(): Promise<PickedSound | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const result = await startActivityAsync('android.intent.action.RINGTONE_PICKER', {
      extra: {
        'android.intent.extra.ringtone.type': 7, // TYPE_ALL
        'android.intent.extra.ringtone.show_silent': false,
        'android.intent.extra.ringtone.show_default': true,
      },
    });

    if (result.resultCode !== ResultCode.Success) return null;

    // URI is returned as extra or data depending on Android version
    const uri: string | undefined =
      (result.extra as Record<string, any>)?.['android.intent.extra.ringtone.picked_uri'] ??
      result.data;

    if (!uri) return null;

    return { uri, name: 'Zil Sesi' };
  } catch {
    return null;
  }
}

// Opens the audio file picker
export async function pickAudioFile(): Promise<PickedSound | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: false,
    });

    if (result.canceled || !result.assets?.length) return null;

    const file = result.assets[0];
    const name = file.name ?? 'Özel Ses';
    // Strip extension for display
    const displayName = name.replace(/\.[^.]+$/, '');
    return { uri: file.uri, name: displayName };
  } catch {
    return null;
  }
}
