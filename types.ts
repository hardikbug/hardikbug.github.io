
export enum AppTab {
  HOME = 'home',
  MARKETS = 'markets',
  SCAN = 'scan',
  COMMUNITY = 'community',
  PROFILE = 'profile',
  GUIDES = 'guides',
  WEATHER = 'weather',
  CERTIFICATIONS = 'certifications',
  REVIEWS = 'reviews'
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  PUNJABI = 'Punjabi',
  HARYANVI = 'Haryanvi',
  MARATHI = 'Marathi',
  TELUGU = 'Telugu'
}

export const languageMeta: Record<string, { name: string, native: string, flag: string }> = {
  [Language.ENGLISH]: { name: 'English', native: 'English', flag: '🇺🇸' },
  [Language.HINDI]: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  [Language.PUNJABI]: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  [Language.HARYANVI]: { name: 'Haryanvi', native: 'हरियाणवी', flag: '🇮🇳' },
  [Language.MARATHI]: { name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  [Language.TELUGU]: { name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
};

export interface AppNotification {
  id: string;
  type: 'price_drop' | 'pest_warning' | 'weather_alert';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionLabel: string;
  targetTab: AppTab;
}

export interface PendingVerification {
  id: string;
  base64: string;
  timestamp: number;
}

export interface PastVerification extends VerificationResult {
  id: string;
  timestamp: number;
  image?: string; // Optional thumbnail
}

export const translations: Record<string, any> = {
  [Language.ENGLISH]: {
    home: 'Home',
    markets: 'Markets',
    scan: 'Scan',
    guides: 'Guides',
    profile: 'Profile',
    weather: 'Weather',
    certifications: 'Badges',
    reviews: 'Reviews',
    welcome: 'Welcome back',
    toolkit: 'Agricultural Toolkit',
    recommended: 'Recommended for You',
    priceTracker: 'Price Tracker',
    aiGuides: 'AI Guides',
    localForecast: 'Local Forecast',
    askAi: 'Ask AI Advisor',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    appLanguage: 'App Language',
    farmerProfile: 'Farmer Profile',
    change: 'Change',
    trend: 'Trend',
    aiAdvice: 'AI Advice',
    securing: 'Securing your farm...',
    original: 'Original',
    fake: 'FAKE',
    verificationSuccess: 'Verification Success',
    fraudDetected: 'Fraud Detected!',
    mandiPrice: 'Mandi Rates',
    alertSettings: 'Alert Preferences',
    marketAlerts: 'Price Drop Alerts',
    pestAlerts: 'Pest & Disease Warnings',
    weatherAlerts: 'Severe Weather Alerts',
    view: 'View',
    dismiss: 'Dismiss',
    priceDropTitle: 'Price Drop Alert',
    pestWarningTitle: 'Pest Warning',
    weatherWarningTitle: 'Weather Warning',
    weatherAdvice: 'Agri-Weather Advice',
    humidity: 'Humidity',
    wind: 'Wind',
    uvIndex: 'UV Index',
    rainfall: 'Rainfall',
    goodForSpray: 'Good for spraying',
    irrigationNeeded: 'Irrigation recommended',
    frostRisk: 'Risk of frost',
    vendorRadar: 'Vendor Radar',
    integrityVault: 'Integrity Vault',
    verifiedBadges: 'Verified Badges',
    earnedShields: 'Earned Shields',
    contactSupport: 'Contact Support',
    whatsappSupport: 'WhatsApp Support',
    callSupport: 'Call Expert',
    emailSupport: 'Email Support',
    supportDesc: 'Get help from our human experts 24/7',
    staleDataWarning: 'Warning: Market data is older than 24 hours. Use with caution.',
    offlineScanSaved: 'Internet disconnected. Scan saved for later verification.',
    pendingScans: 'Pending Verifications',
    scanHistory: 'Verification History',
    syncNow: 'Sync Now',
    billingAndApi: 'Billing & API Settings',
    changeApiKey: 'Change API Key / Project',
    apiKeyDocs: 'View Billing Docs'
  },
  [Language.HINDI]: {
    home: 'होम',
    markets: 'बाजार',
    scan: 'स्कैन',
    guides: 'गाइड',
    profile: 'प्रोफ़ाइल',
    weather: 'मौसम',
    certifications: 'बैज',
    reviews: 'समीक्षाएं',
    welcome: 'वापस स्वागत है',
    toolkit: 'कृषि टूलकिट',
    recommended: 'आपके लिए सिफारिश',
    priceTracker: 'मूल्य ट्रैकर',
    aiGuides: 'एआई गाइड',
    localForecast: 'स्थानीय पूर्वानुमान',
    askAi: 'एआई सलाहकार',
    editProfile: 'प्रोफ़ाइल संपादित करें',
    saveChanges: 'परिवर्तन सहेजें',
    appLanguage: 'ऐप की भाषा',
    farmerProfile: 'किसान प्रोफ़ाइल',
    change: 'बदलें',
    trend: 'रुझान',
    aiAdvice: 'एआई सलाह',
    securing: 'आपके खेत की सुरक्षा...',
    original: 'असली',
    fake: 'नकली',
    verificationSuccess: 'सत्यापन सफल',
    fraudDetected: 'धोखाधड़ी मिली!',
    mandiPrice: 'मंडी भाव',
    alertSettings: 'चेतावनी प्राथमिकताएं',
    marketAlerts: 'मूल्य गिरावट अलर्ट',
    pestAlerts: 'कीट और रोग चेतावनी',
    weatherAlerts: 'खराब मौसम अलर्ट',
    view: 'देखें',
    dismiss: 'हटाएं',
    priceDropTitle: 'मूल्य गिरावट की सूचना',
    pestWarningTitle: 'कीट चेतावनी',
    weatherWarningTitle: 'मौसम की चेतावनी',
    weatherAdvice: 'कृषि-मौसम सलाह',
    humidity: 'नमी',
    wind: 'हवा',
    uvIndex: 'यूवी इंडेक्स',
    rainfall: 'वर्षा',
    goodForSpray: 'छिड़काव के लिए अच्छा',
    irrigationNeeded: 'सिंचाई की सिफारिश',
    frostRisk: 'पाले का खतरा',
    vendorRadar: 'विक्रेता राडार',
    integrityVault: 'विश्वसनीयता वॉल्ट',
    verifiedBadges: 'सत्यापित बैज',
    earnedShields: 'अर्जित शील्ड',
    contactSupport: 'सहायता से संपर्क करें',
    whatsappSupport: 'व्हाट्सएप सहायता',
    callSupport: 'विशेषज्ञ को बुलाएं',
    emailSupport: 'ईमेल सहायता',
    supportDesc: 'हमारे मानवीय विशेषज्ञों से 24/7 सहायता प्राप्त करें',
    staleDataWarning: 'चेतावनी: बाजार डेटा 24 घंटे से अधिक पुराना है। सावधानी से उपयोग करें।',
    offlineScanSaved: 'इंटरनेट बंद है। स्कैन बाद में सत्यापन के लिए सहेजा गया।',
    pendingScans: 'लंबित सत्यापन',
    scanHistory: 'सत्यापन इतिहास',
    syncNow: 'अभी सिंक करें',
    billingAndApi: 'बिलिंग और एपीआई सेटिंग्स',
    changeApiKey: 'एपीआई कुंजी / प्रोजेक्ट बदलें',
    apiKeyDocs: 'बिलिंग दस्तावेज़ देखें'
  }
};

export interface MandiPrice {
  crop: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  emoji: string;
  verified?: boolean;
  anomaly?: boolean;
}

/**
 * Interface representing the result of a product verification scan
 */
export interface VerificationResult {
  status: 'success' | 'failure';
  productName: string;
  brand: string;
  batchNumber: string;
  expiryDate: string;
  verificationTime: string;
  serial?: string;
  reasoning?: string;
  // Fix: Add confidenceScore to satisfy property access in Scan.tsx
  confidenceScore?: number;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  content?: string;
  keywords?: string[];
}

export interface WeatherData {
  location: string;
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  rainfallChance: number;
  agriAdvice: string;
  forecast: Array<{
    day: string;
    temp: number;
    icon: string;
  }>;
}

export const APP_GUIDES: Guide[] = [
  {
    id: '1',
    title: 'Wheat Sowing Best Practices',
    description: 'Essential tips for Sharbati and Durum wheat varieties in the northern regions.',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800',
    content: 'Optimal sowing time is from late October to November. Ensure seed depth is 4-5cm. Use 100-125 kg/hectare seed rate. Apply balanced NPK fertilizers based on soil test results. Proper spacing of 20-22.5 cm between rows is recommended.',
    keywords: ['wheat', 'gehu', 'sowing']
  },
  {
    id: '2',
    title: 'Integrated Pest Management',
    description: 'Protect your rice crop from Stem Borer and Brown Plant Hopper without excessive chemicals.',
    imageUrl: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&q=80&w=800',
    content: 'Monitor your fields regularly for early signs of infestation. Use light traps to attract and kill adult insects. For stem borer, consider pheromone traps or neem-based sprays. Avoid over-application of nitrogen which attracts hoppers.',
    keywords: ['rice', 'paddy', 'chawal', 'pests']
  },
  {
    id: '3',
    title: 'Soil Health & Fertility',
    description: 'Improve long-term productivity through organic amendments and soil testing.',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800',
    content: 'Incorporate 10-15 tonnes of farmyard manure (FYM) per hectare. Practice crop rotation with legumes to naturally fix nitrogen. Test your soil every two years at a local government lab to understand pH and nutrient levels.',
    keywords: ['soil', 'matti', 'fertilizer', 'khad']
  }
];
