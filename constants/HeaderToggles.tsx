import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "./langcontext";
import { useTheme } from "./ThemeContext";

export default function HeaderToggles() {
  const { theme, toggleTheme, colors } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  const btn = {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.heading,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <View style={{ flexDirection: "row", gap: 8, marginRight: 16 }}>
      <TouchableOpacity style={btn} onPress={toggleTheme}>
        <Ionicons
          name={theme === "dark" ? "sunny" : "moon"}
          size={16}
          color={colors.heading}
        />
      </TouchableOpacity>
      <TouchableOpacity style={btn} onPress={toggleLanguage}>
        <Text style={{ fontSize: 14 }}>{language === "en" ? "🇵🇭" : "🇬🇧"}</Text>
      </TouchableOpacity>
    </View>
  );
}
