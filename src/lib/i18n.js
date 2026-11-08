let current = (() => {
  try {
    return localStorage.getItem("commons_lang") || "en";
  } catch {
    return "en";
  }
})();

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang;
  try {
    localStorage.setItem("commons_lang", lang);
  } catch {
    // storage unavailable: ignore
  }
}

const STRINGS = {
  en: {
    tagline: "See it. Confirm it. Follow it until it is fixed.",
    stat_reported: "reported",
    stat_confirmations: "confirmations",
    stat_fixed: "fixed",
    howBtn: "How it works",
    tabIssues: "Issues",
    tabReport: "Report card",
    searchPh: "Search issues…",
    all: "All",
    sortPriority: "Needs attention first",
    sortNewest: "Newest first",
    loading: "Loading issues…",
    emptyList: "No issues here yet. Click the map to report the first one.",
    hotline: "Official complaint line: Hello Sarkar",
    hint: "Click anywhere on the map to report a problem",
    confirmBtn: "I see this too",
    confirmedBtn: "Confirmed",
    copyBtn: "Copy complaint",
    reportedBy: "Reported by {name}",
    anonymous: "Reported anonymously",
    toast_thanksReport: "Thank you! Your report is on the map.",
    toast_photoFailed: "Report saved, but the photo could not be uploaded.",
    toast_saveFail: "Could not save the report. Please try again.",
    toast_loadFail: "Could not load issues. Check your internet connection.",
    toast_thanksConfirm: "Thanks for confirming this issue.",
    toast_confirmFail: "Could not save your confirmation.",
    toast_copied:
      "Complaint text copied. Paste it into Hello Sarkar or send it to your ward office.",
    toast_copyFail: "Could not copy the text.",
    prio_high: "Needs attention",
    prio_medium: "Medium priority",
    prio_low: "Low priority",
    status_reported: "Reported",
    status_confirmed: "Confirmed",
    status_sent: "Sent to ward",
    status_fixed: "Fixed",
    justNow: "just now",
    minutesAgo: "{n} min ago",
    hoursAgo: "{n} h ago",
    daysAgo: "{n} d ago",
    openToday: "Open today",
    openDay: "Open 1 day",
    openDays: "Open {n} days",
    form_title: "Report a problem",
    form_problem: "What is the problem?",
    form_problemPh: "e.g. Streetlight not working near the temple",
    form_category: "Category",
    form_photo: "Photo (optional)",
    form_addPhoto: "📷 Add a photo",
    form_removePhoto: "Remove photo",
    form_details: "Details (optional)",
    form_detailsPh: "What is wrong, and why does it matter?",
    form_name: "Your name (optional)",
    form_namePh: "Leave empty to stay anonymous",
    form_cancel: "Cancel",
    form_submit: "Submit report",
    form_saving: "Saving…",
    rc_pct: "of reported problems fixed",
    rc_of: "{a} of {b} issues",
    rc_open: "still open",
    rc_avg: "avg days waiting",
    rc_longest: "Waiting longest",
    rc_mostConfirmed: "Most confirmed",
    rc_longestMeta: "{n} days open · ✓ {c} confirmations",
    rc_mostMeta: "✓ {c} neighbours see this",
    rc_byCategory: "Reports by category",
    rc_noData: "No data yet. Report an issue to start the scoreboard.",
    how_title: "How Commons works",
    how_lead:
      "Problems often stay unfixed because everyone assumes someone else already reported them. Commons makes each problem visible and keeps track of it until it is fixed.",
    how1Title: "Spot it.",
    how1: "Click the map where the problem is and describe it.",
    how2Title: "Confirm it.",
    how2: "Neighbours press “I see this too” instead of filing duplicates. Three confirmations mark it as Confirmed.",
    how3Title: "Send it.",
    how3: "Copy the ready-made complaint text and send it through Hello Sarkar (1111) or your ward office.",
    how4Title: "Follow it.",
    how4: "Every issue shows how many days it has been open, so nothing quietly disappears.",
    how_note:
      "Priority score = confirmations × 2 + days open (up to 30) + a safety weight for the category (streetlights and roads count most).",
    how_gotIt: "Got it",
    cat_Streetlight: "Streetlight",
    cat_Garbage: "Garbage",
    "cat_Pothole / Road": "Pothole / Road",
    cat_Drainage: "Drainage",
    cat_Water: "Water",
    cat_Other: "Other",
  },
  ne: {
    tagline: "देख्नुहोस्। पुष्टि गर्नुहोस्। समाधान नहुँदासम्म पछ्याउनुहोस्।",
    stat_reported: "उजुरी",
    stat_confirmations: "पुष्टि",
    stat_fixed: "समाधान",
    howBtn: "कसरी काम गर्छ",
    tabIssues: "समस्याहरू",
    tabReport: "प्रतिवेदन कार्ड",
    searchPh: "समस्या खोज्नुहोस्…",
    all: "सबै",
    sortPriority: "पहिले ध्यान दिनुपर्ने",
    sortNewest: "नयाँ पहिले",
    loading: "समस्याहरू लोड हुँदैछ…",
    emptyList:
      "यहाँ अहिलेसम्म कुनै समस्या छैन। पहिलो समस्या दर्ता गर्न नक्सामा थिच्नुहोस्।",
    hotline: "आधिकारिक उजुरी लाइन: हेलो सरकार",
    hint: "समस्या दर्ता गर्न नक्सामा जहाँसुकै थिच्नुहोस्",
    confirmBtn: "मैले पनि देखेँ",
    confirmedBtn: "पुष्टि भयो",
    copyBtn: "उजुरी कपी गर्नुहोस्",
    reportedBy: "{name} ले दर्ता गर्नुभयो",
    anonymous: "नाम नखुलाई दर्ता गरिएको",
    toast_thanksReport: "धन्यवाद! तपाईंको उजुरी नक्सामा देखिएको छ।",
    toast_photoFailed: "उजुरी सेभ भयो, तर फोटो अपलोड हुन सकेन।",
    toast_saveFail: "उजुरी सेभ गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।",
    toast_loadFail: "समस्याहरू लोड गर्न सकिएन। इन्टरनेट जाँच गर्नुहोस्।",
    toast_thanksConfirm: "पुष्टि गरेकोमा धन्यवाद।",
    toast_confirmFail: "तपाईंको पुष्टि सेभ गर्न सकिएन।",
    toast_copied:
      "उजुरी पाठ कपी भयो। हेलो सरकारमा पेस्ट गर्नुहोस् वा वडा कार्यालयमा पठाउनुहोस्।",
    toast_copyFail: "पाठ कपी गर्न सकिएन।",
    prio_high: "ध्यान चाहिन्छ",
    prio_medium: "मध्यम प्राथमिकता",
    prio_low: "कम प्राथमिकता",
    status_reported: "दर्ता भयो",
    status_confirmed: "पुष्टि भयो",
    status_sent: "वडामा पठाइयो",
    status_fixed: "समाधान भयो",
    justNow: "भर्खरै",
    minutesAgo: "{n} मिनेट अघि",
    hoursAgo: "{n} घण्टा अघि",
    daysAgo: "{n} दिन अघि",
    openToday: "आज खुला",
    openDay: "१ दिनदेखि खुला",
    openDays: "{n} दिनदेखि खुला",
    form_title: "समस्या दर्ता गर्नुहोस्",
    form_problem: "समस्या के हो?",
    form_problemPh: "जस्तै: मन्दिर नजिकको सडक बत्ती बलेको छैन",
    form_category: "वर्ग",
    form_photo: "फोटो (ऐच्छिक)",
    form_addPhoto: "📷 फोटो थप्नुहोस्",
    form_removePhoto: "फोटो हटाउनुहोस्",
    form_details: "विवरण (ऐच्छिक)",
    form_detailsPh: "के गडबड छ, र यो किन महत्त्वपूर्ण छ?",
    form_name: "तपाईंको नाम (ऐच्छिक)",
    form_namePh: "नाम नखुलाउन खाली छोड्नुहोस्",
    form_cancel: "रद्द गर्नुहोस्",
    form_submit: "दर्ता गर्नुहोस्",
    form_saving: "सेभ हुँदैछ…",
    rc_pct: "दर्ता भएका समस्यामध्ये समाधान भएको",
    rc_of: "{b} मध्ये {a} समस्या",
    rc_open: "अझै खुला",
    rc_avg: "औसत प्रतीक्षा दिन",
    rc_longest: "सबैभन्दा लामो प्रतीक्षा",
    rc_mostConfirmed: "सबैभन्दा धेरै पुष्टि",
    rc_longestMeta: "{n} दिनदेखि खुला · ✓ {c} पुष्टि",
    rc_mostMeta: "✓ {c} छिमेकीले यो देखेका छन्",
    rc_byCategory: "वर्ग अनुसार उजुरी",
    rc_noData:
      "अहिलेसम्म डाटा छैन। स्कोरबोर्ड सुरु गर्न समस्या दर्ता गर्नुहोस्।",
    how_title: "Commons कसरी काम गर्छ",
    how_lead:
      "धेरै समस्या समाधान हुँदैनन् किनभने सबैले अरू कसैले पहिले नै जानकारी दिइसक्यो भन्ने सोच्छन्। Commons ले हरेक समस्यालाई देखिने बनाउँछ र समाधान नहुँदासम्म पछ्याउँछ।",
    how1Title: "देख्नुहोस्।",
    how1: "समस्या भएको ठाउँमा नक्सामा थिच्नुहोस् र वर्णन लेख्नुहोस्।",
    how2Title: "पुष्टि गर्नुहोस्।",
    how2: "छिमेकीहरूले दोहोरो उजुरी नगरी “मैले पनि देखेँ” थिच्छन्। तीन पुष्टिपछि समस्या “पुष्टि भयो” हुन्छ।",
    how3Title: "पठाउनुहोस्।",
    how3: "तयार उजुरी पाठ कपी गरेर हेलो सरकार (1111) वा वडा कार्यालयमार्फत पठाउनुहोस्।",
    how4Title: "पछ्याउनुहोस्।",
    how4: "हरेक समस्याले कति दिनदेखि खुला छ भनेर देखाउँछ, त्यसैले कुनै पनि समस्या चुपचाप हराउँदैन।",
    how_note:
      "प्राथमिकता अंक = पुष्टि × २ + खुला दिन (बढीमा ३०) + वर्गको सुरक्षा भार (सडक बत्ती र सडकलाई बढी)।",
    how_gotIt: "बुझेँ",
    cat_Streetlight: "सडक बत्ती",
    cat_Garbage: "फोहोर",
    "cat_Pothole / Road": "खाल्डो / सडक",
    cat_Drainage: "ढल",
    cat_Water: "खानेपानी",
    cat_Other: "अन्य",
  },
};

// t('reportedBy', { name: 'Sita' }) returns the text in the current language
export function t(key, vars = {}) {
  let text = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replace(`{${name}}`, value);
  }
  return text;
}

// Translates a category name; unknown categories are shown as they are
export function catLabel(name) {
  const key = `cat_${name}`;
  return STRINGS[current]?.[key] ?? STRINGS.en[key] ?? name;
}
