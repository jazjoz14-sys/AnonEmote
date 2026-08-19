/**
 * AnonEmote — Terms & Conditions and Privacy Policy
 *
 * Static content rendered inside TermsModal. Each section is an object with
 * a `heading` (displayed as a section title) and `body` (paragraph text).
 * Maintained as a source-controlled data file for easy updates before defense.
 */

export const termsAndConditions = [
  {
    heading: 'Platform Purpose',
    body:
      'AnonEmote is a web-based anonymous emotional support platform designed for Filipino college students. ' +
      'The platform provides a safe, judgment-free space where users can express their feelings through a 3D star system ' +
      'with seven emotion planets (Joy, Venting, Seek Advice, Grief & Loss, Anxiety, Reflections, and Doodle Drift). ' +
      'AnonEmote is not a replacement for professional mental health services. If you are experiencing a mental health crisis, ' +
      'please contact a licensed professional or a crisis hotline immediately.',
  },
  {
    heading: 'Anonymity Guarantee',
    body:
      'Your identity on AnonEmote is fully anonymous. Posts, reactions, and drawings are not linked to any personally ' +
      'identifiable information beyond the email address used for account creation. Your email is never displayed publicly ' +
      'and is used solely for authentication purposes. Other users cannot see your identity, and the platform does not ' +
      'collect names, student IDs, profile photos, or any other identifying information. Your anonymous expression is ' +
      'protected by design.',
  },
  {
    heading: 'Content Moderation Policies',
    body:
      'All content submitted to AnonEmote passes through a hybrid AI moderation system before publication. ' +
      'This system uses three layers: (1) crisis keyword detection in English, Tagalog, and Bicolano to identify ' +
      'messages indicating self-harm or suicidal ideation; (2) local vernacular toxicity filtering for Filipino languages ' +
      'not supported by external AI services; and (3) Google Perspective API analysis for nuanced English-language toxicity. ' +
      'Content flagged as toxic will be blocked from publication. Content that indicates a crisis will trigger the crisis ' +
      'intervention flow. Moderation decisions are logged for administrative review but are never publicly visible.',
  },
  {
    heading: 'Crisis Intervention Disclosure',
    body:
      'If the moderation system detects language indicating self-harm or suicidal ideation in your message, your draft ' +
      'will be preserved (never deleted) and a crisis intervention screen will be displayed with emergency contact ' +
      'information and support resources. This is an automated safety measure designed to connect you with help. ' +
      'AnonEmote does not employ licensed counselors and cannot provide professional mental health support. ' +
      'The crisis detection system operates locally and does not share your content with external parties. ' +
      'In the Philippines, you can reach the National Center for Mental Health Crisis Hotline at 0917-899-8727 or 989.',
  },
  {
    heading: 'Acceptable Use',
    body:
      'By using AnonEmote, you agree to: (1) use the platform only for genuine emotional expression and peer support; ' +
      '(2) not post content intended to harass, bully, or harm other users; (3) not attempt to identify or de-anonymize ' +
      'other users; (4) not use the platform to distribute spam, advertisements, or malicious links; ' +
      '(5) not exploit the anonymity system to evade moderation or post prohibited content repeatedly; and ' +
      '(6) interact with others using empathy and respect. The empathy-only reaction system (🫂💙😢🌱✨) is designed ' +
      'to foster supportive interactions — please use it in that spirit.',
  },
  {
    heading: 'Account Termination',
    body:
      'AnonEmote reserves the right to suspend or terminate accounts that repeatedly violate the acceptable use policy ' +
      'or attempt to circumvent the content moderation system. Users whose posts are flagged multiple times by independent ' +
      'reporters may have their accounts placed under review. You may delete your account at any time, which will ' +
      'permanently remove your email and authentication data. Previously submitted anonymous posts will remain on the ' +
      'platform as they are not linked to your account identity.',
  },
]

export const privacyPolicy = [
  {
    heading: 'Data Collected',
    body:
      'AnonEmote collects only your email address during account registration. This email is used exclusively for ' +
      'authentication (sign-in and password recovery) and is stored securely via Supabase Auth. No other personally ' +
      'identifiable information is collected, stored, or processed by the platform.',
  },
  {
    heading: 'Data Not Collected',
    body:
      'AnonEmote does not collect names, student IDs, phone numbers, profile photos, IP addresses for identification, ' +
      'location data, device fingerprints, or browsing history. Posts and reactions are stored anonymously using ' +
      'session identifiers that cannot be traced back to your email or real-world identity. The platform is designed ' +
      'from the ground up to minimize data collection.',
  },
  {
    heading: 'Session Handling',
    body:
      'Your authenticated session is managed by Supabase Auth using secure tokens stored in your browser. ' +
      'Session tokens are refreshed automatically and expire after inactivity. Temporary interface preferences ' +
      '(such as dismissed hints and navigation state) are stored in your browser\'s sessionStorage and are ' +
      'automatically cleared when you close the browser tab. No session data is transmitted to or stored on external servers.',
  },
  {
    heading: 'Data Retention',
    body:
      'Your email and authentication credentials are retained until you choose to delete your account. ' +
      'Upon account deletion, all authentication data is permanently removed from the system. ' +
      'Anonymous posts, reactions, and drawings submitted during your use of the platform are retained independently ' +
      'as they are not linked to your account identity. Moderation audit logs are retained for platform safety review ' +
      'and do not contain personally identifiable information.',
  },
]
