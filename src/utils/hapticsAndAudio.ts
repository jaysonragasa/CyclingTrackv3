/**
 * Haptic and Audio cues for cycling navigation.
 * Designed for quick heads-up feedback while riding in intense wind or high speeds.
 */

export class NavigationFeedbackController {
  private static speechMuted: boolean = false;
  private static hapticsEnabled: boolean = true;
  private static hasUserInteracted: boolean = false;
  private static lastSpokenText: string = '';
  private static lastSpeechTime: number = 0;

  static setMuted(muted: boolean) {
    this.speechMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  static isMuted(): boolean {
    return this.speechMuted;
  }

  static setHaptics(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  static isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  static markUserInteracted() {
    this.hasUserInteracted = true;
  }

  /**
   * Triggers haptic vibration pattern:
   * - 'turn_soon': double short pulse (upcoming maneuver)
   * - 'turn_now': triple strong pulse
   * - 'steep_climb': long vibration (gear down warning)
   * - 'hazard': pulsing SOS pattern
   * - 'waypoint': single confirmation tap
   */
  static triggerHaptic(type: 'turn_soon' | 'turn_now' | 'steep_climb' | 'hazard' | 'waypoint' | 'click') {
    if (!this.hapticsEnabled || !this.hasUserInteracted || typeof window === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      switch (type) {
        case 'click':
          navigator.vibrate(20);
          break;
        case 'waypoint':
          navigator.vibrate([60, 40, 60]);
          break;
        case 'turn_soon':
          navigator.vibrate([80, 60, 80]);
          break;
        case 'turn_now':
          navigator.vibrate([150, 70, 200, 70, 300]);
          break;
        case 'steep_climb':
          navigator.vibrate([250, 100, 400]);
          break;
        case 'hazard':
          navigator.vibrate([100, 50, 100, 50, 100, 150, 300]);
          break;
      }
    } catch {
      // Ignore vibration errors if restricted by device policy
    }
  }

  /**
   * Synthesizes audio navigation voice cue
   */
  static speak(text: string, priority: 'normal' | 'urgent' = 'normal') {
    if (this.speechMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const now = Date.now();
    // Throttle identical announcements within 5 seconds
    if (text === this.lastSpokenText && now - this.lastSpeechTime < 5000) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpeechTime = now;

    try {
      if (priority === 'urgent') {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly crisper for riding
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech failed silently
    }
  }
}
