import type {
  TargetPaceCategory,
  TrainingZone,
  ZoneProfile,
} from "../types/lactate";

export type Language = "nl" | "en";

type CopyKey =
  | "appTitle"
  | "tagline"
  | "language"
  | "pace"
  | "distance"
  | "export"
  | "overview"
  | "input"
  | "charts"
  | "zones"
  | "targets"
  | "race"
  | "unnamedRunner"
  | "testProfile"
  | "athleteProtocol"
  | "athlete"
  | "testDate"
  | "coach"
  | "maxHeartRate"
  | "protocol"
  | "coachRemarks"
  | "runnerName"
  | "coachOrLab"
  | "protocolPlaceholder"
  | "coachRemarksPlaceholder"
  | "inputEyebrow"
  | "inputTitle"
  | "loadExample"
  | "clear"
  | "addStep"
  | "step"
  | "distanceCol"
  | "speedCol"
  | "paceCol"
  | "durationCol"
  | "lactateCol"
  | "hrCol"
  | "rpeCol"
  | "noteCol"
  | "optional"
  | "emptySteps"
  | "summaryEyebrow"
  | "summaryTitle"
  | "aerobicSpeed"
  | "aerobicHr"
  | "anaerobicSpeed"
  | "anaerobicHr"
  | "maxSpeed"
  | "maxHr"
  | "maxLactate"
  | "maxLactateAllOutEyebrow"
  | "maxLactateAllOutTitle"
  | "allOutLactateSource"
  | "addValidData"
  | "highestValidHr"
  | "highestValidLactate"
  | "chart"
  | "lactateCurve"
  | "heartRateResponse"
  | "combinedChart"
  | "emptyChart"
  | "speedLabel"
  | "heartRate"
  | "hrPoints"
  | "lactatePoints"
  | "lt1Mode"
  | "lt2Mode"
  | "fixed2Mmol"
  | "fixed4Mmol"
  | "manualThreshold"
  | "setLt1FromChart"
  | "setLt2FromChart"
  | "trainingZonesEyebrow"
  | "trainingZonesTitle"
  | "zoneSystem"
  | "zoneSystem5"
  | "zoneSystem7"
  | "zonesNeedData"
  | "speed"
  | "heartRateLabel"
  | "unavailable"
  | "targetsEyebrow"
  | "targetsTitle"
  | "targetsNeedData"
  | "speedRange"
  | "paceRange"
  | "targetSpeed"
  | "targetPace"
  | "recovery"
  | "repetitions"
  | "totalVolume"
  | "fastEnd"
  | "controlledEnd"
  | "targetWindow"
  | "usefulFor"
  | "raceEstimates"
  | "raceEstimateNote"
  | "raceRiegelNote"
  | "raceBlendNote"
  | "estimatedTime"
  | "estimatedPace"
  | "method"
  | "raceTimesEyebrow"
  | "raceTimesTitle"
  | "addRaceTime"
  | "raceDistanceMeters"
  | "raceTime"
  | "emptyRaceTimes"
  | "exportEyebrow"
  | "exportTitle"
  | "exportJson"
  | "exportPdf"
  | "exportCsv"
  | "copySummary"
  | "jsonExported"
  | "pdfExported"
  | "csvExported"
  | "summaryCopied"
  | "lactateAnalysis"
  | "aerobicThreshold"
  | "anaerobicThreshold"
  | "generatedZones";

const copy: Record<Language, Record<CopyKey, string>> = {
  nl: {
    appTitle: "Dashboard voor lactaattesten bij lopers",
    tagline:
      "Eenvoudige invoer, automatische drempels, zones, richttijden en een proper rapport.",
    language: "Taal",
    pace: "Tempo",
    distance: "Afstand",
    export: "Export",
    overview: "Overzicht",
    input: "Invoer",
    charts: "Grafieken",
    zones: "Zones",
    targets: "Richttijden",
    race: "Wedstrijd",
    unnamedRunner: "Naamloze loper",
    testProfile: "Testprofiel",
    athleteProtocol: "Atleet en protocol",
    athlete: "Atleet",
    testDate: "Testdatum",
    coach: "Coach",
    maxHeartRate: "Maximale hartslag",
    protocol: "Protocol",
    coachRemarks: "Opmerkingen van trainer",
    runnerName: "Naam loper",
    coachOrLab: "Coach of labo",
    protocolPlaceholder: "Stapduur, ondergrond, toestel",
    coachRemarksPlaceholder:
      "Observaties, aandachtspunten en vervolgafspraken",
    inputEyebrow: "Invoer",
    inputTitle: "Bewerkbare lactaattabel",
    loadExample: "Voorbeeld laden",
    clear: "Wissen",
    addStep: "Stap toevoegen",
    step: "#",
    distanceCol: "Afstand",
    speedCol: "Snelheid",
    paceCol: "Tempo",
    durationCol: "Duur",
    lactateCol: "Lactaat",
    hrCol: "Hartslag",
    rpeCol: "RPE",
    noteCol: "Notitie",
    optional: "Optioneel",
    emptySteps:
      "Nog geen teststappen. Voeg een stap toe of laad de voorbeelddata.",
    summaryEyebrow: "Berekend overzicht",
    summaryTitle: "Drempels en testmaxima",
    aerobicSpeed: "Aerobe drempel snelheid",
    aerobicHr: "Aerobe drempel hartslag",
    anaerobicSpeed: "Anaerobe drempel snelheid",
    anaerobicHr: "Anaerobe drempel hartslag",
    maxSpeed: "Hoogste testsnelheid",
    maxHr: "Hoogste hartslag",
    maxLactate: "Hoogste lactaat",
    maxLactateAllOutEyebrow: "All-out einde",
    maxLactateAllOutTitle: "Maximale lactaatwaarde uit 400 m of 600 m",
    allOutLactateSource:
      "Bepaald uit de all-out 400 m/600 m aan het einde van de test.",
    addValidData: "Voeg testdata toe",
    highestValidHr: "Hoogste gemeten hartslagwaarde",
    highestValidLactate: "Hoogste gemeten lactaatwaarde",
    chart: "Grafiek",
    lactateCurve: "Lactaatcurve",
    heartRateResponse: "Hartslagrespons",
    combinedChart: "Lactaat, snelheid en hartslag",
    emptyChart: "Voeg voldoende testdata toe om deze grafiek te tonen.",
    speedLabel: "Snelheid",
    heartRate: "Hartslag",
    hrPoints: "Hartslagpunten",
    lactatePoints: "Lactaatpunten",
    lt1Mode: "Aerobe drempel (LT1)",
    lt2Mode: "Anaerobe drempel (LT2)",
    fixed2Mmol: "2 mmol",
    fixed4Mmol: "4 mmol",
    manualThreshold: "Handmatig vastleggen",
    setLt1FromChart: "LT1 vastleggen op de grafiek",
    setLt2FromChart: "LT2 vastleggen op de grafiek",
    trainingZonesEyebrow: "Trainingszones",
    trainingZonesTitle: "Automatische snelheid-, tempo- en hartslagzones",
    zoneSystem: "Zonesysteem",
    zoneSystem5: "5 zones",
    zoneSystem7: "7 zones",
    zonesNeedData: "Trainingszones hebben aerobe en anaerobe drempels nodig.",
    speed: "Snelheid",
    heartRateLabel: "Hartslag",
    unavailable: "Niet beschikbaar",
    targetsEyebrow: "Richttijden",
    targetsTitle: "Berekende intervaltargets per afstand",
    targetsNeedData:
      "Richttempo’s hebben duidelijke drempels en minstens vier testpunten nodig.",
    speedRange: "Snelheidsrange",
    paceRange: "Temporange",
    targetSpeed: "Doelsnelheid",
    targetPace: "Doeltempo",
    recovery: "Herstel",
    repetitions: "Herhalingen",
    totalVolume: "Totaalvolume",
    fastEnd: "Snel",
    controlledEnd: "Gecontroleerd",
    targetWindow: "Richtvenster",
    usefulFor: "Nuttig voor",
    raceEstimates: "Geschatte wedstrijdprestaties",
    raceEstimateNote:
      "Aparte wedstrijdinschattingen uit de lactaattest. Geen garantie en vooral nuttig als realistische richtlijn.",
    raceRiegelNote:
      "Voorspellingen met de Riegel-regel op basis van de ingevoerde wedstrijdtijden.",
    raceBlendNote:
      "Wedstrijdtijden en lactaattest worden per afstand gewogen gecombineerd.",
    estimatedTime: "Geschatte tijd",
    estimatedPace: "Geschat tempo",
    method: "Methode",
    raceTimesEyebrow: "Wedstrijd",
    raceTimesTitle:
      "Wedstrijdtijden voor voorspellingen en wedstrijdspecifieke intervallen",
    addRaceTime: "Wedstrijdtijd toevoegen",
    raceDistanceMeters: "Afstand (m)",
    raceTime: "Tijd",
    emptyRaceTimes:
      "Nog geen wedstrijdtijden. Voeg een resultaat toe om Riegel-voorspellingen te gebruiken.",
    exportEyebrow: "Export",
    exportTitle: "Rapport en data exporteren",
    exportJson: "JSON exporteren",
    exportPdf: "PDF exporteren",
    exportCsv: "CSV exporteren",
    copySummary: "Samenvatting kopiëren",
    jsonExported: "JSON geëxporteerd.",
    pdfExported: "PDF geëxporteerd.",
    csvExported: "CSV geëxporteerd.",
    summaryCopied: "Samenvatting gekopieerd naar klembord.",
    lactateAnalysis: "Lactaatanalyse",
    aerobicThreshold: "Aerobe drempel",
    anaerobicThreshold: "Anaerobe drempel",
    generatedZones: "Gegenereerde zones",
  },
  en: {
    appTitle: "Running lactate analysis dashboard",
    tagline:
      "Simple input, automatic thresholds, zones, target times, and a clean report.",
    language: "Language",
    pace: "Pace",
    distance: "Distance",
    export: "Export",
    overview: "Overview",
    input: "Input",
    charts: "Charts",
    zones: "Zones",
    targets: "Targets",
    race: "Race",
    unnamedRunner: "Unnamed runner",
    testProfile: "Test profile",
    athleteProtocol: "Athlete and protocol",
    athlete: "Athlete",
    testDate: "Test date",
    coach: "Coach",
    maxHeartRate: "Maximum heart rate",
    protocol: "Protocol",
    coachRemarks: "Coach's remarks",
    runnerName: "Runner name",
    coachOrLab: "Coach or lab",
    protocolPlaceholder: "Step duration, surface, device",
    coachRemarksPlaceholder: "Observations, focus points, and next steps",
    inputEyebrow: "Input",
    inputTitle: "Editable lactate test table",
    loadExample: "Load example",
    clear: "Clear",
    addStep: "Add step",
    step: "#",
    distanceCol: "Distance",
    speedCol: "Speed",
    paceCol: "Pace",
    durationCol: "Duration",
    lactateCol: "Lactate",
    hrCol: "Heart rate",
    rpeCol: "RPE",
    noteCol: "Note",
    optional: "Optional",
    emptySteps: "No test steps yet. Add a step or load the example dataset.",
    summaryEyebrow: "Calculated summary",
    summaryTitle: "Thresholds and test maxima",
    aerobicSpeed: "Aerobic threshold speed",
    aerobicHr: "Aerobic threshold HR",
    anaerobicSpeed: "Anaerobic threshold speed",
    anaerobicHr: "Anaerobic threshold HR",
    maxSpeed: "Maximum tested speed",
    maxHr: "Maximum HR",
    maxLactate: "Maximum lactate",
    maxLactateAllOutEyebrow: "All-out finish",
    maxLactateAllOutTitle: "Maximum lactate from 400 m or 600 m",
    allOutLactateSource:
      "Taken from the all-out 400 m/600 m at the end of the test.",
    addValidData: "Add test data",
    highestValidHr: "Highest recorded heart rate",
    highestValidLactate: "Highest recorded lactate value",
    chart: "Chart",
    lactateCurve: "Lactate curve",
    heartRateResponse: "Heart-rate response",
    combinedChart: "Lactate, speed, and heart rate",
    emptyChart: "Add enough test data to render this chart.",
    speedLabel: "Speed",
    heartRate: "Heart rate",
    hrPoints: "HR points",
    lactatePoints: "Lactate points",
    lt1Mode: "Aerobic threshold (LT1)",
    lt2Mode: "Anaerobic threshold (LT2)",
    fixed2Mmol: "2 mmol",
    fixed4Mmol: "4 mmol",
    manualThreshold: "Set manually",
    setLt1FromChart: "Set LT1 on the chart",
    setLt2FromChart: "Set LT2 on the chart",
    trainingZonesEyebrow: "Training zones",
    trainingZonesTitle: "Automatic speed, pace, and HR ranges",
    zoneSystem: "Zone system",
    zoneSystem5: "5 zones",
    zoneSystem7: "7 zones",
    zonesNeedData:
      "Training zones need aerobic and anaerobic threshold estimates.",
    speed: "Speed",
    heartRateLabel: "Heart rate",
    unavailable: "Unavailable",
    targetsEyebrow: "Target times",
    targetsTitle: "Calculated interval targets by distance",
    targetsNeedData:
      "Target times need clear threshold estimates and at least four test points.",
    speedRange: "Speed range",
    paceRange: "Pace range",
    targetSpeed: "Target speed",
    targetPace: "Target pace",
    recovery: "Recovery",
    repetitions: "Repetitions",
    totalVolume: "Total volume",
    fastEnd: "Fast",
    controlledEnd: "Controlled",
    targetWindow: "Target window",
    usefulFor: "Useful for",
    raceEstimates: "Estimated race performances",
    raceEstimateNote:
      "Separate race estimates from the lactate test. Not guaranteed, mainly useful as realistic guidance.",
    raceRiegelNote:
      "Predictions use the Riegel rule based on the entered race times.",
    raceBlendNote:
      "Race times and the lactate test are combined with distance-aware weighting.",
    estimatedTime: "Estimated time",
    estimatedPace: "Estimated pace",
    method: "Method",
    raceTimesEyebrow: "Race",
    raceTimesTitle: "Race times for predictions and race-specific intervals",
    addRaceTime: "Add race time",
    raceDistanceMeters: "Distance (m)",
    raceTime: "Time",
    emptyRaceTimes:
      "No race times yet. Add a result to use Riegel predictions.",
    exportEyebrow: "Export",
    exportTitle: "Export report and data",
    exportJson: "Export JSON",
    exportPdf: "Export PDF",
    exportCsv: "Export CSV",
    copySummary: "Copy summary",
    jsonExported: "JSON exported.",
    pdfExported: "PDF exported.",
    csvExported: "CSV exported.",
    summaryCopied: "Summary copied to clipboard.",
    lactateAnalysis: "Lactate analysis",
    aerobicThreshold: "Aerobic threshold",
    anaerobicThreshold: "Anaerobic threshold",
    generatedZones: "Generated zones",
  },
};

export function t(language: Language, key: CopyKey): string {
  return copy[language][key];
}

export function profileLabel(profile: ZoneProfile, language: Language): string {
  const labels: Record<Language, Record<ZoneProfile, string>> = {
    nl: {
      beginner: "Beginner",
      intermediate: "Gemiddeld",
      advanced: "Gevorderd",
    },
    en: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
  };
  return labels[language][profile];
}

const zoneCopy: Record<
  Language,
  Record<string, Pick<TrainingZone, "name" | "purpose" | "intensity">>
> = {
  nl: {
    Z1: {
      name: "Zone 1 - Onder LT1",
      purpose: "Lage intensiteit onder de eerste drempel.",
      intensity: "Rustig",
    },
    Z2: {
      name: "Zone 2 - LT1 tot LT2",
      purpose: "Werk tussen de eerste en tweede drempel.",
      intensity: "Steady tot hard",
    },
    Z3: {
      name: "Zone 3 - Boven LT2",
      purpose: "Hoge intensiteit boven de tweede drempel.",
      intensity: "Hard",
    },
    REC: {
      name: "Herstel",
      purpose: "Herstel, opwarming, cooling-down en zeer rustig aeroob lopen.",
      intensity: "Zeer rustig",
    },
    AER: {
      name: "Aeroob",
      purpose:
        "Aeroob uithoudingsvermogen onder LT1 met gecontroleerd lactaat.",
      intensity: "Rustig aeroob",
    },
    TMP: {
      name: "Tempo",
      purpose: "Gecontroleerde aerobe druk tussen LT1 en LT2.",
      intensity: "Matig",
    },
    SST: {
      name: "Sweet spot",
      purpose: "Sterk steady aeroob werk in de bovenste LT1-LT2-zone.",
      intensity: "Stevig",
    },
    THR: {
      name: "Drempel",
      purpose: "Werk rond LT2 en net erboven.",
      intensity: "Hard",
    },
    VO2: {
      name: "VO2max",
      purpose:
        "Snelle intervallen boven drempel tot de hoge aerobe bovengrens.",
      intensity: "Zeer hard",
    },
    NMR: {
      name: "Neuromusculair",
      purpose: "Kort snelheidswerk boven de standaard VO2-zone.",
      intensity: "Maximale snelheid",
    },
    recovery: {
      name: "Zone 1 - Herstel",
      purpose:
        "Lage mechanische en metabole belasting voor herstel en opwarming.",
      intensity: "Zeer rustig",
    },
    endurance: {
      name: "Zone 2 - Duur",
      purpose:
        "Duurvolume onder LT1 opbouwen met stabiele ademhaling en gecontroleerd lactaat.",
      intensity: "Rustig aeroob",
    },
    easy: {
      name: "Rustig aeroob",
      purpose: "Duurvolume opbouwen terwijl lactaat onder controle blijft.",
      intensity: "Rustig praten mogelijk",
    },
    steady: {
      name: "Steady aeroob",
      purpose: "Aeroob uithoudingsvermogen dicht bij de eerste lactaatknik.",
      intensity: "Comfortabel stevig",
    },
    tempo: {
      name: "Zone 3 - Tempo",
      purpose:
        "Aerobe druk tussen LT1 en LT2 verhogen zonder constant op drempel te lopen.",
      intensity: "Matig tot stevig",
    },
    "sub-threshold": {
      name: "Net onder drempel",
      purpose: "Lactaatverwerking verbeteren net onder de tweede drempel.",
      intensity: "Gecontroleerd hard",
    },
    threshold: {
      name: "Zone 4 - Drempel",
      purpose:
        "Duurzame hoge aerobe output rond de tweede drempel ontwikkelen.",
      intensity: "Hard maar herhaalbaar",
    },
    "vo2-speed": {
      name: "Zone 5 - VO2max / snelheid",
      purpose:
        "Snelle intervallen boven LT2 voor zuurstofopname, wedstrijdsnelheid en loopeconomie.",
      intensity: "Zeer hard",
    },
    vo2max: {
      name: "VO2max",
      purpose: "Zuurstofopname prikkelen met snelheden boven drempel.",
      intensity: "Zeer harde intervallen",
    },
    speed: {
      name: "Anaeroob / snelheid",
      purpose: "Loopsnelheid, capaciteit en neuromusculaire snelheid trainen.",
      intensity: "Snel, veel herstel nodig",
    },
  },
  en: {},
};

export function localizeZone(
  zone: TrainingZone,
  language: Language,
): TrainingZone {
  if (language === "en") return zone;
  const localized = zoneCopy.nl[zone.id] ?? zoneCopy.nl[zone.shortName ?? ""];
  if (!localized) return zone;
  const zonePrefix = zone.name.match(/^Zone \d+/)?.[0];
  const name =
    localized.name.startsWith("Zone") || !zonePrefix
      ? localized.name
      : `${zonePrefix} - ${localized.name}`;
  return { ...zone, ...localized, name };
}

const targetCopy: Record<
  Language,
  Record<
    string,
    Pick<
      TargetPaceCategory,
      "name" | "purpose" | "recovery" | "repetitions" | "totalVolume"
    >
  >
> = {
  nl: {
    "easy-intervals": {
      name: "Rustige aerobe intervallen",
      purpose:
        "Rustige herhalingen voor ritme, techniek en aerobe controle onder de eerste drempel.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    extensive: {
      name: "Extensieve intervallen",
      purpose:
        "Groter aeroob intervalvolume tussen aerobe drempel en tweede drempel zonder lactaat te forceren.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    threshold: {
      name: "Drempelintervallen",
      purpose:
        "Cruise-intervallen rond LT2 met gecontroleerd lactaat, korte pauzes en duurzaam volume.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    vo2max: {
      name: "VO2max-intervallen",
      purpose:
        "Afstandsspecifieke herhalingen rond geschatte vVO2 met vermoeidheidscorrectie.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    "race-resistance": {
      name: "Wedstrijdspecifieke weerstand",
      purpose:
        "Snel gecontroleerd werk boven drempel voor snelheidsuithouding en lactaattolerantie.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    "anaerobic-capacity": {
      name: "Anaerobe capaciteit",
      purpose:
        "Korte lactaatrijke herhalingen met testsnelheid en snelheidsreserve, met veel herstel.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
    sprint: {
      name: "Sprint / neuromusculaire snelheid",
      purpose:
        "Zeer snel, laag volume voor techniek, stijfheid en rekrutering. Volledig herstel is belangrijker dan volume.",
      recovery: "Per afstand",
      repetitions: "Per afstand",
      totalVolume: "Per afstand",
    },
  },
  en: {},
};

export function localizeTarget(
  target: TargetPaceCategory,
  language: Language,
): TargetPaceCategory {
  if (language === "en") return target;
  const localized = targetCopy.nl[target.id];
  const times = target.times.map((time) => ({
    ...time,
    explanation: localizeTargetUse(
      target.id,
      time.distanceMeters,
      language,
      time.explanation,
    ),
  }));
  return localized ? { ...target, ...localized, times } : { ...target, times };
}
function localizeTargetUse(
  categoryId: string,
  distanceMeters: number,
  language: Language,
  fallback: string,
): string {
  if (language === "en") return fallback;
  if (categoryId === "sprint") {
    if (distanceMeters <= 80)
      return "Pure acceleratie en houding zonder grote lactaatbelasting.";
    if (distanceMeters <= 120)
      return "Snelle techniek, stijfheid en topsnelheidsprikkel met volledig herstel.";
    return "Snelheidsuithouding met laag volume en hoge kwaliteit.";
  }
  if (categoryId === "anaerobic-capacity") {
    if (distanceMeters <= 150)
      return "Snel ontspannen lopen dat lactaat verhoogt zonder lange technische afbraak.";
    if (distanceMeters <= 300)
      return "Belangrijkste afstand voor anaerobe capaciteit, tolerantie en herhaalbare snelheid.";
    return "Langere capaciteitsprikkel; spaarzaam gebruiken omdat vermoeidheid snel stijgt.";
  }
  if (categoryId === "race-resistance") {
    if (distanceMeters <= 300)
      return "Nuttig voor scherpte, eindsnelheid en tempowissels.";
    if (distanceMeters <= 500)
      return "Sterke snelheidsuithoudingsprikkel voor middenafstand en 5 km.";
    return "Zware weerstandsprikkel; best wanneer de loper snel werk goed verdraagt.";
  }
  if (categoryId === "vo2max") {
    if (distanceMeters <= 400)
      return "Verhoogt zuurstofopname met minder lokale spiervermoeidheid.";
    if (distanceMeters <= 800)
      return "Kernafstand voor VO2max: lang genoeg zonder overdreven verval.";
    return "Lange VO2max-herhaling; vermoeidheidscorrectie houdt ze realistisch.";
  }
  if (categoryId === "threshold") {
    if (distanceMeters <= 600)
      return "Korte cruise-herhaling voor ritme, controle en lage herstelkost.";
    if (distanceMeters <= 1200)
      return "Klassieke drempelafstand om gecontroleerd werk op te bouwen.";
    return "Lange drempelherhaling voor uithouding; tempo moet duurzaam blijven.";
  }
  if (categoryId === "extensive") {
    if (distanceMeters <= 400)
      return "Techniekvriendelijke aerobe herhaling met beperkte lactaatdruk.";
    if (distanceMeters <= 1000)
      return "Belangrijkste aerobe intervalafstand voor herhaalbaar ritme.";
    return "Lange aerobe interval voor uithouding zonder wedstrijdinspanning.";
  }
  if (distanceMeters <= 400)
    return "Laagdrempelig ritmewerk, drills en loopeconomie aan gecontroleerde snelheid.";
  if (distanceMeters <= 1000)
    return "Aerobe controle en ontspannen techniek over herhaalbare herhalingen.";
  return "Lange gecontroleerde aerobe herhaling voor tempodiscipline.";
}
