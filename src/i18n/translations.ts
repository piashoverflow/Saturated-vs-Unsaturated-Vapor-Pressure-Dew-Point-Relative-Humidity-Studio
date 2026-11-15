export type Language = 'bn' | 'en';
export type ModuleId = 'module1' | 'module2' | 'module3';

export interface Translations {
  appTitle: string;
  institutionBadge: string;
  resetLabel: string;
  langToggleLabel: string;
  tabs: {
    module1: string;
    module2: string;
    module3: string;
  };
  common: {
    controlsHeader: string;
    telemetryHeader: string;
    playback: string;
    play: string;
    pause: string;
    mmHg: string;
    kPa: string;
    celsius: string;
    liter: string;
    percent: string;
    formulaCardTitle: string;
    keyInsight: string;
  };
  m1: {
    stageTitle: string;
    stageSubtitle: string;
    tempLabel: string;
    liquidSupplyLabel: string;
    abundantLiquid: string;
    tinyDroplet: string;
    evacuateBtn: string;
    dryAirToggle: string;
    dryAirDesc: string;
    evapRateLabel: string;
    condRateLabel: string;
    equilibriumBadge: string;
    evaporatingBadge: string;
    unsaturatedExhaustedBadge: string;
    condensingBadge: string;
    svpLabel: string;
    actualVaporLabel: string;
    dryAirPressureLabel: string;
    totalPressureLabel: string;
    liquidRemainingLabel: string;
    legendEvap: string;
    legendCond: string;
    legendVapor: string;
    legendDryAir: string;
    insightEquilibrium: string;
    insightExhausted: string;
    insightDalton: string;
  };
  m2: {
    stageTitle: string;
    stageSubtitle: string;
    cylinderTitle: string;
    graphTitle: string;
    volumeLabel: string;
    tempLabel: string;
    jumpUnsaturated: string;
    jumpSaturation: string;
    jumpCompressed: string;
    dragHint: string;
    stateUnsaturated: string;
    stateSaturated: string;
    boyleObeyed: string;
    boyleViolated: string;
    svpLimitLabel: string;
    actualPressureLabel: string;
    boylePredictedLabel: string;
    pvProductLabel: string;
    condensedWaterLabel: string;
    vSatLabel: string;
    graphAxisV: string;
    graphAxisP: string;
    legendActual: string;
    legendBoyleDash: string;
    insightUnsaturated: string;
    insightSaturated: string;
  };
  m3: {
    stageTitle: string;
    stageSubtitle: string;
    boxTitle: string;
    curveTitle: string;
    boxTempLabel: string;
    initialMoistureLabel: string;
    autoCoolBtn: string;
    autoCoolingActive: string;
    reheatBtn: string;
    dewPointLabel: string;
    boxTempShort: string;
    initialVaporShort: string;
    actualVaporShort: string;
    svpAtBoxLabel: string;
    condensedWaterLabel: string;
    relHumidityLabel: string;
    statusHotAir: string;
    statusCoolingUnsat: string;
    statusDewFalling: string;
    comfortDry: string;
    comfortComfortable: string;
    comfortHumid: string;
    legendCurve: string;
    legendTrace: string;
    legendCondensed: string;
    boxHotTag: string;
    boxDewTag: string;
    boxWaterFloorLabel: string;
    insightUnsaturated: string;
    insightCondensing: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  bn: {
    appTitle: 'সম্পৃক্ত-অসম্পৃক্ত বাষ্পচাপ, শিশিরাঙ্ক ও আপেক্ষিক আর্দ্রতা ল্যাব',
    institutionBadge: 'উদ্ভাস',
    resetLabel: 'রিসেট',
    langToggleLabel: 'English',
    tabs: {
      module1: 'মডিউল ১: বাষ্পীভবন, ঘনীভবন ও সাম্যাবস্থা',
      module2: 'মডিউল ২: স্থির তাপমাত্রায় চাপ-আয়তন সম্পর্ক',
      module3: 'মডিউল ৩: শিশিরাঙ্ক ও আপেক্ষিক আর্দ্রতা',
    },
    common: {
      controlsHeader: 'পরীক্ষণ নিয়ন্ত্রণ প্যানেল',
      telemetryHeader: 'লাইভ পরিমাপ ও তথ্য',
      playback: 'সিমুলেশন চলন',
      play: 'চালু',
      pause: 'বিরতি',
      mmHg: 'mmHg',
      kPa: 'kPa',
      celsius: '°C',
      liter: 'L',
      percent: '%',
      formulaCardTitle: 'পদার্থবিজ্ঞানের মূল সূত্র',
      keyInsight: 'বৈজ্ঞানিক ব্যাখ্যা',
    },
    m1: {
      stageTitle: 'বাষ্পীভবন, ঘনীভবন ও সম্পৃক্ত বাষ্পচাপ চেম্বার',
      stageSubtitle: 'আবদ্ধ পাত্রে তরল ও বাষ্পের গতিশীল সাম্যাবস্থা পর্যবেক্ষণ',
      tempLabel: 'চেম্বারের তাপমাত্রা (T)',
      liquidSupplyLabel: 'প্রাথমিক তরল পানির পরিমাণ',
      abundantLiquid: 'পর্যাপ্ত পানি (অসীম উৎস)',
      tinyDroplet: 'সামান্য জলকণা (নিঃশেষযোগ্য)',
      evacuateBtn: 'বাষ্প অপসারণ / শূন্যস্থান রিসেট',
      dryAirToggle: 'শুষ্ক বায়ু মিশ্রণ (ডাল্টনের সূত্র পরীক্ষা)',
      dryAirDesc: 'শুষ্ক N₂/O₂ অণু যোগ করে দেখুন সম্পৃক্ত বাষ্পচাপ F পরিবর্তিত হয় কিনা',
      evapRateLabel: 'বাষ্পীভবনের হার',
      condRateLabel: 'ঘনীভবনের হার',
      equilibriumBadge: 'গতিশীল সাম্যাবস্থা (সম্পৃক্ত)',
      evaporatingBadge: 'বাষ্পীভবন চলছে (অসম্পৃক্ত)',
      unsaturatedExhaustedBadge: 'তরল নিঃশেষ — অসম্পৃক্ত বাষ্প',
      condensingBadge: 'ঘনীভবন চলছে (অতিপৃক্ত)',
      svpLabel: 'সম্পৃক্ত বাষ্পচাপ F(T)',
      actualVaporLabel: 'প্রকৃত জলীয় বাষ্পচাপ (f)',
      dryAirPressureLabel: 'শুষ্ক বায়ুর চাপ (P_air)',
      totalPressureLabel: 'মোট চেম্বার চাপ (P_total)',
      liquidRemainingLabel: 'অবশিষ্ট তরল পানি',
      legendEvap: 'বাষ্পীভবন',
      legendCond: 'ঘনীভবন',
      legendVapor: 'জলীয় বাষ্প (H₂O)',
      legendDryAir: 'শুষ্ক বায়ু (N₂/O₂)',
      insightEquilibrium:
        'যখন বাষ্পীভবনের হার এবং ঘনীভবনের হার সমান হয়, তখন গতিশীল সাম্যাবস্থা সৃষ্টি হয়। এ অবস্থার চাপই সম্পৃক্ত বাষ্পচাপ F(T), যা কেবল তাপমাত্রার ওপর নির্ভর করে।',
      insightExhausted:
        'সব তরল বাষ্পীভূত হয়ে গেছে! পর্যাপ্ত তরল না থাকায় প্রকৃত চাপ f < F(T), তাই এটি এখন অসম্পৃক্ত বাষ্প।',
      insightDalton:
        'ডাল্টনের আংশিক চাপ সূত্র: শুষ্ক বায়ু যোগ করলে মোট চাপ P_total বাড়ে, কিন্তু জলীয় বাষ্পের সম্পৃক্ত বাষ্পচাপ F(T) অপরিবর্তিত থাকে।',
    },
    m2: {
      stageTitle: 'স্থির তাপমাত্রায় বাষ্পের চাপ-আয়তন সম্পর্ক (সমতাপীয় সংকোচন)',
      stageSubtitle: 'সম্পৃক্ত বনাম অসম্পৃক্ত বাষ্পের ক্ষেত্রে বয়েলের সূত্রের আচরণ যাচাই',
      cylinderTitle: 'দাগাঙ্কিত পিস্টন সিলিন্ডার',
      graphTitle: 'লাইভ P বনাম V সমতাপীয় লেখচিত্র',
      volumeLabel: 'পিস্টনের আয়তন (V)',
      tempLabel: 'স্থির সমতাপীয় তাপমাত্রা (T)',
      jumpUnsaturated: 'অসম্পৃক্ত অঞ্চল (8.5 L)',
      jumpSaturation: 'সম্পৃক্তি বিন্দু (4.2 L)',
      jumpCompressed: 'অধিক সংকোচন (2.0 L)',
      dragHint: 'ক্যানভাসে পিস্টন হাতল উপর-নিচ টেনে আয়তন পরিবর্তন করুন',
      stateUnsaturated: 'অসম্পৃক্ত বাষ্প (f < F)',
      stateSaturated: 'সম্পৃক্ত বাষ্প (f = F)',
      boyleObeyed: 'বয়েলের সূত্র প্রযোজ্য (PV = ধ্রুবক)',
      boyleViolated: 'বয়েলের সূত্র প্রযোজ্য নয় (P = F ধ্রুবক)',
      svpLimitLabel: 'সম্পৃক্ত বাষ্পচাপ সীমা F(T)',
      actualPressureLabel: 'সিলিন্ডারের প্রকৃত চাপ (P)',
      boylePredictedLabel: 'বয়েল সূত্র অনুযায়ী সম্ভাব্য চাপ',
      pvProductLabel: 'চাপ × আয়তন (P × V)',
      condensedWaterLabel: 'ঘনীভূত তরল পানি',
      vSatLabel: 'সম্পৃক্তি আয়তন (V_sat)',
      graphAxisV: 'আয়তন V (লিটার)',
      graphAxisP: 'বাষ্পচাপ P (mmHg)',
      legendActual: 'প্রকৃত চাপ (P)',
      legendBoyleDash: 'কাল্পনিক বয়েল রেখা (লঙ্ঘিত)',
      insightUnsaturated:
        'V > V_sat অঞ্চলে বাষ্প অসম্পৃক্ত থাকায় আয়তন কমালে চাপ ব্যস্তানুপাতিকভাবে বাড়ে (P ∝ 1/V), অর্থাৎ বয়েলের সূত্র মেনে চলে।',
      insightSaturated:
        'V ≤ V_sat হলে বাষ্প সম্পৃক্ত হয়ে যায়। এরপর আয়তন আরও কমালেও চাপ F(T)-এর বেশি হতে পারে না; অতিরিক্ত বাষ্প ঘনীভূত হয়ে তরল পানিতে পরিণত হয়!',
    },
    m3: {
      stageTitle: 'হট এয়ার বক্স শীতলীকরণ, শিশির বিন্দু পতন ও শিশিরাঙ্ক (θ_dew) ল্যাব',
      stageSubtitle: 'গরম বায়ুভর্তি বক্সের তাপমাত্রা কমিয়ে শিশির পড়া, নিচে পানি জমা এবং সম্পৃক্ত বাষ্পচাপ লেখচিত্র পর্যবেক্ষণ',
      boxTitle: 'আবদ্ধ হট এয়ার শীতলীকরণ বক্স',
      curveTitle: 'সম্পৃক্ত বাষ্পচাপ বনাম তাপমাত্রা লেখচিত্র F(θ)',
      boxTempLabel: 'বক্সের বায়ুর তাপমাত্রা (θ_box)',
      initialMoistureLabel: 'প্রাথমিক জলীয় বাষ্পের পরিমাণ (f₀)',
      autoCoolBtn: 'স্বয়ংক্রিয়ভাবে বক্স শীতল করুন (40°C → 4°C)',
      autoCoolingActive: 'বক্স শীতল হচ্ছে...',
      reheatBtn: 'পুনরায় গরম বায়ু অবস্থায় ফিরুন (40°C)',
      dewPointLabel: 'শিশিরাঙ্ক (θ_dew)',
      boxTempShort: 'বক্সের তাপমাত্রা (θ_box)',
      initialVaporShort: 'প্রাথমিক বাষ্পচাপ (f₀)',
      actualVaporShort: 'বায়ুতে বর্তমান বাষ্পচাপ (f)',
      svpAtBoxLabel: 'বর্তমান তাপমাত্রায় সম্পৃক্ত চাপ (F)',
      condensedWaterLabel: 'বক্সের নিচে জমা পানি (Δf = f₀ − f)',
      relHumidityLabel: 'আপেক্ষিক আর্দ্রতা (R)',
      statusHotAir: 'গরম ও অসম্পৃক্ত বায়ু — কোনো শিশির পড়ছে না',
      statusCoolingUnsat: 'বায়ু শীতল হচ্ছে — এখনো শিশিরাঙ্কে পৌঁছায়নি',
      statusDewFalling: 'শিশিরাঙ্ক অতিক্রান্ত! শিশির ঝরছে ও বক্সের নিচে পানি জমছে',
      comfortDry: 'শুষ্ক বায়ু',
      comfortComfortable: 'স্বাভাবিক আর্দ্রতা',
      comfortHumid: 'সম্পৃক্ত / আর্দ্র বায়ু',
      legendCurve: 'সম্পৃক্ত বাষ্পচাপ রেখা F(θ)',
      legendTrace: 'শীতলীকরণ পথ (প্রথমে আনুভূমিক, পরে F(θ) বরাবর নিচে)',
      legendCondensed: 'ঘনীভূত পানি Δf',
      boxHotTag: 'গরম বায়ু',
      boxDewTag: 'শিশির পড়ছে',
      boxWaterFloorLabel: 'জমা পানি',
      insightUnsaturated:
        'বক্সের তাপমাত্রা শিশিরাঙ্ক (θ_dew)-এর চেয়ে বেশি থাকায় বায়ু অসম্পৃক্ত। তাপমাত্রা কমালে বাষ্পচাপ f₀ স্থির থাকে এবং আপেক্ষিক আর্দ্রতা R দ্রুত ১০০%-এর দিকে বাড়তে থাকে।',
      insightCondensing:
        'তাপমাত্রা শিশিরাঙ্কে (θ_dew) নেমে এলে বায়ু ১০০% সম্পৃক্ত হয়। এর নিচে তাপমাত্রা আরও কমালে বাষ্পচাপ F(θ) রেখা বরাবর কমে যায় এবং অতিরিক্ত বাষ্প (Δf = f₀ − F) শিশির হয়ে ঝরে বক্সের নিচে পানি হিসেবে জমা হয়!',
    },
  },
  en: {
    appTitle: 'Saturated vs Unsaturated Vapor Pressure, Dew Point & Relative Humidity Studio',
    institutionBadge: 'উদ্ভাস',
    resetLabel: 'Reset',
    langToggleLabel: 'বাংলা',
    tabs: {
      module1: 'Module 1: Evaporation & SVP Equilibrium',
      module2: 'Module 2: Isothermal Compression (P-V)',
      module3: 'Module 3: Dew Point & Relative Humidity',
    },
    common: {
      controlsHeader: 'Experiment Controls',
      telemetryHeader: 'Live Telemetry',
      playback: 'Simulation Playback',
      play: 'Play',
      pause: 'Pause',
      mmHg: 'mmHg',
      kPa: 'kPa',
      celsius: '°C',
      liter: 'L',
      percent: '%',
      formulaCardTitle: 'Governing Equations',
      keyInsight: 'Physical Interpretation',
    },
    m1: {
      stageTitle: 'Evaporation, Condensation & Saturated Vapor Chamber',
      stageSubtitle: 'Observing liquid-vapor dynamic equilibrium inside a sealed chamber',
      tempLabel: 'Chamber Temperature (T)',
      liquidSupplyLabel: 'Initial Liquid Water Supply',
      abundantLiquid: 'Abundant Liquid Pool',
      tinyDroplet: 'Tiny Droplet (Exhaustible)',
      evacuateBtn: 'Evacuate Vapor / Reset Headspace',
      dryAirToggle: "Add Dry Air (Dalton's Law Test)",
      dryAirDesc: 'Inject dry N₂/O₂ molecules and verify whether SVP F(T) changes',
      evapRateLabel: 'Evaporation Rate',
      condRateLabel: 'Condensation Rate',
      equilibriumBadge: 'Dynamic Equilibrium (Saturated)',
      evaporatingBadge: 'Net Evaporation (Unsaturated)',
      unsaturatedExhaustedBadge: 'Liquid Exhausted — Unsaturated',
      condensingBadge: 'Net Condensation (Supersaturated)',
      svpLabel: 'Saturated Vapor Pressure F(T)',
      actualVaporLabel: 'Actual Vapor Pressure (f)',
      dryAirPressureLabel: 'Dry Air Pressure (P_air)',
      totalPressureLabel: 'Total Chamber Pressure (P_total)',
      liquidRemainingLabel: 'Liquid Water Remaining',
      legendEvap: 'Evaporation',
      legendCond: 'Condensation',
      legendVapor: 'Water Vapor (H₂O)',
      legendDryAir: 'Dry Air (N₂/O₂)',
      insightEquilibrium:
        'Dynamic equilibrium occurs when evaporation rate equals condensation rate. The equilibrium pressure is the Saturated Vapor Pressure F(T), which depends strictly on temperature.',
      insightExhausted:
        'All liquid has evaporated! Because insufficient liquid remains, actual pressure f < F(T), leaving the vapor unsaturated.',
      insightDalton:
        "Dalton's Law of Partial Pressures: Adding dry air raises total chamber pressure P_total, while water's equilibrium Saturated Vapor Pressure F(T) remains completely unchanged.",
    },
    m2: {
      stageTitle: 'Isothermal Vapor Compression — Saturated vs Unsaturated',
      stageSubtitle: "Testing Boyle's Law validity and breakdown at the saturation threshold",
      cylinderTitle: 'Graduated Piston Cylinder',
      graphTitle: 'Live P vs V Isotherm Plot',
      volumeLabel: 'Piston Volume (V)',
      tempLabel: 'Isothermal Temperature (T)',
      jumpUnsaturated: 'Unsaturated (8.5 L)',
      jumpSaturation: 'Saturation Point (4.2 L)',
      jumpCompressed: 'Deep Compression (2.0 L)',
      dragHint: 'Drag the piston handle vertically on canvas to compress or expand',
      stateUnsaturated: 'Unsaturated Vapor (f < F)',
      stateSaturated: 'Saturated Vapor (f = F)',
      boyleObeyed: "Boyle's Law Obeyed (PV = const)",
      boyleViolated: "Boyle's Law Violated (P = F = const)",
      svpLimitLabel: 'Saturation Limit F(T)',
      actualPressureLabel: 'Actual Chamber Pressure (P)',
      boylePredictedLabel: "Boyle's Law Ideal Prediction",
      pvProductLabel: 'Product P × V',
      condensedWaterLabel: 'Condensed Liquid Water',
      vSatLabel: 'Saturation Volume (V_sat)',
      graphAxisV: 'Volume V (L)',
      graphAxisP: 'Vapor Pressure P (mmHg)',
      legendActual: 'Actual Pressure (P)',
      legendBoyleDash: "Hypothetical Boyle's Curve (Violated)",
      insightUnsaturated:
        "For V > V_sat, the vapor is unsaturated and obeys Boyle's Law (P ∝ 1/V): halving volume doubles pressure.",
      insightSaturated:
        "Once compressed to V ≤ V_sat, the vapor saturates. Further compression cannot raise pressure above F(T)—excess vapor condenses into liquid droplets on the floor!",
    },
    m3: {
      stageTitle: 'Hot Air Cooling Box, Dew Precipitation & Dew Point (θ_dew) Lab',
      stageSubtitle: 'Cool hot moist air inside a sealed box to observe falling dew, bottom water pooling & the SVP curve',
      boxTitle: 'Sealed Hot Air Cooling Box',
      curveTitle: 'Saturation Vapor Pressure Curve F(θ)',
      boxTempLabel: 'Box Air Temperature (θ_box)',
      initialMoistureLabel: 'Initial Vapor Content in Hot Air (f₀)',
      autoCoolBtn: 'Auto-Cool Hot Air Box (40°C → 4°C)',
      autoCoolingActive: 'Cooling Air Box...',
      reheatBtn: 'Reheat Box to Hot Air (40°C)',
      dewPointLabel: 'Dew Point (θ_dew)',
      boxTempShort: 'Box Temp (θ_box)',
      initialVaporShort: 'Initial Vapor Pressure (f₀)',
      actualVaporShort: 'Current Vapor in Air (f)',
      svpAtBoxLabel: 'SVP at Box Temp F(θ_box)',
      condensedWaterLabel: 'Water Collected at Floor (Δf = f₀ − f)',
      relHumidityLabel: 'Relative Humidity (R)',
      statusHotAir: 'Hot Unsaturated Air — Dry Box Floor',
      statusCoolingUnsat: 'Air Cooling — Above Dew Point (No Dew Yet)',
      statusDewFalling: 'Below Dew Point! Dew Falling & Water Pooling',
      comfortDry: 'Dry Air',
      comfortComfortable: 'Moderate Humidity',
      comfortHumid: 'Saturated / Condensing',
      legendCurve: 'Saturation Curve F(θ)',
      legendTrace: 'Cooling Path (Horizontal then along F(θ))',
      legendCondensed: 'Condensed Water Δf',
      boxHotTag: 'HOT AIR',
      boxDewTag: 'DEW FALLING',
      boxWaterFloorLabel: 'Pooled Water',
      insightUnsaturated:
        'Above the Dew Point (θ_box > θ_dew), the air is unsaturated. Cooling lowers temperature while vapor pressure stays constant at f₀, driving Relative Humidity toward 100%.',
      insightCondensing:
        'Once θ_box drops below θ_dew, the air saturates (100% RH). Further cooling forces excess vapor (Δf = f₀ − F) to condense into falling dew droplets that pool as liquid water at the bottom of the box!',
    },
  },
};
