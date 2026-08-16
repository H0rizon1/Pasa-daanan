import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "../constants/langcontext";
import { ThemeProvider, useTheme } from "../constants/ThemeContext";

function ThemeTabs() {
  const { theme, colors } = useTheme();

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.cardSecondary,
            borderTopColor: colors.border,
            justifyContent: "space-around",
          },
          tabBarActiveTintColor: colors.heading,
          tabBarInactiveTintColor: colors.subtitle,
          headerStyle: { backgroundColor: colors.cardSecondary },
          headerTintColor: colors.text,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: "Plan Trip",
            tabBarIcon: ({ color }) => (
              <Ionicons name="map" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color }) => (
              <Ionicons name="navigate" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="routes"
          options={{
            title: "Routes",
            tabBarIcon: ({ color }) => (
              <Ionicons name="bus" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="compare"
          options={{
            title: "Compare",
            tabBarIcon: ({ color }) => (
              <Ionicons name="wallet" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemeTabs />
      </LanguageProvider>
    </ThemeProvider>
  );
}
