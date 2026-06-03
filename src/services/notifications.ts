import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'WealthLens',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
}

export async function scheduleSIPReminder(sipName: string, nextDate: string) {
  const triggerDate = new Date(nextDate);
  triggerDate.setDate(triggerDate.getDate() - 1);
  triggerDate.setHours(9, 0, 0, 0);

  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SIP Reminder',
      body: `Your SIP for ${sipName} is due tomorrow.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function scheduleRebalanceCheck() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Portfolio Check',
      body: 'Time to review your portfolio allocation. Open WealthLens for insights.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: 1,
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });
}
