interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    // Welcome Page
    welcome: "Welcome to AmaPlayer",
    tagline: "CONNECT COMPETE AND CONQUER",
    subtitle: "LET'S PLAY TOGETHER AND RISE",
    letsPlay: "Let's Play",
    vision: "Our Vision",
    visionText: "To unlock India's untapped sporting talent by creating a platform that connects players with national and global sports ecosystems. Strengthening India's sporting future by turning potential into performance.",
    mission: "Our Mission",
    missionText: "To help India produce champions by connecting talent with the right opportunities. We build the bridge between aspiration and achievement.",
    joinForFree: "Join for Free",

    // Common
    login: "Login",
    logout: "Logout",
    signOut: "Sign Out",
    back: "Back",
    backToHome: "Back to Home",
    next: "Next",
    submit: "Submit",
    cancel: "Cancel",
    signup: "Sign Up",
    joiningAs: "Joining as",
    email: "Email",
    password: "Password",
    enterYourEmail: "Enter your email",
    enterYourPassword: "Enter your password",
    loginAs: "Login as",
    enterCredentials: "Enter your credentials to continue",
    loginFunctionalityComingSoon: "Login functionality will be implemented next.",
    dontHaveAccount: "Don't have an account?",
    signUp: "Sign up",

    // Role Selection Page
    welcomeToAmaplayer: "Welcome to AmaPlayer",
    chooseYourRole: "Choose your role to continue",
    chooseRole: "Choose Your Role",

    // Roles
    athlete: "Athlete",
    coach: "Coach",
    organization: "Organization",
    parent: "Parent",
    spouse: "Spouse",

    // Role Descriptions
    athleteDescription: "Showcase your talent and connect with coaches",
    coachDescription: "Discover and train the next generation",
    organizationDescription: "Manage teams and competitions",
    parentDescription: "Track your child's athletic journey",

    // About Page
    welcomeTo: "Welcome to",
    yourJourney: "Your journey to athletic excellence starts here",
    ourMission: "Our Mission",
    missionDescription: "To create the world's most comprehensive platform that connects athletes, coaches, and organizations, fostering talent development and creating opportunities for athletic excellence across all sports disciplines.",
    ourVision: "Our Vision",
    visionDescription: "To revolutionize the sports industry by building a global ecosystem where every athlete has access to world-class coaching, every coach can discover exceptional talent, and every organization can build championship-winning teams.",
    watchOurStory: "Watch Our Story",
    videoLoadError: "If you're seeing this, the video failed to load. Please check the console for errors.",
    videoNotSupported: "Your browser does not support the video tag.",
    continueToLogin: "Continue to Login",
    chooseDifferentRole: "Choose Different Role"
  },

  // Hindi
  hi: {
    welcome: "अमाप्लेयर में आपका स्वागत है",
    tagline: "जुड़ें, प्रतिस्पर्धा करें और जीतें",
    subtitle: "आओ साथ खेलें और आगे बढ़ें",
    letsPlay: "चलो खेलें",

    // Common
    login: "लॉगिन",
    logout: "लॉगआउट",
    signOut: "साइन आउट",
    signup: "साइन अप",
    back: "पीछे",
    backToHome: "होम पर वापस जाएं",
    next: "अगला",
    submit: "जमा करें",
    cancel: "रद्द करें",
    joiningAs: "इस रूप में शामिल हो रहे हैं",
    email: "ईमेल",
    password: "पासवर्ड",
    enterYourEmail: "अपना ईमेल दर्ज करें",
    enterYourPassword: "अपना पासवर्ड दर्ज करें",
    loginAs: "इस रूप में लॉगिन करें",
    enterCredentials: "जारी रखने के लिए अपनी साख दर्ज करें",
    loginFunctionalityComingSoon: "लॉगिन कार्यक्षमता जल्द ही उपलब्ध होगी।",
    dontHaveAccount: "खाता नहीं है?",
    signUp: "साइन अप करें",

    // Role Selection Page
    welcomeToAmaplayer: "अमाप्लेयर में आपका स्वागत है",
    chooseYourRole: "जारी रखने के लिए अपनी भूमिका चुनें",
    chooseRole: "अपनी भूमिका चुनें",

    // Roles
    athlete: "खिलाड़ी",
    coach: "कोच",
    organization: "संगठन",
    parent: "अभिभावक",
    spouse: "जीवनसाथी",

    // Role Descriptions
    athleteDescription: "अपनी प्रतिभा दिखाएं और कोचों से जुड़ें",
    coachDescription: "अगली पीढ़ी की खोज करें और प्रशिक्षित करें",
    organizationDescription: "टीमों और प्रतियोगिताओं का प्रबंधन करें",
    parentDescription: "अपने बच्चे की एथलेटिक यात्रा को ट्रैक करें",
    spouseDescription: "अपने एथलीट साथी का समर्थन करें",

    // About Page
    welcomeTo: "आपका स्वागत है",
    yourJourney: "एथलेटिक उत्कृष्टता की आपकी यात्रा यहाँ से शुरू होती है",
    ourMission: "हमारा मिशन",
    missionDescription: "दुनिया का सबसे व्यापक प्लेटफॉर्म बनाना जो एथलीटों, कोचों और संगठनों को जोड़ता है, प्रतिभा विकास को बढ़ावा देता है और सभी खेल विषयों में एथलेटिक उत्कृष्टता के लिए अवसर पैदा करता है।",
    ourVision: "हमारी दृष्टि",
    visionDescription: "खेल उद्योग में क्रांति लाने के लिए एक वैश्विक पारिस्थितिकी तंत्र का निर्माण करना जहां हर एथलीट के पास विश्व स्तरीय कोचिंग तक पहुंच हो, हर कोच असाधारण प्रतिभा की खोज कर सके, और हर संगठन चैंपियनशिप जीतने वाली टीमों का निर्माण कर सके।",
    watchOurStory: "हमारी कहानी देखें",
    videoLoadError: "यदि आप यह देख रहे हैं, तो वीडियो लोड नहीं हुआ है। कृपया त्रुटियों के लिए कंसोल जांचें।",
    videoNotSupported: "आपका ब्राउज़र वीडियो टैग का समर्थन नहीं करता है।",
    continueToLogin: "लॉगिन पर जारी रखें",
    chooseDifferentRole: "अलग भूमिका चुनें",

    // Vision & Mission (for WelcomePage)
    vision: "हमारी दृष्टि",
    visionText: "एक वैश्विक मंच बनाना जो एथलीटों, कोचों और खेल प्रेमियों को जोड़ता है, उन्हें अपनी प्रतिभा दिखाने और अपने सपनों को प्राप्त करने का अधिकार देता है।",
    mission: "हमारा मिशन",
    missionText: "एथलीटों को जुड़ने, बढ़ने और अपनी खेल यात्रा में सफल होने के लिए नवीन उपकरण और अवसर प्रदान करना, साथ ही एक जीवंत समुदाय का निर्माण करना।",
    joinForFree: "मुफ्त में शामिल हों"
  },

  // Bengali
  bn: {
    // Welcome Page
    welcome: "আমাপ্লেয়ারে স্বাগতম",
    tagline: "সংযুক্ত হোন, প্রতিযোগিতা করুন এবং বিজয়ী হোন",
    subtitle: "আসুন একসাথে খেলি এবং এগিয়ে যাই",
    letsPlay: "চলো খেলি",

    // Common
    login: "লগইন",
    logout: "লগআউট",
    signOut: "সাইন আউট",
    signup: "সাইন আপ",
    back: "পিছনে",
    backToHome: "হোমে ফিরে যান",
    next: "পরবর্তী",
    submit: "জমা দিন",
    cancel: "বাতিল",
    joiningAs: "যেমন যোগদান করছেন",
    email: "ইমেইল",
    password: "পাসওয়ার্ড",
    enterYourEmail: "আপনার ইমেইল লিখুন",
    enterYourPassword: "আপনার পাসওয়ার্ড লিখুন",
    loginAs: "লগইন করুন হিসেবে",
    enterCredentials: "চালিয়ে যেতে আপনার শংসাপত্র লিখুন",
    loginFunctionalityComingSoon: "লগইন কার্যকারিতা শীঘ্রই চালু করা হবে।",
    dontHaveAccount: "অ্যাকাউন্ট নেই?",
    signUp: "সাইন আপ করুন",

    // Role Selection Page
    welcomeToAmaplayer: "আমাপ্লেয়ারে স্বাগতম",
    chooseYourRole: "চালিয়ে যেতে আপনার ভূমিকা নির্বাচন করুন",
    chooseRole: "আপনার ভূমিকা নির্বাচন করুন",

    // Roles
    athlete: "খেলোয়াড়",
    coach: "কোচ",
    organization: "সংগঠন",
    parent: "অভিভাবক",
    spouse: "জীবনসঙ্গী",

    // Role Descriptions
    athleteDescription: "আপনার প্রতিভা প্রদর্শন করুন এবং কোচদের সাথে সংযুক্ত হন",
    coachDescription: "পরবর্তী প্রজন্মকে আবিষ্কার করুন এবং প্রশিক্ষণ দিন",
    organizationDescription: "দল এবং প্রতিযোগিতা পরিচালনা করুন",
    parentDescription: "আপনার সন্তানের অ্যাথলেটিক যাত্রা ট্র্যাক করুন",
    spouseDescription: "আপনার অ্যাথলেট সঙ্গীকে সমর্থন করুন",

    // About Page
    welcomeTo: "স্বাগতম",
    yourJourney: "অ্যাথলেটিক শ্রেষ্ঠত্বের দিকে আপনার যাত্রা এখান থেকে শুরু হয়",
    ourMission: "আমাদের মিশন",
    missionDescription: "বিশ্বের সবচেয়ে ব্যাপক প্ল্যাটফর্ম তৈরি করা যা অ্যাথলেট, কোচ এবং সংগঠনগুলিকে সংযুক্ত করে, প্রতিভা বিকাশে সহায়তা করে এবং সমস্ত ক্রীড়া শাখায় অ্যাথলেটিক শ্রেষ্ঠত্বের জন্য সুযোগ সৃষ্টি করে।",
    ourVision: "আমাদের ভিশন",
    visionDescription: "একটি বিশ্বব্যাপী বাস্তুতন্ত্র গড়ে তোলার মাধ্যমে ক্রীড়া শিল্পে বিপ্লব ঘটানো যেখানে প্রতিটি অ্যাথলেটের বিশ্বমানের কোচিংয়ের সুযোগ রয়েছে, প্রতিটি কোচ অসাধারণ প্রতিভা আবিষ্কার করতে পারে এবং প্রতিটি সংগঠন চ্যাম্পিয়নশিপ জয়ী দল গঠন করতে পারে।",
    watchOurStory: "আমাদের গল্প দেখুন",
    videoLoadError: "আপনি যদি এটি দেখতে পান তবে ভিডিওটি লোড হয়নি। দয়া করে ত্রুটিগুলির জন্য কনসোল পরীক্ষা করুন।",
    videoNotSupported: "আপনার ব্রাউজার ভিডিও ট্যাগ সমর্থন করে না।",
    continueToLogin: "লগইনে এগিয়ে যান",
    chooseDifferentRole: "ভিন্ন ভূমিকা নির্বাচন করুন",

    // Vision & Mission (for WelcomePage)
    vision: "আমাদের ভিশন",
    visionText: "একটি বিশ্বব্যাপী প্ল্যাটফর্ম তৈরি করা যা অ্যাথলেট, কোচ এবং ক্রীড়া উৎসাহীদের সংযুক্ত করে, তাদের প্রতিভা প্রদর্শন এবং তাদের স্বপ্ন অর্জনের ক্ষমতা প্রদান করে।",
    mission: "আমাদের মিশন",
    missionText: "অ্যাথলেটদের সংযুক্ত হতে, বৃদ্ধি পেতে এবং তাদের ক্রীড়া যাত্রায় সফল হওয়ার জন্য উদ্ভাবনী সরঞ্জাম এবং সুযোগ প্রদান করা এবং একটি প্রাণবন্ত সম্প্রদায় গড়ে তোলা।",
    joinForFree: "বিনামূল্যে যোগ দিন"
  },

  // Tamil
  ta: {
    // Welcome Page
    welcome: "அமாபிளேயருக்கு வரவேற்கிறோம்",
    tagline: "இணைந்து போட்டியிட்டு வெல்லுங்கள்",
    subtitle: "ஒன்றாக விளையாடி உயர்வோம்",
    letsPlay: "விளையாடுவோம்",

    // Common
    login: "உள்நுழைய",
    logout: "வெளியேறு",
    signOut: "வெளியேறு",
    signup: "பதிவு செய்க",
    back: "பின்னால்",
    backToHome: "முகப்புக்கு திரும்பு",
    next: "அடுத்து",
    submit: "சமர்ப்பிக்கவும்",
    cancel: "ரத்து செய்",
    joiningAs: "என சேர்ந்துகொள்கிறேன்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    enterYourEmail: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
    enterYourPassword: "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
    loginAs: "புகுபதிகை செய்",
    enterCredentials: "தொடர உங்கள் சான்றுகளை உள்ளிடவும்",
    loginFunctionalityComingSoon: "உள்நுழைவு செயல்பாடு விரைவில் வரும்.",
    dontHaveAccount: "கணக்கு இல்லையா?",
    signUp: "பதிவு செய்க",

    // Role Selection Page
    welcomeToAmaplayer: "அமாபிளேயருக்கு வரவேற்கிறோம்",
    chooseYourRole: "தொடர உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்",
    chooseRole: "உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்",

    // Roles
    athlete: "விளையாட்டு வீரர்",
    coach: "பயிற்சியாளர்",
    organization: "அமைப்பு",
    parent: "பெற்றோர்",
    spouse: "துணைவர்",

    // Role Descriptions
    athleteDescription: "உங்கள் திறமையை காட்டி பயிற்சியாளர்களுடன் இணையவும்",
    coachDescription: "அடுத்த தலைமுறையை கண்டறிந்து பயிற்சியளிக்கவும்",
    organizationDescription: "அணிகள் மற்றும் போட்டிகளை நிர்வகிக்கவும்",
    parentDescription: "உங்கள் குழந்தையின் விளையாட்டு பயணத்தை கண்காணிக்கவும்",
    spouseDescription: "உங்கள் விளையாட்டு வீரர் துணையை ஆதரிக்கவும்",

    // About Page
    welcomeTo: "வரவேற்கிறோம்",
    yourJourney: "விளையாட்டு சாதனையாளராக உங்கள் பயணம் இங்கே தொடங்குகிறது",
    ourMission: "எங்கள் பணி",
    missionDescription: "ஆட்டக்காரர்கள், பயிற்சியாளர்கள் மற்றும் அமைப்புகளை இணைக்கும் உலகின் மிகவும் விரிவான தளத்தை உருவாக்குவதே எங்கள் பணி, இது திறமை வளர்ச்சியை ஊக்குவித்து, அனைத்து விளையாட்டுத் துறைகளிலும் சிறந்த விளையாட்டு திறன்களுக்கான வாய்ப்புகளை உருவாக்குகிறது.",
    ourVision: "எங்கள் பார்வை",
    visionDescription: "ஒவ்வொரு விளையாட்டு வீரருக்கும் உலகத்தரமான பயிற்சி கிடைக்கும், ஒவ்வொரு பயிற்சியாளரும் அருமையான திறமைகளைக் கண்டறிய முடியும், மேலும் ஒவ்வொரு அமைப்பும் வெற்றி வாகை சூடக்கூடிய அணிகளை உருவாக்க முடியும் என்று உறுதி செய்வதன் மூலம் விளையாட்டுத் துறையில் புரட்சியை ஏற்படுத்துவதே எங்கள் நோக்கம்.",
    watchOurStory: "எங்கள் கதையைப் பார்க்கவும்",
    videoLoadError: "இதை நீங்கள் பார்த்துக் கொண்டிருந்தால், வீடியோ ஏற்றப்படவில்லை. தவறுகளுக்காக கன்சோலை சரிபார்க்கவும்.",
    videoNotSupported: "உங்கள் உலாவி வீடியோ டேக்கை ஆதரிக்கவில்லை.",
    continueToLogin: "உள்நுழையத் தொடரவும்",
    chooseDifferentRole: "வேறு பங்கைத் தேர்ந்தெடுக்கவும்",

    // Vision & Mission (for WelcomePage)
    vision: "எங்கள் பார்வை",
    visionText: "விளையாட்டு வீரர்கள், பயிற்சியாளர்கள் மற்றும் விளையாட்டு ஆர்வலர்களை இணைக்கும் உலகளாவிய தளத்தை உருவாக்குவது, அவர்களின் திறமையை வெளிப்படுத்தவும் அவர்களின் கனவுகளை அடையவும் அதிகாரம் அளிப்பது.",
    mission: "எங்கள் பணி",
    missionText: "விளையாட்டு வீரர்கள் இணைய, வளர மற்றும் அவர்களின் விளையாட்டு பயணத்தில் வெற்றிபெற புதுமையான கருவிகள் மற்றும் வாய்ப்புகளை வழங்குதல் மற்றும் ஒரு துடிப்பான சமூகத்தை உருவாக்குதல்.",
    joinForFree: "இலவசமாக சேருங்கள்"
  },

  // Telugu
  te: {
    // Welcome Page
    welcome: "అమాప్లేయర్‌కు స్వాగతం",
    tagline: "కనెక్ట్ అవ్వండి, పోటీపడండి మరియు గెలవండి",
    subtitle: "కలిసి ఆడి ముందుకు సాగండి",
    letsPlay: "ఆడుకుందాం",

    // Common
    login: "లాగిన్",
    logout: "లాగ్‌అవుట్",
    signOut: "సైన్ అవుట్",
    signup: "సైన్ అప్",
    back: "వెనుకకు",
    backToHome: "హోమ్‌కు తిరిగి వెళ్ళు",
    next: "తర్వాత",
    submit: "సమర్పించండి",
    cancel: "రద్దు చేయండి",
    joiningAs: "గా చేరుతున్నారు",
    email: "ఇమెయిల్",
    password: "పాస్వర్డ్",
    enterYourEmail: "మీ ఇమెయిల్‌ని నమోదు చేయండి",
    enterYourPassword: "మీ పాస్‌వర్డ్‌ని నమోదు చేయండి",
    loginAs: "గా లాగిన్ అవ్వండి",
    enterCredentials: "కొనసాగించడానికి మీ డైరలాగిన్ వివరాలు నమోదు చేయండి",
    loginFunctionalityComingSoon: "లాగిన్ కార్యాచరణ త్వరలో అందుబాటులోకి వస్తుంది.",
    dontHaveAccount: "ఖాతా లేదా?",
    signUp: "సైన్ అప్",

    // Role Selection Page
    welcomeToAmaplayer: "అమాప్లేయర్‌కు స్వాగతం",
    chooseYourRole: "కొనసాగించడానికి మీ పాత్రను ఎంచుకోండి",
    chooseRole: "మీ పాత్రను ఎంచుకోండి",

    // Roles
    athlete: "క్రీడాకారుడు",
    coach: "కోచ్",
    organization: "సంస్థ",
    parent: "తల్లిదండ్రులు",
    spouse: "జీవిత భాగస్వామి",

    // Role Descriptions
    athleteDescription: "మీ ప్రతిభను ప్రదర్శించండి మరియు కోచ్‌లతో కనెక్ట్ అవ్వండి",
    coachDescription: "తర్వాతి తరాన్ని కనుగొని శిక్షణ ఇవ్వండి",
    organizationDescription: "టీమ్లు మరియు పోటీలను నిర్వహించండి",
    parentDescription: "మీ పిల్లల అథ్లెటిక్ ప్రయాణాన్ని ట్రాక్ చేయండి",
    spouseDescription: "మీ అథ్లెట్ భాగస్వామికి మద్దతు ఇవ్వండి",

    // About Page
    welcomeTo: "స్వాగతం",
    yourJourney: "అథ్లెటిక్ శ్రేష్టతకు మీ ప్రయాణం ఇక్కడ నుండి ప్రారంభమవుతుంది",
    ourMission: "మా మిషన్",
    missionDescription: "అథ్లెట్లు, కోచ్‌లు మరియు సంస్థలను కనెక్ట్ చేసే ప్రపంచంలోనే అత్యంత సమగ్రమైన ప్లాట్‌ఫారమ్‌ను సృష్టించడం, టాలెంట్ అభివృద్ధిని ప్రోత్సహించడం మరియు అన్ని క్రీడా విభాగాలలో అథ్లెటిక్ శ్రేష్టత కోసం అవకాశాలను సృష్టించడం మా లక్ష్యం.",
    ourVision: "మా విజన్",
    visionDescription: "ప్రతి అథ్లెట్‌కు ప్రపంచ స్థాయి కోచింగ్ అందుబాటులో ఉండేలా, ప్రతి కోచ్ అసాధారణమైన ప్రతిభను కనుగొనగలిగేలా మరియు ప్రతి సంస్థ ఛాంపియన్‌షిప్ గెలిచే టీమ్‌లను నిర్మించగలిగేలా ఒక గ్లోబల్ ఎకోసిస్టమ్‌ను నిర్మించడం ద్వారా క్రీడల పరిశ్రమలో విప్లవం సాధించడం మా లక్ష్యం.",
    watchOurStory: "మా కథను చూడండి",
    videoLoadError: "మీరు దీన్ని చూస్తుంటే, వీడియో లోడ్ కాలేదు. దయచేసి లోపాల కోసం కన్సోల్‌ని తనిఖీ చేయండి.",
    videoNotSupported: "మీ బ్రౌజర్ వీడియో ట్యాగ్‌ని మద్దతు ఇవ్వదు.",
    continueToLogin: "లాగిన్‌కు కొనసాగించండి",
    chooseDifferentRole: "వేరే పాత్రను ఎంచుకోండి",

    // Vision & Mission (for WelcomePage)
    vision: "మా విజన్",
    visionText: "క్రీడాకారులు, కోచ్‌లు మరియు క్రీడా ఔత్సాహికులను కనెక్ట్ చేసే గ్లోబల్ ప్ల్యాట్‌ఫామ్‌ను సృష్టించడం, వారి ప్రతిభను ప్రదర్శించడానికి మరియు వారి కలలను సాధించడానికి వారికి అధికారం ఇవ్వడం.",
    mission: "మా మిషన్",
    missionText: "క్రీడాకారులు కనెక్ట్ అవ్వడానికి, ఎదగడానికి మరియు వారి క్రీడా ప్రయాణంలో విజయం సాధించడానికి వినూత్న సాధనాలు మరియు అవకాశాలను అందించడం మరియు ఒక శక్తివంతమైన సంఘాన్ని నిర్మించడం.",
    joinForFree: "ఉచితంగా చేరండి"
  },

  // Punjabi
  pa: {
    // Welcome Page
    welcome: "ਅਮਾਪਲੇਅਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ",
    tagline: "ਜੁੜੋ, ਮੁਕਾਬਲਾ ਕਰੋ ਅਤੇ ਜਿੱਤੋ",
    subtitle: "ਆਓ ਇਕੱਠੇ ਖੇਡੀਏ ਅਤੇ ਉੱਪਰ ਉੱਠੀਏ",
    letsPlay: "ਆਓ ਖੇਡੀਏ",

    // Common
    login: "ਲੌਗਿਨ",
    logout: "ਲੌਗਆਉਟ",
    signOut: "ਸਾਈਨ ਆਉਟ",
    signup: "ਸਾਈਨ ਅੱਪ",
    back: "ਪਿੱਛੇ",
    backToHome: "ਘਰ ਵਾਪਸ ਜਾਓ",
    next: "ਅਗਲਾ",
    submit: "ਜਮ੍ਹਾਂ ਕਰੋ",
    cancel: "ਰੱਦ ਕਰੋ",
    joiningAs: "ਇਸ ਤੌਰ 'ਤੇ ਸ਼ਾਮਲ ਹੋ ਰਹੇ ਹੋ",
    email: "ਈਮੇਲ",
    password: "ਪਾਸਵਰਡ",
    enterYourEmail: "ਆਪਣਾ ਈਮੇਲ ਦਾਖਲ ਕਰੋ",
    enterYourPassword: "ਆਪਣਾ ਪਾਸਵਰਡ ਦਾਖਲ ਕਰੋ",
    loginAs: "ਇਸ ਤੌਰ 'ਤੇ ਲੌਗਇਨ ਕਰੋ",
    enterCredentials: "ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣੇ ਕ੍ਰੈਡੈਂਸ਼ੀਅਲ ਦਾਖਲ ਕਰੋ",
    loginFunctionalityComingSoon: "ਲੌਗਇਨ ਫੰਕਸ਼ਨੈਲਿਟੀ ਜਲਦੀ ਆ ਰਹੀ ਹੈ।",
    dontHaveAccount: "ਖਾਤਾ ਨਹੀਂ ਹੈ?",
    signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",

    // Role Selection Page
    welcomeToAmaplayer: "ਅਮਾਪਲੇਅਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ",
    chooseYourRole: "ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ",
    chooseRole: "ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ",

    // Roles
    athlete: "ਖਿਡਾਰੀ",
    coach: "ਕੋਚ",
    organization: "ਸੰਗਠਨ",
    parent: "ਮਾਤਾ-ਪਿਤਾ",
    spouse: "ਜੀਵਨ ਸਾਥੀ",

    // Role Descriptions
    athleteDescription: "ਆਪਣੀ ਪ੍ਰਤਿਭਾ ਦਿਖਾਓ ਅਤੇ ਕੋਚਾਂ ਨਾਲ ਜੁੜੋ",
    coachDescription: "ਅਗਲੀ ਪੀੜ੍ਹੀ ਦੀ ਖੋਜ ਕਰੋ ਅਤੇ ਸਿਖਲਾਈ ਦਿਓ",
    organizationDescription: "ਟੀਮਾਂ ਅਤੇ ਮੁਕਾਬਲਿਆਂ ਦਾ ਪ੍ਰਬੰਧਨ ਕਰੋ",
    parentDescription: "ਆਪਣੇ ਬੱਚੇ ਦੀ ਐਥਲੈਟਿਕ ਯਾਤਰਾ ਨੂੰ ਟ੍ਰੈਕ ਕਰੋ",
    spouseDescription: "ਆਪਣੇ ਐਥਲੀਟ ਸਾਥੀ ਦਾ ਸਮਰਥਨ ਕਰੋ",

    // About Page
    welcomeTo: "ਸਵਾਗਤ ਹੈ",
    yourJourney: "ਐਥਲੈਟਿਕ ਉੱਤਮਤਾ ਦੀ ਤੁਹਾਡੀ ਯਾਤਰਾ ਇੱਥੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ",
    ourMission: "ਸਾਡਾ ਮਿਸ਼ਨ",
    missionDescription: "ਦੁਨੀਆ ਦਾ ਸਭ ਤੋਂ ਵਿਆਪਕ ਪਲੇਟਫਾਰਮ ਬਣਾਉਣਾ ਜੋ ਐਥਲੀਟਾਂ, ਕੋਚਾਂ ਅਤੇ ਸੰਗਠਨਾਂ ਨੂੰ ਜੋੜਦਾ ਹੈ, ਪ੍ਰਤਿਭਾ ਵਿਕਾਸ ਨੂੰ ਉਤਸ਼ਾਹਿਤ ਕਰਦਾ ਹੈ ਅਤੇ ਸਾਰੇ ਖੇਡ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਐਥਲੈਟਿਕ ਉੱਤਮਤਾ ਲਈ ਮੌਕੇ ਪੈਦਾ ਕਰਦਾ ਹੈ।",
    ourVision: "ਸਾਡੀ ਦ੍ਰਿਸ਼ਟੀ",
    visionDescription: "ਇੱਕ ਗਲੋਬਲ ਈਕੋਸਿਸਟਮ ਬਣਾ ਕੇ ਖੇਡ ਉਦਯੋਗ ਵਿੱਚ ਕ੍ਰਾਂਤੀ ਲਿਆਉਣਾ ਜਿੱਥੇ ਹਰ ਐਥਲੀਟ ਨੂੰ ਵਿਸ਼ਵ ਪੱਧਰੀ ਕੋਚਿੰਗ ਤੱਕ ਪਹੁੰਚ ਹੋਵੇ, ਹਰ ਕੋਚ ਅਸਾਧਾਰਣ ਪ੍ਰਤਿਭਾ ਦੀ ਖੋਜ ਕਰ ਸਕੇ, ਅਤੇ ਹਰ ਸੰਗਠਨ ਚੈਂਪੀਅਨਸ਼ਿਪ ਜਿੱਤਣ ਵਾਲੀਆਂ ਟੀਮਾਂ ਬਣਾ ਸਕੇ।",
    watchOurStory: "ਸਾਡੀ ਕਹਾਣੀ ਦੇਖੋ",
    videoLoadError: "ਜੇ ਤੁਸੀਂ ਇਹ ਦੇਖ ਰਹੇ ਹੋ, ਤਾਂ ਵੀਡੀਓ ਲੋਡ ਨਹੀਂ ਹੋਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਗਲਤੀਆਂ ਲਈ ਕੰਸੋਲ ਦੀ ਜਾਂਚ ਕਰੋ।",
    videoNotSupported: "ਤੁਹਾਡਾ ਬ੍ਰਾਊਜ਼ਰ ਵੀਡੀਓ ਟੈਗ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ।",
    continueToLogin: "ਲੌਗਇਨ 'ਤੇ ਜਾਰੀ ਰੱਖੋ",
    chooseDifferentRole: "ਵੱਖਰੀ ਭੂਮਿਕਾ ਚੁਣੋ",

    // Vision & Mission (for WelcomePage)
    vision: "ਸਾਡੀ ਦ੍ਰਿਸ਼ਟੀ",
    visionText: "ਇੱਕ ਗਲੋਬਲ ਪਲੇਟਫਾਰਮ ਬਣਾਉਣਾ ਜੋ ਐਥਲੀਟਾਂ, ਕੋਚਾਂ ਅਤੇ ਖੇਡ ਪ੍ਰੇਮੀਆਂ ਨੂੰ ਜੋੜਦਾ ਹੈ, ਉਹਨਾਂ ਨੂੰ ਆਪਣੀ ਪ੍ਰਤਿਭਾ ਦਿਖਾਉਣ ਅਤੇ ਆਪਣੇ ਸੁਪਨਿਆਂ ਨੂੰ ਪ੍ਰਾਪਤ ਕਰਨ ਦਾ ਅਧਿਕਾਰ ਦਿੰਦਾ ਹੈ।",
    mission: "ਸਾਡਾ ਮਿਸ਼ਨ",
    missionText: "ਐਥਲੀਟਾਂ ਨੂੰ ਜੁੜਨ, ਵਧਣ ਅਤੇ ਆਪਣੀ ਖੇਡ ਯਾਤਰਾ ਵਿੱਚ ਸਫਲ ਹੋਣ ਲਈ ਨਵੀਨਤਾਕਾਰੀ ਸਾਧਨ ਅਤੇ ਮੌਕੇ ਪ੍ਰਦਾਨ ਕਰਨਾ ਅਤੇ ਇੱਕ ਜੀਵੰਤ ਭਾਈਚਾਰਾ ਬਣਾਉਣਾ।",
    joinForFree: "ਮੁਫ਼ਤ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ"
  },

  // Marathi
  mr: {
    // Welcome Page
    welcome: "अमाप्लेयरमध्ये आपले स्वागत आहे",
    tagline: "जोडा, स्पर्धा करा आणि जिंका",
    subtitle: "चला एकत्र खेळूया आणि उंच उडूया",
    letsPlay: "चला खेळूया",

    // Common
    login: "लॉगिन",
    logout: "लॉगआउट",
    signOut: "साइन आउट",
    signup: "साइन अप",
    back: "मागे",
    backToHome: "होमवर परत जा",
    next: "पुढे",
    submit: "सबमिट करा",
    cancel: "रद्द करा",
    joiningAs: "या स्वरूपात सामील होत आहात",
    email: "ईमेल",
    password: "पासवर्ड",
    enterYourEmail: "तुमचा ईमेल टाका",
    enterYourPassword: "तुमचा पासवर्ड टाका",
    loginAs: "या स्वरूपात लॉगिन करा",
    enterCredentials: "सुरू ठेवण्यासाठी तुमची माहिती टाका",
    loginFunctionalityComingSoon: "लॉगिन फंक्शनॅलिटी लवकरच येईल।",
    dontHaveAccount: "खाते नाही?",
    signUp: "साइन अप करा",

    // Role Selection Page
    welcomeToAmaplayer: "अमाप्लेयरमध्ये आपले स्वागत आहे",
    chooseYourRole: "सुरू ठेवण्यासाठी तुमची भूमिका निवडा",
    chooseRole: "तुमची भूमिका निवडा",

    // Roles
    athlete: "खेळाडू",
    coach: "प्रशिक्षक",
    organization: "संस्था",
    parent: "पालक",
    spouse: "जोडीदार",

    // Role Descriptions
    athleteDescription: "तुमची प्रतिभा दाखवा आणि प्रशिक्षकांशी जुळा",
    coachDescription: "पुढील पिढीचा शोध घ्या आणि प्रशिक्षण द्या",
    organizationDescription: "संघ आणि स्पर्धांचे व्यवस्थापन करा",
    parentDescription: "तुमच्या मुलाच्या ॲथलेटिक प्रवासाचा मागोवा घ्या",
    spouseDescription: "तुमच्या ॲथलीट जोडीदाराला पाठिंबा द्या",

    // About Page
    welcomeTo: "स्वागत आहे",
    yourJourney: "ॲथलेटिक उत्कृष्टतेचा तुमचा प्रवास येथे सुरू होतो",
    ourMission: "आमचे ध्येय",
    missionDescription: "जगातील सर्वात व्यापक प्लॅटफॉर्म तयार करणे जे ॲथलीट, प्रशिक्षक आणि संस्थांना जोडते, प्रतिभा विकासाला चालना देते आणि सर्व क्रीडा विषयांमध्ये ॲथलेटिक उत्कृष्टतेसाठी संधी निर्माण करते.",
    ourVision: "आमची दृष्टी",
    visionDescription: "एक जागतिक इकोसिस्टम तयार करून क्रीडा उद्योगात क्रांती घडवून आणणे जिथे प्रत्येक ॲथलीटला जागतिक दर्जाच्या प्रशिक्षणाची सोय असेल, प्रत्येक प्रशिक्षक असाधारण प्रतिभा शोधू शकेल आणि प्रत्येक संस्था चॅम्पियनशिप जिंकणारे संघ तयार करू शकेल।",
    watchOurStory: "आमची कथा पहा",
    videoLoadError: "जर तुम्ही हे पाहत असाल तर व्हिडिओ लोड झाला नाही. कृपया त्रुटींसाठी कन्सोल तपासा।",
    videoNotSupported: "तुमचा ब्राउझर व्हिडिओ टॅगला सपोर्ट करत नाही।",
    continueToLogin: "लॉगिनवर सुरू ठेवा",
    chooseDifferentRole: "वेगळी भूमिका निवडा",

    // Vision & Mission (for WelcomePage)
    vision: "आमची दृष्टी",
    visionText: "एक जागतिक प्लॅटफॉर्म तयार करणे जे ॲथलीट, प्रशिक्षक आणि क्रीडा उत्साही यांना जोडते, त्यांना त्यांची प्रतिभा दाखवण्यासाठी आणि त्यांची स्वप्ने पूर्ण करण्यासाठी सक्षम करते.",
    mission: "आमचे ध्येय",
    missionText: "ॲथलीटना जोडण्यासाठी, वाढण्यासाठी आणि त्यांच्या क्रीडा प्रवासात यशस्वी होण्यासाठी नाविन्यपूर्ण साधने आणि संधी प्रदान करणे आणि एक जीवंत समुदाय तयार करणे.",
    joinForFree: "मोफत सामील व्हा"
  },

  // Kannada
  kn: {
    // Welcome Page
    welcome: "ಅಮಾಪ್ಲೇಯರ್‌ಗೆ ಸ್ವಾಗತ",
    tagline: "ಸಂಪರ್ಕಿಸಿ, ಸ್ಪರ್ಧಿಸಿ ಮತ್ತು ಗೆಲ್ಲಿ",
    subtitle: "ಒಟ್ಟಿಗೆ ಆಡೋಣ ಮತ್ತು ಮೇಲೇಳೋಣ",
    letsPlay: "ಆಡೋಣ",

    // Common
    login: "ಲಾಗಿನ್",
    logout: "ಲಾಗ್‌ಔಟ್",
    signOut: "ಸೈನ್ ಔಟ್",
    signup: "ಸೈನ್ ಅಪ್",
    back: "ಹಿಂದೆ",
    backToHome: "ಹೋಮ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    next: "ಮುಂದೆ",
    submit: "ಸಲ್ಲಿಸಿ",
    cancel: "ರದ್ದುಗೊಳಿಸಿ",
    joiningAs: "ಈ ರೂಪದಲ್ಲಿ ಸೇರುತ್ತಿದ್ದೀರಿ",
    email: "ಇಮೇಲ್",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    enterYourEmail: "ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ",
    enterYourPassword: "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ",
    loginAs: "ಈ ರೂಪದಲ್ಲಿ ಲಾಗಿನ್ ಆಗಿ",
    enterCredentials: "ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪರಿಚಯಪತ್ರಗಳನ್ನು ನಮೂದಿಸಿ",
    loginFunctionalityComingSoon: "ಲಾಗಿನ್ ಕಾರ್ಯವು ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ.",
    dontHaveAccount: "ಖಾತೆ ಇಲ್ಲವೇ?",
    signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",

    // Role Selection Page
    welcomeToAmaplayer: "ಅಮಾಪ್ಲೇಯರ್‌ಗೆ ಸ್ವಾಗತ",
    chooseYourRole: "ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    chooseRole: "ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",

    // Roles
    athlete: "ಆಟಗಾರ",
    coach: "ತರಬೇತುದಾರ",
    organization: "ಸಂಸ್ಥೆ",
    parent: "ಪೋಷಕರು",
    spouse: "ಜೀವಿತ ಸಂಗಾತಿ",

    // Role Descriptions
    athleteDescription: "ನಿಮ್ಮ ಪ್ರತಿಭೆಯನ್ನು ತೋರಿಸಿ ಮತ್ತು ತರಬೇತುದಾರರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಿ",
    coachDescription: "ಮುಂದಿನ ಪೀಳಿಗೆಯನ್ನು ಕಂಡುಹಿಡಿಯಿರಿ ಮತ್ತು ತರಬೇತಿ ನೀಡಿ",
    organizationDescription: "ತಂಡಗಳು ಮತ್ತು ಸ್ಪರ್ಧೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
    parentDescription: "ನಿಮ್ಮ ಮಗುವಿನ ಅಥ್ಲೆಟಿಕ್ ಪ್ರಯಾಣವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    spouseDescription: "ನಿಮ್ಮ ಅಥ್ಲೀಟ್ ಸಂಗಾತಿಯನ್ನು ಬೆಂಬಲಿಸಿ",

    // About Page
    welcomeTo: "ಸ್ವಾಗತ",
    yourJourney: "ಅಥ್ಲೆಟಿಕ್ ಉತ್ಕೃಷ್ಟತೆಯತ್ತ ನಿಮ್ಮ ಪ್ರಯಾಣ ಇಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ",
    ourMission: "ನಮ್ಮ ಮಿಷನ್",
    missionDescription: "ಅಥ್ಲೀಟ್‌ಗಳು, ತರಬೇತುದಾರರು ಮತ್ತು ಸಂಸ್ಥೆಗಳನ್ನು ಸಂಪರ್ಕಿಸುವ ವಿಶ್ವದ ಅತ್ಯಂತ ಸಮಗ್ರ ವೇದಿಕೆಯನ್ನು ರಚಿಸುವುದು, ಪ್ರತಿಭೆ ಅಭಿವೃದ್ಧಿಯನ್ನು ಉತ್ತೇಜಿಸುವುದು ಮತ್ತು ಎಲ್ಲಾ ಕ್ರೀಡಾ ವಿಭಾಗಗಳಲ್ಲಿ ಅಥ್ಲೆಟಿಕ್ ಉತ್ಕೃಷ್ಟತೆಗಾಗಿ ಅವಕಾಶಗಳನ್ನು ಸೃಷ್ಟಿಸುವುದು.",
    ourVision: "ನಮ್ಮ ದೃಷ್ಟಿ",
    visionDescription: "ಪ್ರತಿ ಅಥ್ಲೀಟ್‌ಗೆ ವಿಶ್ವ ದರ್ಜೆಯ ತರಬೇತಿ ಲಭ್ಯವಿರುವ, ಪ್ರತಿ ತರಬೇತುದಾರ ಅಸಾಧಾರಣ ಪ್ರತಿಭೆಯನ್ನು ಕಂಡುಹಿಡಿಯಬಹುದಾದ ಮತ್ತು ಪ್ರತಿ ಸಂಸ್ಥೆ ಚಾಂಪಿಯನ್‌ಶಿಪ್ ಗೆಲ್ಲುವ ತಂಡಗಳನ್ನು ನಿರ್ಮಿಸಬಹುದಾದ ಜಾಗತಿಕ ಪರಿಸರ ವ್ಯವಸ್ಥೆಯನ್ನು ನಿರ್ಮಿಸುವ ಮೂಲಕ ಕ್ರೀಡಾ ಉದ್ಯಮದಲ್ಲಿ ಕ್ರಾಂತಿ ತರುವುದು.",
    watchOurStory: "ನಮ್ಮ ಕಥೆಯನ್ನು ವೀಕ್ಷಿಸಿ",
    videoLoadError: "ನೀವು ಇದನ್ನು ನೋಡುತ್ತಿದ್ದರೆ, ವೀಡಿಯೊ ಲೋಡ್ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ದೋಷಗಳಿಗಾಗಿ ಕನ್ಸೋಲ್ ಪರಿಶೀಲಿಸಿ.",
    videoNotSupported: "ನಿಮ್ಮ ಬ್ರೌಸರ್ ವೀಡಿಯೊ ಟ್ಯಾಗ್ ಅನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.",
    continueToLogin: "ಲಾಗಿನ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ",
    chooseDifferentRole: "ವಿಭಿನ್ನ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",

    // Vision & Mission (for WelcomePage)
    vision: "ನಮ್ಮ ದೃಷ್ಟಿ",
    visionText: "ಅಥ್ಲೀಟ್‌ಗಳು, ತರಬೇತುದಾರರು ಮತ್ತು ಕ್ರೀಡಾ ಉತ್ಸಾಹಿಗಳನ್ನು ಸಂಪರ್ಕಿಸುವ ಜಾಗತಿಕ ವೇದಿಕೆಯನ್ನು ರಚಿಸುವುದು, ಅವರ ಪ್ರತಿಭೆಯನ್ನು ಪ್ರದರ್ಶಿಸಲು ಮತ್ತು ಅವರ ಕನಸುಗಳನ್ನು ಸಾಧಿಸಲು ಅವರಿಗೆ ಅಧಿಕಾರ ನೀಡುವುದು.",
    mission: "ನಮ್ಮ ಮಿಷನ್",
    missionText: "ಅಥ್ಲೀಟ್‌ಗಳು ಸಂಪರ್ಕಿಸಲು, ಬೆಳೆಯಲು ಮತ್ತು ಅವರ ಕ್ರೀಡಾ ಪ್ರಯಾಣದಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಲು ನವೀನ ಸಾಧನಗಳು ಮತ್ತು ಅವಕಾಶಗಳನ್ನು ಒದಗಿಸುವುದು ಮತ್ತು ಉತ್ಸಾಹಭರಿತ ಸಮುದಾಯವನ್ನು ನಿರ್ಮಿಸುವುದು.",
    joinForFree: "ಉಚಿತವಾಗಿ ಸೇರಿ"
  },

  // Malayalam
  ml: {
    // Welcome Page
    welcome: "അമാപ്ലേയറിലേക്ക് സ്വാഗതം",
    tagline: "ബന്ധിപ്പിക്കുക, മത്സരിക്കുക, വിജയിക്കുക",
    subtitle: "നമുക്ക് ഒന്നിച്ച് കളിച്ച് ഉയരാം",
    letsPlay: "നമുക്ക് കളിക്കാം",

    // Common
    login: "ലോഗിൻ",
    logout: "ലോഗ്ഔട്ട്",
    signOut: "സൈൻ ഔട്ട്",
    signup: "സൈൻ അപ്പ്",
    back: "തിരികെ",
    backToHome: "ഹോമിലേക്ക് മടങ്ങുക",
    next: "അടുത്തത്",
    submit: "സമർപ്പിക്കുക",
    cancel: "റദ്ദാക്കുക",
    joiningAs: "ഈ രൂപത്തിൽ ചേരുന്നു",
    email: "ഇമെയിൽ",
    password: "പാസ്‌വേഡ്",
    enterYourEmail: "നിങ്ങളുടെ ഇമെയിൽ നൽകുക",
    enterYourPassword: "നിങ്ങളുടെ പാസ്‌വേഡ് നൽകുക",
    loginAs: "ഈ രൂപത്തിൽ ലോഗിൻ ചെയ്യുക",
    enterCredentials: "തുടരാൻ നിങ്ങളുടെ യോഗ്യതാപത്രങ്ങൾ നൽകുക",
    loginFunctionalityComingSoon: "ലോഗിൻ പ്രവർത്തനം ഉടൻ വരുന്നു.",
    dontHaveAccount: "അക്കൗണ്ട് ഇല്ലേ?",
    signUp: "സൈൻ അപ്പ് ചെയ്യുക",

    // Role Selection Page
    welcomeToAmaplayer: "അമാപ്ലേയറിലേക്ക് സ്വാഗതം",
    chooseYourRole: "തുടരാൻ നിങ്ങളുടെ റോൾ തിരഞ്ഞെടുക്കുക",
    chooseRole: "നിങ്ങളുടെ റോൾ തിരഞ്ഞെടുക്കുക",

    // Roles
    athlete: "കളിക്കാരൻ",
    coach: "പരിശീലകൻ",
    organization: "സംഘടന",
    parent: "രക്ഷാകർത്താവ്",
    spouse: "ജീവിത പങ്കാളി",

    // Role Descriptions
    athleteDescription: "നിങ്ങളുടെ പ്രതിഭ പ്രദർശിപ്പിക്കുകയും പരിശീലകരുമായി ബന്ധപ്പെടുകയും ചെയ്യുക",
    coachDescription: "അടുത്ത തലമുറയെ കണ്ടെത്തി പരിശീലിപ്പിക്കുക",
    organizationDescription: "ടീമുകളും മത്സരങ്ങളും നിയന്ത്രിക്കുക",
    parentDescription: "നിങ്ങളുടെ കുട്ടിയുടെ കായിക യാത്ര ട്രാക്ക് ചെയ്യുക",
    spouseDescription: "നിങ്ങളുടെ കായികതാരത്തെ പിന്തുണയ്ക്കുക",

    // About Page
    welcomeTo: "സ്വാഗതം",
    yourJourney: "കായിക മികവിലേക്കുള്ള നിങ്ങളുടെ യാത്ര ഇവിടെ ആരംഭിക്കുന്നു",
    ourMission: "ഞങ്ങളുടെ ദൗത്യം",
    missionDescription: "കായികതാരങ്ങളെയും പരിശീലകരെയും സംഘടനകളെയും ബന്ധിപ്പിക്കുന്ന ലോകത്തിലെ ഏറ്റവും സമഗ്രമായ പ്ലാറ്റ്ഫോം സൃഷ്ടിക്കുക, പ്രതിഭാ വികസനം പ്രോത്സാഹിപ്പിക്കുക, എല്ലാ കായിക വിഭാഗങ്ങളിലും കായിക മികവിനുള്ള അവസരങ്ങൾ സൃഷ്ടിക്കുക.",
    ourVision: "ഞങ്ങളുടെ ദർശനം",
    visionDescription: "ഓരോ കായികതാരത്തിനും ലോകോത്തര പരിശീലനം ലഭ്യമാകുന്ന, ഓരോ പരിശീലകനും അസാധാരണ പ്രതിഭ കണ്ടെത്താനാകുന്ന, ഓരോ സംഘടനയ്ക്കും ചാമ്പ്യൻഷിപ്പ് നേടുന്ന ടീമുകൾ നിർമ്മിക്കാനാകുന്ന ആഗോള ആവാസവ്യവസ്ഥ സൃഷ്ടിച്ച് കായിക വ്യവസായത്തിൽ വിപ്ലവം കൊണ്ടുവരിക.",
    watchOurStory: "ഞങ്ങളുടെ കഥ കാണുക",
    videoLoadError: "നിങ്ങൾ ഇത് കാണുകയാണെങ്കിൽ, വീഡിയോ ലോഡ് ചെയ്തില്ല. ദയവായി പിശകുകൾക്കായി കൺസോൾ പരിശോധിക്കുക.",
    videoNotSupported: "നിങ്ങളുടെ ബ്രൗസർ വീഡിയോ ടാഗിനെ പിന്തുണയ്ക്കുന്നില്ല.",
    continueToLogin: "ലോഗിനിലേക്ക് തുടരുക",
    chooseDifferentRole: "വ്യത്യസ്ത റോൾ തിരഞ്ഞെടുക്കുക",

    // Vision & Mission (for WelcomePage)
    vision: "ഞങ്ങളുടെ ദർശനം",
    visionText: "കായികതാരങ്ങളെയും പരിശീലകരെയും കായിക പ്രേമികളെയും ബന്ധിപ്പിക്കുന്ന ആഗോള പ്ലാറ്റ്ഫോം സൃഷ്ടിക്കുക, അവരുടെ കഴിവുകൾ പ്രദർശിപ്പിക്കാനും അവരുടെ സ്വപ്നങ്ങൾ നേടാനും അവരെ ശാക്തീകരിക്കുക.",
    mission: "ഞങ്ങളുടെ ദൗത്യം",
    missionText: "കായികതാരങ്ങൾക്ക് ബന്ധപ്പെടാനും വളരാനും അവരുടെ കായിക യാത്രയിൽ വിജയിക്കാനും നൂതന ഉപകരണങ്ങളും അവസരങ്ങളും നൽകുകയും ഊർജ്ജസ്വലമായ ഒരു കമ്മ്യൂണിറ്റി കെട്ടിപ്പടുക്കുകയും ചെയ്യുക.",
    joinForFree: "സൗജന്യമായി ചേരുക"
  },

  // Gujarati
  gu: {
    // Welcome Page
    welcome: "અમાપ્લેયરમાં આપનું સ્વાગત છે",
    tagline: "જોડાઓ, સ્પર્ધા કરો અને જીતો",
    subtitle: "ચાલો સાથે રમીએ અને ઉંચા થઈએ",
    letsPlay: "ચાલો રમીએ",

    // Common
    login: "લોગિન",
    logout: "લોગઆઉટ",
    signOut: "સાઇન આઉટ",
    signup: "સાઇન અપ",
    back: "પાછળ",
    backToHome: "હોમ પર પાછા જાઓ",
    next: "આગળ",
    submit: "સબમિટ કરો",
    cancel: "રદ કરો",
    joiningAs: "આ રૂપમાં જોડાઈ રહ્યા છો",
    email: "ઈમેલ",
    password: "પાસવર્ડ",
    enterYourEmail: "તમારું ઈમેલ દાખલ કરો",
    enterYourPassword: "તમારો પાસવર્ડ દાખલ કરો",
    loginAs: "આ રૂપમાં લોગિન કરો",
    enterCredentials: "ચાલુ રાખવા માટે તમારી માહિતી દાખલ કરો",
    loginFunctionalityComingSoon: "લોગિન ફંક્શનાલિટી ટૂંક સમયમાં આવશે.",
    dontHaveAccount: "એકાઉન્ટ નથી?",
    signUp: "સાઇન અપ કરો",

    // Role Selection Page
    welcomeToAmaplayer: "અમાપ્લેયરમાં આપનું સ્વાગત છે",
    chooseYourRole: "ચાલુ રાખવા માટે તમારી ભૂમિકા પસંદ કરો",
    chooseRole: "તમારી ભૂમિકા પસંદ કરો",

    // Roles
    athlete: "ખેલાડી",
    coach: "કોચ",
    organization: "સંસ્થા",
    parent: "માતાપિતા",
    spouse: "જીવનસાથી",

    // Role Descriptions
    athleteDescription: "તમારી પ્રતિભા દર્શાવો અને કોચ સાથે જોડાઓ",
    coachDescription: "આગામી પેઢીને શોધો અને તાલીમ આપો",
    organizationDescription: "ટીમો અને સ્પર્ધાઓનું સંચાલન કરો",
    parentDescription: "તમારા બાળકની એથ્લેટિક યાત્રાને ટ્રેક કરો",
    spouseDescription: "તમારા એથ્લીટ સાથીને સમર્થન આપો",

    // About Page
    welcomeTo: "સ્વાગત છે",
    yourJourney: "એથ્લેટિક ઉત્કૃષ્ટતા તરફની તમારી યાત્રા અહીંથી શરૂ થાય છે",
    ourMission: "અમારું મિશન",
    missionDescription: "વિશ્વનું સૌથી વ્યાપક પ્લેટફોર્મ બનાવવું જે એથ્લીટ્સ, કોચ અને સંસ્થાઓને જોડે છે, પ્રતિભા વિકાસને પ્રોત્સાહન આપે છે અને તમામ રમતગમત વિષયોમાં એથ્લેટિક ઉત્કૃષ્ટતા માટે તકો બનાવે છે.",
    ourVision: "અમારી દ્રષ્ટિ",
    visionDescription: "એક વૈશ્વિક ઈકોસિસ્ટમ બનાવીને રમતગમત ઉદ્યોગમાં ક્રાંતિ લાવવી જ્યાં દરેક એથ્લીટને વિશ્વ સ્તરની કોચિંગ મળે, દરેક કોચ અસાધારણ પ્રતિભા શોધી શકે અને દરેક સંસ્થા ચેમ્પિયનશિપ જીતતી ટીમો બનાવી શકે.",
    watchOurStory: "અમારી વાર્તા જુઓ",
    videoLoadError: "જો તમે આ જોઈ રહ્યા છો, તો વિડિઓ લોડ થયો નથી. કૃપા કરીને ભૂલો માટે કન્સોલ તપાસો.",
    videoNotSupported: "તમારું બ્રાઉઝર વિડિઓ ટેગને સપોર્ટ કરતું નથી.",
    continueToLogin: "લોગિન પર ચાલુ રાખો",
    chooseDifferentRole: "અલગ ભૂમિકા પસંદ કરો",

    // Vision & Mission (for WelcomePage)
    vision: "અમારી દ્રષ્ટિ",
    visionText: "એક વૈશ્વિક પ્લેટફોર્મ બનાવવું જે ખેલાડીઓ, કોચ અને રમતગમત પ્રેમીઓને જોડે છે, તેમને તેમની પ્રતિભા દર્શાવવા અને તેમના સપના હાંસલ કરવા માટે સશક્ત બનાવે છે.",
    mission: "અમારું મિશન",
    missionText: "ખેલાડીઓને જોડવા, વધવા અને તેમની રમત યાત્રામાં સફળ થવા માટે નવીન સાધનો અને તકો પૂરી પાડવી અને એક ઉત્સાહી સમુદાય બનાવવો.",
    joinForFree: "મફતમાં જોડાઓ"
  },

  // Odia
  or: {
    // Welcome Page
    welcome: "ଅମାପ୍ଲେୟାରରେ ସ୍ୱାଗତ",
    tagline: "ସଂଯୋଗ କରନ୍ତୁ, ପ୍ରତିଯୋଗିତା କରନ୍ତୁ ଏବଂ ଜିତନ୍ତୁ",
    subtitle: "ଆସନ୍ତୁ ଏକାଠି ଖେଳିବା ଏବଂ ଉଠିବା",
    letsPlay: "ଆସନ୍ତୁ ଖେଳିବା",

    // Common
    login: "ଲଗଇନ",
    logout: "ଲଗଆଉଟ",
    signOut: "ସାଇନ ଆଉଟ",
    signup: "ସାଇନ ଅପ",
    back: "ପଛକୁ",
    backToHome: "ହୋମକୁ ଫେରିଯାଆନ୍ତୁ",
    next: "ପରବର୍ତ୍ତୀ",
    submit: "ଦାଖଲ କରନ୍ତୁ",
    cancel: "ବାତିଲ କରନ୍ତୁ",
    joiningAs: "ଏହି ରୂପରେ ଯୋଗଦାନ କରୁଛନ୍ତି",
    email: "ଇମେଲ",
    password: "ପାସୱାର୍ଡ",
    enterYourEmail: "ଆପଣଙ୍କର ଇମେଲ ପ୍ରବେଶ କରନ୍ତୁ",
    enterYourPassword: "ଆପଣଙ୍କର ପାସୱାର୍ଡ ପ୍ରବେଶ କରନ୍ତୁ",
    loginAs: "ଏହି ରୂପରେ ଲଗଇନ କରନ୍ତୁ",
    enterCredentials: "ଜାରି ରଖିବାକୁ ଆପଣଙ୍କର ପରିଚୟପତ୍ର ପ୍ରବେଶ କରନ୍ତୁ",
    loginFunctionalityComingSoon: "ଲଗଇନ କାର୍ଯ୍ୟକାରିତା ଶୀଘ୍ର ଆସୁଛି।",
    dontHaveAccount: "ଖାତା ନାହିଁ?",
    signUp: "ସାଇନ ଅପ କରନ୍ତୁ",

    // Role Selection Page
    welcomeToAmaplayer: "ଅମାପ୍ଲେୟାରରେ ସ୍ୱାଗତ",
    chooseYourRole: "ଜାରି ରଖିବାକୁ ଆପଣଙ୍କର ଭୂମିକା ବାଛନ୍ତୁ",
    chooseRole: "ଆପଣଙ୍କର ଭୂମିକା ବାଛନ୍ତୁ",

    // Roles
    athlete: "ଖେଳାଳି",
    coach: "କୋଚ୍",
    organization: "ସଂସ୍ଥା",
    parent: "ପିତାମାତା",
    spouse: "ଜୀବନସାଥୀ",

    // Role Descriptions
    athleteDescription: "ଆପଣଙ୍କର ପ୍ରତିଭା ପ୍ରଦର୍ଶନ କରନ୍ତୁ ଏବଂ କୋଚମାନଙ୍କ ସହିତ ସଂଯୋଗ କରନ୍ତୁ",
    coachDescription: "ପରବର୍ତ୍ତୀ ପି generation ଼ି ଆବିଷ୍କାର କରନ୍ତୁ ଏବଂ ପ୍ରଶିକ୍ଷଣ ଦିଅନ୍ତୁ",
    organizationDescription: "ଦଳ ଏବଂ ପ୍ରତିଯୋଗିତା ପରିଚାଳନା କରନ୍ତୁ",
    parentDescription: "ଆପଣଙ୍କ ପିଲାଙ୍କ ଆଥଲେଟିକ୍ ଯାତ୍ରା ଟ୍ରାକ କରନ୍ତୁ",
    spouseDescription: "ଆପଣଙ୍କର ଆଥଲେଟ୍ ସାଥୀଙ୍କୁ ସମର୍ଥନ କରନ୍ତୁ",

    // About Page
    welcomeTo: "ସ୍ୱାଗତ",
    yourJourney: "ଆଥଲେଟିକ୍ ଉତ୍କର୍ଷତା ପ୍ରତି ଆପଣଙ୍କର ଯାତ୍ରା ଏଠାରୁ ଆରମ୍ଭ ହୁଏ",
    ourMission: "ଆମର ମିଶନ",
    missionDescription: "ବିଶ୍ୱର ସବୁଠାରୁ ବ୍ୟାପକ ପ୍ଲାଟଫର୍ମ ସୃଷ୍ଟି କରିବା ଯାହା ଆଥଲେଟ୍, କୋଚ୍ ଏବଂ ସଂସ୍ଥାଗୁଡ଼ିକୁ ସଂଯୋଗ କରେ, ପ୍ରତିଭା ବିକାଶକୁ ପ୍ରୋତ୍ସାହିତ କରେ ଏବଂ ସମସ୍ତ କ୍ରୀଡା ବିଭାଗରେ ଆଥଲେଟିକ୍ ଉତ୍କର୍ଷତା ପାଇଁ ସୁଯୋଗ ସୃଷ୍ଟି କରେ।",
    ourVision: "ଆମର ଦୃଷ୍ଟିକୋଣ",
    visionDescription: "ଏକ ବିଶ୍ୱସ୍ତରୀୟ ଇକୋସିଷ୍ଟମ୍ ନିର୍ମାଣ କରି କ୍ରୀଡା ଶିଳ୍ପରେ ବିପ୍ଳବ ଆଣିବା ଯେଉଁଠାରେ ପ୍ରତ୍ୟେକ ଆଥଲେଟ୍ଙ୍କୁ ବିଶ୍ୱମାନର କୋଚିଂ ମିଳିବ, ପ୍ରତ୍ୟେକ କୋଚ୍ ଅସାଧାରଣ ପ୍ରତିଭା ଆବିଷ୍କାର କରିପାରିବେ ଏବଂ ପ୍ରତ୍ୟେକ ସଂସ୍ଥା ଚାମ୍ପିୟାନଶିପ୍ ଜିତୁଥିବା ଦଳ ଗଠନ କରିପାରିବେ।",
    watchOurStory: "ଆମର କାହାଣୀ ଦେଖନ୍ତୁ",
    videoLoadError: "ଯଦି ଆପଣ ଏହା ଦେଖୁଛନ୍ତି, ଭିଡିଓ ଲୋଡ୍ ହୋଇନାହିଁ। ଦୟାକରି ତ୍ରୁଟି ପାଇଁ କନସୋଲ୍ ଯାଞ୍ଚ କରନ୍ତୁ।",
    videoNotSupported: "ଆପଣଙ୍କର ବ୍ରାଉଜର୍ ଭିଡିଓ ଟ୍ୟାଗ୍କୁ ସମର୍ଥନ କରେ ନାହିଁ।",
    continueToLogin: "ଲଗଇନ୍କୁ ଜାରି ରଖନ୍ତୁ",
    chooseDifferentRole: "ଭିନ୍ନ ଭୂମିକା ବାଛନ୍ତୁ",

    // Vision & Mission (for WelcomePage)
    vision: "ଆମର ଦୃଷ୍ଟିକୋଣ",
    visionText: "ଏକ ବିଶ୍ୱସ୍ତରୀୟ ପ୍ଲାଟଫର୍ମ ସୃଷ୍ଟି କରିବା ଯାହା ଖେଳାଳି, କୋଚ୍ ଏବଂ କ୍ରୀଡା ଉତ୍ସାହୀମାନଙ୍କୁ ସଂଯୋଗ କରେ, ସେମାନଙ୍କର ପ୍ରତିଭା ପ୍ରଦର୍ଶନ ଏବଂ ସେମାନଙ୍କର ସ୍ୱପ୍ନ ହାସଲ କରିବାକୁ ସେମାନଙ୍କୁ ସଶକ୍ତ କରେ।",
    mission: "ଆମର ମିଶନ",
    missionText: "ଖେଳାଳିମାନଙ୍କୁ ସଂଯୋଗ କରିବା, ବୃଦ୍ଧି କରିବା ଏବଂ ସେମାନଙ୍କର କ୍ରୀଡା ଯାତ୍ରାରେ ସଫଳ ହେବା ପାଇଁ ନୂତନ ସାଧନ ଏବଂ ସୁଯୋଗ ପ୍ରଦାନ କରିବା ଏବଂ ଏକ ଜୀବନ୍ତ ସମୁଦାୟ ଗଠନ କରିବା।",
    joinForFree: "ମାଗଣାରେ ଯୋଗଦାନ କରନ୍ତୁ"
  },

  // Assamese
  as: {
    // Welcome Page
    welcome: "আমাপ্লেয়াৰলৈ স্বাগতম",
    tagline: "সংযোগ কৰক, প্ৰতিযোগিতা কৰক আৰু জয় কৰক",
    subtitle: "আহক একেলগে খেলো আৰু উন্নীত হওঁ",
    letsPlay: "আহক খেলো",

    // Common
    login: "লগইন",
    logout: "লগআউট",
    signOut: "চাইন আউট",
    signup: "চাইন আপ",
    back: "পিছলৈ",
    backToHome: "হোমলৈ উভতি যাওক",
    next: "পৰৱৰ্তী",
    submit: "দাখিল কৰক",
    cancel: "বাতিল কৰক",
    joiningAs: "এই ৰূপত যোগদান কৰি আছে",
    email: "ইমেইল",
    password: "পাছৱৰ্ড",
    enterYourEmail: "আপোনাৰ ইমেইল প্ৰৱেশ কৰক",
    enterYourPassword: "আপোনাৰ পাছৱৰ্ড প্ৰৱেশ কৰক",
    loginAs: "এই ৰূপত লগইন কৰক",
    enterCredentials: "অব্যাহত ৰাখিবলৈ আপোনাৰ পৰিচয়পত্ৰ প্ৰৱেশ কৰক",
    loginFunctionalityComingSoon: "লগইন কাৰ্যক্ষমতা শীঘ্ৰে আহিব।",
    dontHaveAccount: "একাউণ্ট নাই?",
    signUp: "চাইন আপ কৰক",

    // Role Selection Page
    welcomeToAmaplayer: "আমাপ্লেয়াৰলৈ স্বাগতম",
    chooseYourRole: "অব্যাহত ৰাখিবলৈ আপোনাৰ ভূমিকা বাছনি কৰক",
    chooseRole: "আপোনাৰ ভূমিকা বাছনি কৰক",

    // Roles
    athlete: "খেলুৱৈ",
    coach: "প্ৰশিক্ষক",
    organization: "সংস্থা",
    parent: "পিতৃ-মাতৃ",
    spouse: "জীৱন সংগী",

    // Role Descriptions
    athleteDescription: "আপোনাৰ প্ৰতিভা প্ৰদৰ্শন কৰক আৰু প্ৰশিক্ষকসকলৰ সৈতে সংযোগ কৰক",
    coachDescription: "পৰৱৰ্তী প্ৰজন্ম আবিষ্কাৰ কৰক আৰু প্ৰশিক্ষণ দিয়ক",
    organizationDescription: "দল আৰু প্ৰতিযোগিতা পৰিচালনা কৰক",
    parentDescription: "আপোনাৰ সন্তানৰ ক্ৰীড়া যাত্ৰা ট্ৰেক কৰক",
    spouseDescription: "আপোনাৰ ক্ৰীড়াবিদ সংগীক সমৰ্থন কৰক",

    // About Page
    welcomeTo: "স্বাগতম",
    yourJourney: "ক্ৰীড়া উৎকৰ্ষতাৰ প্ৰতি আপোনাৰ যাত্ৰা ইয়াতে আৰম্ভ হয়",
    ourMission: "আমাৰ মিচন",
    missionDescription: "বিশ্বৰ আটাইতকৈ ব্যাপক প্লেটফৰ্ম সৃষ্টি কৰা যিয়ে ক্ৰীড়াবিদ, প্ৰশিক্ষক আৰু সংস্থাসমূহক সংযোগ কৰে, প্ৰতিভা বিকাশক উৎসাহিত কৰে আৰু সকলো খেলা বিভাগত ক্ৰীড়া উৎকৰ্ষতাৰ বাবে সুযোগ সৃষ্টি কৰে।",
    ourVision: "আমাৰ দৃষ্টি",
    visionDescription: "এটা বিশ্বব্যাপী পৰিৱেশ তন্ত্ৰ নিৰ্মাণ কৰি খেলা উদ্যোগত বিপ্লৱ অনা য'ত প্ৰতিজন ক্ৰীড়াবিদে বিশ্বমানৰ প্ৰশিক্ষণ লাভ কৰিব, প্ৰতিজন প্ৰশিক্ষকে অসাধাৰণ প্ৰতিভা আবিষ্কাৰ কৰিব পাৰিব আৰু প্ৰতিটো সংস্থাই চেম্পিয়নশ্বিপ জয়ী দল গঠন কৰিব পাৰিব।",
    watchOurStory: "আমাৰ কাহিনী চাওক",
    videoLoadError: "যদি আপুনি এইটো চাই আছে, ভিডিঅ' ল'ড নহ'ল। অনুগ্ৰহ কৰি ত্ৰুটিৰ বাবে কনছ'ল পৰীক্ষা কৰক।",
    videoNotSupported: "আপোনাৰ ব্ৰাউজাৰে ভিডিঅ' টেগ সমৰ্থন নকৰে।",
    continueToLogin: "লগইনলৈ অব্যাহত ৰাখক",
    chooseDifferentRole: "বেলেগ ভূমিকা বাছনি কৰক",

    // Vision & Mission (for WelcomePage)
    vision: "আমাৰ দৃষ্টি",
    visionText: "এটা বিশ্বব্যাপী প্লেটফৰ্ম সৃষ্টি কৰা যিয়ে খেলুৱৈ, প্ৰশিক্ষক আৰু ক্ৰীড়া উৎসাহীসকলক সংযোগ কৰে, তেওঁলোকক তেওঁলোকৰ প্ৰতিভা প্ৰদৰ্শন কৰিবলৈ আৰু তেওঁলোকৰ সপোন প্ৰাপ্ত কৰিবলৈ ক্ষমতা প্ৰদান কৰে।",
    mission: "আমাৰ মিচন",
    missionText: "খেলুৱৈসকলক সংযোগ কৰিবলৈ, বৃদ্ধি কৰিবলৈ আৰু তেওঁলোকৰ ক্ৰীড়া যাত্ৰাত সফল হ'বলৈ উদ্ভাৱনী সঁজুলি আৰু সুযোগ প্ৰদান কৰা আৰু এটা সজীৱ সম্প্ৰদায় নিৰ্মাণ কৰা।",
    joinForFree: "বিনামূল্যে যোগদান কৰক"
  }
};

export const translate = (key: string, language: string = 'en'): string => {
  return translations[language]?.[key] || translations['en'][key] || key;
};

export default translations;
