/**
 * app/screens/onboarding.tsx
 *
 * First-launch onboarding — 3 slides explaining what the app requires.
 * Stored in SecureStore so it only shows once.
 * Has a Skip button for users who know what they're doing.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: W } = Dimensions.get("window");

interface Slide {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  bullets?: { icon: string; text: string }[];
  tip?: string;
  link?: { label: string; url: string };
}

const SLIDES: Slide[] = [
  {
    icon: "shield-checkmark-outline",
    iconColor: "#3b82f6",
    title: "Welcome to\nAdGuard Mobile",
    subtitle:
      "A mobile companion app for AdGuard Home — the self-hosted DNS filter that blocks ads, trackers, and malware across your entire home network.",
    tip: "This app does NOT work standalone. It requires AdGuard Home running on your network.",
  },
  {
    icon: "server-outline",
    iconColor: "#22c55e",
    title: "What you need",
    subtitle: "Before connecting, make sure you have:",
    bullets: [
      {
        icon: "checkmark-circle-outline",
        text: "AdGuard Home installed on your router or a device on your home network",
      },
      {
        icon: "checkmark-circle-outline",
        text: "The IP address and port of your instance\n(e.g. 192.168.1.1:3000)",
      },
      {
        icon: "checkmark-circle-outline",
        text: "Your AdGuard Home username and password",
      },
      {
        icon: "wifi-outline",
        text: "Your phone connected to the same WiFi network as AdGuard Home",
      },
    ],
    link: {
      label: "Get AdGuard Home (free) →",
      url: "https://github.com/AdguardTeam/AdGuardHome",
    },
  },
  {
    icon: "phone-portrait-outline",
    iconColor: "#f59e0b",
    title: "What you can do",
    subtitle: "Once connected, AdGuard Mobile gives you:",
    bullets: [
      { icon: "stats-chart-outline",    text: "Live DNS stats and protection toggle" },
      { icon: "phone-portrait-outline", text: "Discover and manage all devices on your network" },
      { icon: "ban-outline",            text: "Block or unblock any device with one tap" },
      { icon: "list-outline",           text: "Real-time DNS query log" },
      { icon: "hardware-chip-outline",  text: "OPNsense integration for MAC-based device tracking (optional)" },
    ],
  },
];

interface OnboardingScreenProps {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function goTo(index: number) {
    setCurrent(index);
    scrollRef.current?.scrollTo({ x: index * W, animated: true });
  }

  function next() {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      onDone();
    }
  }

  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skip} onPress={onDone}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: W }]}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name={slide.icon as any} size={52} color={slide.iconColor} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{slide.title}</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>{slide.subtitle}</Text>

            {/* Bullets */}
            {slide.bullets && (
              <View style={styles.bullets}>
                {slide.bullets.map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Ionicons name={b.icon as any} size={18} color="#3b82f6" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}>{b.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tip */}
            {slide.tip && (
              <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
                <Text style={styles.tipText}>{slide.tip}</Text>
              </View>
            )}

            {/* Link */}
            {slide.link && (
              <Text style={styles.link}>{slide.link.label}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Next / Get Started button */}
      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>
          {isLast ? "Get Started" : "Next"}
        </Text>
        <Ionicons
          name={isLast ? "rocket-outline" : "arrow-forward-outline"}
          size={18}
          color="#fff"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    paddingBottom: 32,
  },
  skip: {
    alignSelf: "flex-end",
    padding: 16,
    paddingTop: 56,
    paddingRight: 24,
  },
  skipText: {
    color: "#475569",
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 32,
    paddingTop: 16,
    alignItems: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  bullets: {
    alignSelf: "stretch",
    gap: 12,
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bulletIcon: {
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#f59e0b",
    lineHeight: 18,
  },
  link: {
    fontSize: 14,
    color: "#3b82f6",
    marginTop: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  dotActive: {
    backgroundColor: "#3b82f6",
    width: 24,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 32,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
