import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Home, TrendingUp, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type TabIconProps = { icon: React.ReactNode; label: string; focused: boolean };

function TabIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      {icon}
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 60 + insets.bottom,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#EEE9E5",
          shadowColor: "#1A0C08",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 14,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { alignItems: "center", justifyContent: "center", flex: 1, paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Orders"
              icon={<Home size={22} color={focused ? "#E8352A" : "#BCAFAB"} strokeWidth={focused ? 2.5 : 1.8} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Earnings"
              icon={<TrendingUp size={22} color={focused ? "#E8352A" : "#BCAFAB"} strokeWidth={focused ? 2.5 : 1.8} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Profile"
              icon={<User size={22} color={focused ? "#E8352A" : "#BCAFAB"} strokeWidth={focused ? 2.5 : 1.8} />}
            />
          ),
        }}
      />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, minWidth: 56 },
  label: { fontSize: 10, fontWeight: "600", color: "#BCAFAB", letterSpacing: 0.2, textAlign: "center" },
  labelActive: { color: "#E8352A", fontWeight: "700" },
});
