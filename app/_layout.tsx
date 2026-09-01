// ========================================
// GymFlow - App Entry Point (Expo Router)
// ========================================

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet, Text } from "react-native";
import { colors } from "../src/lib/theme";
import { useEffect } from "react";
import { StoreProvider } from "../src/db/stores";
import { bootstrapStorage } from "../src/db/storage-bootstrap";
import { CurrentUserProvider, useCurrentUser } from '../src/modules/current-user';
import { AuthSettings } from '../src/components/auth/Settings';

export default function RootLayout() {
  useEffect(() => {
    void bootstrapStorage().catch(console.error);
  }, []);

  return (
    <StoreProvider>
      <CurrentUserProvider><IdentityGate /></CurrentUserProvider>
    </StoreProvider>
  );
}

function IdentityGate() {
  const identity = useCurrentUser();
  if (identity.status === 'loading') return <View style={styles.container} />;
  if (identity.status === 'logged-out') return <AuthSettings onIdentityChanged={() => void identity.refresh()} />;
  if (identity.status === 'error') return <View style={styles.container}><Text style={{ color: colors.text }}>Unable to load your account. Please try again.</Text></View>;
  return (
    <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="active-workout"
            options={{
              animation: "slide_from_bottom",
              presentation: "fullScreenModal",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="template-form"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="session-detail"
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="workout-complete"
            options={{
              animation: "slide_from_right",
            }}
          />
        </Stack>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
