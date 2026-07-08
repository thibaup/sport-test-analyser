import type { TargetPaceCategory, TrainingZone, WarningItem, ZoneProfile } from '../types/lactate';

export type Language = 'nl' | 'en';

type CopyKey =
  | 'appTitle'
  | 'tagline'
  | 'language'
  | 'trainingProfile'
  | 'trainingProfileIntro'
  | 'trainingProfileBeginner'
  | 'trainingProfileIntermediate'
  | 'trainingProfileAdvanced'
  | 'pace'
  | 'distance'
  | 'export'
  | 'overview'
  | 'input'
  | 'charts'
  | 'zones'
  | 'targets'
  | 'race'
  | 'unnamedRunner'
  | 'testProfile'
  | 'athleteProtocol'
  | 'athlete'
  | 'testDate'
  | 'coach'
  | 'protocol'
  | 'notes'
  | 'runnerName'
  | 'coachOrLab'
  | 'protocolPlaceholder'
  | 'notesPlaceholder'
  | 'inputEyebrow'
  | 'inputTitle'
  | 'loadExample'
  | 'clear'
  | 'addStep'
  | 'step'
  | 'distanceCol'
  | 'speedCol'
  | 'paceCol'
  | 'durationCol'
  | 'lactateCol'
  | 'hrCol'
  | 'rpeCol'
  | 'noteCol'
  | 'optional'
  | 'emptySteps'
  | 'warnings'
  | 'moreWarnings'
  | 'summaryEyebrow'
  | 'summaryTitle'
  | 'aerobicSpeed'
  | 'aerobicHr'
  | 'anaerobicSpeed'
  | 'anaerobicHr'
  | 'maxSpeed'
  | 'maxHr'
  | 'maxLactate'
  | 'addValidData'
  | 'highestValidHr'
  | 'highestValidLactate'
  | 'chart'
  | 'lactateCurve'
  | 'heartRateResponse'
  | 'combinedChart'
  | 'emptyChart'
  | 'speedLabel'
  | 'heartRate'
  | 'hrPoints'
  | 'lactatePoints'
  | 'trainingZonesEyebrow'
  | 'trainingZonesTitle'
  | 'zonesNeedData'
  | 'speed'
  | 'heartRateLabel'
  | 'unavailable'
  | 'targetsEyebrow'
  | 'targetsTitle'
  | 'targetsNeedData'
  | 'speedRange'
  | 'paceRange'
  | 'targetSpeed'
  | 'targetPace'
  | 'recovery'
  | 'repetitions'
  | 'totalVolume'
  | 'fastEnd'
  | 'controlledEnd'
  | 'targetWindow'
  | 'usefulFor'
  | 'raceEstimates'
  | 'raceEstimateNote'
  | 'estimatedTime'
  | 'estimatedPace'
  | 'exportEyebrow'
  | 'exportTitle'
  | 'exportJson'
  | 'exportPdf'
  | 'exportCsv'
  | 'copySummary'
  | 'jsonExported'
  | 'pdfExported'
  | 'csvExported'
  | 'summaryCopied'
  | 'lactateAnalysis'
  | 'aerobicThreshold'
  | 'anaerobicThreshold'
  | 'generatedZones';

const copy: Record<Language, Record<CopyKey, string>> = {
  nl: {
    appTitle: 'Dashboard voor lactaattesten bij lopers',
    tagline: 'Eenvoudige invoer, automatische drempels, zones, richttijden en een proper rapport.',
    language: 'Taal',
    trainingProfile: 'Targetprofiel',
    trainingProfileIntro:
      'Dit past alleen de richttijden en volumes aan. Trainingszones blijven altijd automatisch berekend uit de testdata.',
    trainingProfileBeginner: 'Voorzichtigere targets en minder totaalvolume voor rustige opbouw.',
    trainingProfileIntermediate: 'Gebalanceerde standaardinstelling voor lopers die regelmatig trainen.',
    trainingProfileAdvanced: 'Iets scherpere targets en meer volume voor lopers die intensiteit goed verdragen.',
    pace: 'Tempo',
    distance: 'Afstand',
    export: 'Export',
    overview: 'Overzicht',
    input: 'Invoer',
    charts: 'Grafieken',
    zones: 'Zones',
    targets: 'Richttijden',
    race: 'Wedstrijd',
    unnamedRunner: 'Naamloze loper',
    testProfile: 'Testprofiel',
    athleteProtocol: 'Atleet en protocol',
    athlete: 'Atleet',
    testDate: 'Testdatum',
    coach: 'Coach',
    protocol: 'Protocol',
    notes: 'Notities',
    runnerName: 'Naam loper',
    coachOrLab: 'Coach of labo',
    protocolPlaceholder: 'Stapduur, ondergrond, toestel',
    notesPlaceholder: 'Omstandigheden, opwarming, schoenen, protocolopmerkingen',
    inputEyebrow: 'Invoer',
    inputTitle: 'Bewerkbare lactaattabel',
    loadExample: 'Voorbeeld laden',
    clear: 'Wissen',
    addStep: 'Stap toevoegen',
    step: '#',
    distanceCol: 'Afstand',
    speedCol: 'Snelheid',
    paceCol: 'Tempo',
    durationCol: 'Duur',
    lactateCol: 'Lactaat',
    hrCol: 'Hartslag',
    rpeCol: 'RPE',
    noteCol: 'Notitie',
    optional: 'Optioneel',
    emptySteps: 'Nog geen teststappen. Voeg een stap toe of laad de voorbeelddata.',
    warnings: 'Waarschuwingen',
    moreWarnings: 'meer waarschuwingen',
    summaryEyebrow: 'Berekend overzicht',
    summaryTitle: 'Drempels en testmaxima',
    aerobicSpeed: 'Aerobe drempel snelheid',
    aerobicHr: 'Aerobe drempel hartslag',
    anaerobicSpeed: 'Anaerobe drempel snelheid',
    anaerobicHr: 'Anaerobe drempel hartslag',
    maxSpeed: 'Hoogste testsnelheid',
    maxHr: 'Hoogste hartslag',
    maxLactate: 'Hoogste lactaat',
    addValidData: 'Voeg testdata toe',
    highestValidHr: 'Hoogste gemeten hartslagwaarde',
    highestValidLactate: 'Hoogste gemeten lactaatwaarde',
    chart: 'Grafiek',
    lactateCurve: 'Lactaatcurve',
    heartRateResponse: 'Hartslagrespons',
    combinedChart: 'Lactaat en hartslag gecombineerd',
    emptyChart: 'Voeg voldoende testdata toe om deze grafiek te tonen.',
    speedLabel: 'Snelheid',
    heartRate: 'Hartslag',
    hrPoints: 'Hartslagpunten',
    lactatePoints: 'Lactaatpunten',
    trainingZonesEyebrow: 'Trainingszones',
    trainingZonesTitle: 'Automatische snelheid-, tempo- en hartslagzones',
    zonesNeedData: 'Trainingszones hebben aerobe en anaerobe drempels nodig.',
    speed: 'Snelheid',
    heartRateLabel: 'Hartslag',
    unavailable: 'Niet beschikbaar',
    targetsEyebrow: 'Richttijden',
    targetsTitle: 'Berekende intervaltargets per afstand',
    targetsNeedData: 'Richttempo’s hebben duidelijke drempels en minstens vier testpunten nodig.',
    speedRange: 'Snelheidsrange',
    paceRange: 'Temporange',
    targetSpeed: 'Doelsnelheid',
    targetPace: 'Doeltempo',
    recovery: 'Herstel',
    repetitions: 'Herhalingen',
    totalVolume: 'Totaalvolume',
    fastEnd: 'Snel',
    controlledEnd: 'Gecontroleerd',
    targetWindow: 'Richtvenster',
    usefulFor: 'Nuttig voor',
    raceEstimates: 'Geschatte wedstrijdprestaties',
    raceEstimateNote: 'Aparte wedstrijdinschattingen uit de lactaattest. Geen garantie en vooral nuttig als realistische richtlijn.',
    estimatedTime: 'Geschatte tijd',
    estimatedPace: 'Geschat tempo',
    exportEyebrow: 'Export',
    exportTitle: 'Rapport en data exporteren',
    exportJson: 'JSON exporteren',
    exportPdf: 'PDF exporteren',
    exportCsv: 'CSV exporteren',
    copySummary: 'Samenvatting kopiëren',
    jsonExported: 'JSON geëxporteerd.',
    pdfExported: 'PDF geëxporteerd.',
    csvExported: 'CSV geëxporteerd.',
    summaryCopied: 'Samenvatting gekopieerd naar klembord.',
    lactateAnalysis: 'Lactaatanalyse',
    aerobicThreshold: 'Aerobe drempel',
    anaerobicThreshold: 'Anaerobe drempel',
    generatedZones: 'Gegenereerde zones',
  },
  en: {
    appTitle: 'Running lactate analysis dashboard',
    tagline: 'Simple input, automatic thresholds, zones, target times, and a clean report.',
    language: 'Language',
    trainingProfile: 'Target profile',
    trainingProfileIntro:
      'This only adjusts target times and total volume. Training zones are always calculated automatically from the test data.',
    trainingProfileBeginner: 'More cautious targets and lower total volume for gradual progression.',
    trainingProfileIntermediate: 'Balanced default setting for runners who train consistently.',
    trainingProfileAdvanced: 'Slightly sharper targets and more volume for runners who tolerate intensity well.',
    pace: 'Pace',
    distance: 'Distance',
    export: 'Export',
    overview: 'Overview',
    input: 'Input',
    charts: 'Charts',
    zones: 'Zones',
    targets: 'Targets',
    race: 'Race',
    unnamedRunner: 'Unnamed runner',
    testProfile: 'Test profile',
    athleteProtocol: 'Athlete and protocol',
    athlete: 'Athlete',
    testDate: 'Test date',
    coach: 'Coach',
    protocol: 'Protocol',
    notes: 'Notes',
    runnerName: 'Runner name',
    coachOrLab: 'Coach or lab',
    protocolPlaceholder: 'Step duration, surface, device',
    notesPlaceholder: 'Conditions, warm-up, footwear, protocol remarks',
    inputEyebrow: 'Input',
    inputTitle: 'Editable lactate test table',
    loadExample: 'Load example',
    clear: 'Clear',
    addStep: 'Add step',
    step: '#',
    distanceCol: 'Distance',
    speedCol: 'Speed',
    paceCol: 'Pace',
    durationCol: 'Duration',
    lactateCol: 'Lactate',
    hrCol: 'Heart rate',
    rpeCol: 'RPE',
    noteCol: 'Note',
    optional: 'Optional',
    emptySteps: 'No test steps yet. Add a step or load the example dataset.',
    warnings: 'Warnings',
    moreWarnings: 'more warnings',
    summaryEyebrow: 'Calculated summary',
    summaryTitle: 'Thresholds and test maxima',
    aerobicSpeed: 'Aerobic threshold speed',
    aerobicHr: 'Aerobic threshold HR',
    anaerobicSpeed: 'Anaerobic threshold speed',
    anaerobicHr: 'Anaerobic threshold HR',
    maxSpeed: 'Maximum tested speed',
    maxHr: 'Maximum HR',
    maxLactate: 'Maximum lactate',
    addValidData: 'Add test data',
    highestValidHr: 'Highest recorded heart rate',
    highestValidLactate: 'Highest recorded lactate value',
    chart: 'Chart',
    lactateCurve: 'Lactate curve',
    heartRateResponse: 'Heart-rate response',
    combinedChart: 'Combined lactate and HR',
    emptyChart: 'Add enough test data to render this chart.',
    speedLabel: 'Speed',
    heartRate: 'Heart rate',
    hrPoints: 'HR points',
    lactatePoints: 'Lactate points',
    trainingZonesEyebrow: 'Training zones',
    trainingZonesTitle: 'Automatic speed, pace, and HR ranges',
    zonesNeedData: 'Training zones need aerobic and anaerobic threshold estimates.',
    speed: 'Speed',
    heartRateLabel: 'Heart rate',
    unavailable: 'Unavailable',
    targetsEyebrow: 'Target times',
    targetsTitle: 'Calculated interval targets by distance',
    targetsNeedData: 'Target times need clear threshold estimates and at least four test points.',
    speedRange: 'Speed range',
    paceRange: 'Pace range',
    targetSpeed: 'Target speed',
    targetPace: 'Target pace',
    recovery: 'Recovery',
    repetitions: 'Repetitions',
    totalVolume: 'Total volume',
    fastEnd: 'Fast',
    controlledEnd: 'Controlled',
    targetWindow: 'Target window',
    usefulFor: 'Useful for',
    raceEstimates: 'Estimated race performances',
    raceEstimateNote: 'Separate race estimates from the lactate test. Not guaranteed, mainly useful as realistic guidance.',
    estimatedTime: 'Estimated time',
    estimatedPace: 'Estimated pace',
    exportEyebrow: 'Export',
    exportTitle: 'Export report and data',
    exportJson: 'Export JSON',
    exportPdf: 'Export PDF',
    exportCsv: 'Export CSV',
    copySummary: 'Copy summary',
    jsonExported: 'JSON exported.',
    pdfExported: 'PDF exported.',
    csvExported: 'CSV exported.',
    summaryCopied: 'Summary copied to clipboard.',
    lactateAnalysis: 'Lactate analysis',
    aerobicThreshold: 'Aerobic threshold',
    anaerobicThreshold: 'Anaerobic threshold',
    generatedZones: 'Generated zones',
  },
};

export function t(language: Language, key: CopyKey): string {
  return copy[language][key];
}

export function profileLabel(profile: ZoneProfile, language: Language): string {
  const labels: Record<Language, Record<ZoneProfile, string>> = {
    nl: {
      beginner: 'Beginner',
      intermediate: 'Gemiddeld',
      advanced: 'Gevorderd',
    },
    en: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },
  };
  return labels[language][profile];
}

const zoneCopy: Record<Language, Record<string, Pick<TrainingZone, 'name' | 'purpose' | 'intensity'>>> = {
  nl: {
    recovery: {
      name: 'Herstel',
      purpose: 'Lage mechanische en metabole belasting voor herstel en opwarming.',
      intensity: 'Zeer rustig',
    },
    easy: {
      name: 'Rustig aeroob',
      purpose: 'Duurvolume opbouwen terwijl lactaat onder controle blijft.',
      intensity: 'Rustig praten mogelijk',
    },
    steady: {
      name: 'Steady aeroob',
      purpose: 'Aeroob uithoudingsvermogen dicht bij de eerste lactaatknik.',
      intensity: 'Comfortabel stevig',
    },
    tempo: {
      name: 'Tempo',
      purpose: 'Aerobe druk verhogen zonder constant op drempel te lopen.',
      intensity: 'Matig tot stevig',
    },
    'sub-threshold': {
      name: 'Net onder drempel',
      purpose: 'Lactaatverwerking verbeteren net onder de tweede drempel.',
      intensity: 'Gecontroleerd hard',
    },
    threshold: {
      name: 'Drempel',
      purpose: 'Duurzame hoge aerobe output rond de tweede drempel ontwikkelen.',
      intensity: 'Hard maar herhaalbaar',
    },
    vo2max: {
      name: 'VO2max',
      purpose: 'Zuurstofopname prikkelen met snelheden boven drempel.',
      intensity: 'Zeer harde intervallen',
    },
    speed: {
      name: 'Anaeroob / snelheid',
      purpose: 'Loopsnelheid, capaciteit en neuromusculaire snelheid trainen.',
      intensity: 'Snel, veel herstel nodig',
    },
  },
  en: {},
};

export function localizeZone(zone: TrainingZone, language: Language): TrainingZone {
  if (language === 'en') return zone;
  const localized = zoneCopy.nl[zone.id];
  return localized ? { ...zone, ...localized } : zone;
}

const targetCopy: Record<Language, Record<string, Pick<TargetPaceCategory, 'name' | 'purpose' | 'recovery' | 'repetitions' | 'totalVolume'>>> = {
  nl: {
    'easy-intervals': {
      name: 'Rustige aerobe intervallen',
      purpose: 'Rustige herhalingen voor ritme, techniek en aerobe controle onder de eerste drempel.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    extensive: {
      name: 'Extensieve intervallen',
      purpose: 'Groter aeroob intervalvolume tussen aerobe drempel en tweede drempel zonder lactaat te forceren.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    threshold: {
      name: 'Drempelintervallen',
      purpose: 'Cruise-intervallen rond LT2 met gecontroleerd lactaat, korte pauzes en duurzaam volume.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    vo2max: {
      name: 'VO2max-intervallen',
      purpose: 'Afstandsspecifieke herhalingen rond geschatte vVO2 met vermoeidheidscorrectie.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    'race-resistance': {
      name: 'Wedstrijdspecifieke weerstand',
      purpose: 'Snel gecontroleerd werk boven drempel voor snelheidsuithouding en lactaattolerantie.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    'anaerobic-capacity': {
      name: 'Anaerobe capaciteit',
      purpose: 'Korte lactaatrijke herhalingen met testsnelheid en snelheidsreserve, met veel herstel.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
    sprint: {
      name: 'Sprint / neuromusculaire snelheid',
      purpose: 'Zeer snel, laag volume voor techniek, stijfheid en rekrutering. Volledig herstel is belangrijker dan volume.',
      recovery: 'Per afstand',
      repetitions: 'Per afstand',
      totalVolume: 'Per afstand',
    },
  },
  en: {},
};

export function localizeTarget(target: TargetPaceCategory, language: Language): TargetPaceCategory {
  if (language === 'en') return target;
  const localized = targetCopy.nl[target.id];
  const times = target.times.map((time) => ({
    ...time,
    explanation: localizeTargetUse(target.id, time.distanceMeters, language, time.explanation),
  }));
  return localized ? { ...target, ...localized, times } : { ...target, times };
}

export function localizeWarning(warning: WarningItem, language: Language, stepNumber?: number): string {
  if (language === 'en') return warning.message;
  const stepText = stepNumber ? `Stap ${stepNumber}` : 'Een stap';
  if (warning.id.startsWith('excluded-')) return `${stepText} is overgeslagen in de berekeningen.`;
  if (warning.id.startsWith('missing-load-')) return `${stepText} mist afstand, snelheid of tempo.`;
  if (warning.id.startsWith('missing-lactate-')) return `${stepText} heeft geen lactaatwaarde en ondersteunt geen drempelberekening.`;
  if (warning.id.startsWith('missing-hr-')) return `${stepText} heeft geen hartslagwaarde. Hartslagzones kunnen daardoor onvolledig zijn.`;
  if (warning.id.startsWith('speed-order-')) return `${stepText} verhoogt de snelheid niet ten opzichte van de vorige stap.`;
  if (warning.id.startsWith('lactate-jump-')) return `${stepText} heeft een opvallend scherpe lactaatstijging.`;
  if (warning.id.startsWith('curve-residual-')) return `${stepText} past niet goed bij de omliggende lactaatwaarden.`;
  if (warning.id.startsWith('hr-drop-')) return `De hartslag daalt terwijl de snelheid stijgt bij ${stepText.toLowerCase()}.`;
  if (warning.id.startsWith('hr-jump-')) return `De hartslag stijgt zeer snel bij ${stepText.toLowerCase()}.`;
  if (warning.id.startsWith('hr-high-')) return `${stepText} bevat een zeer hoge hartslagwaarde. Controleer de max-HR context.`;
  return warning.message;
}

export function localizeZoneWarning(warning: string | undefined, language: Language): string | undefined {
  if (!warning || language === 'en') return warning;
  if (warning.includes('Add more HR data') || warning.includes('Not enough HR points')) {
    return 'Voeg meer hartslagdata toe voor deze zone.';
  }
  if (warning.includes('Heart-rate range') || warning.includes('Heart-rate fit')) return 'Hartslagbereik is niet beschikbaar.';
  if (warning.includes('tested speeds') || warning.includes('extrapolation')) return 'Hartslagbereik valt buiten de gemeten snelheden.';
  return warning;
}

export function localizeTargetWarning(warning: string | undefined, language: Language): string | undefined {
  if (!warning || language === 'en') return warning;
  if (warning.includes('need caution') || warning.includes('extrapolated')) {
    return 'Snelle targets vragen voorzichtigheid omdat de test mogelijk niet tot een duidelijk hoog lactaateindpunt ging.';
  }
  return warning;
}

function localizeTargetUse(categoryId: string, distanceMeters: number, language: Language, fallback: string): string {
  if (language === 'en') return fallback;
  if (categoryId === 'sprint') {
    if (distanceMeters <= 80) return 'Pure acceleratie en houding zonder grote lactaatbelasting.';
    if (distanceMeters <= 120) return 'Snelle techniek, stijfheid en topsnelheidsprikkel met volledig herstel.';
    return 'Snelheidsuithouding met laag volume en hoge kwaliteit.';
  }
  if (categoryId === 'anaerobic-capacity') {
    if (distanceMeters <= 150) return 'Snel ontspannen lopen dat lactaat verhoogt zonder lange technische afbraak.';
    if (distanceMeters <= 300) return 'Belangrijkste afstand voor anaerobe capaciteit, tolerantie en herhaalbare snelheid.';
    return 'Langere capaciteitsprikkel; spaarzaam gebruiken omdat vermoeidheid snel stijgt.';
  }
  if (categoryId === 'race-resistance') {
    if (distanceMeters <= 300) return 'Nuttig voor scherpte, eindsnelheid en tempowissels.';
    if (distanceMeters <= 500) return 'Sterke snelheidsuithoudingsprikkel voor middenafstand en 5 km.';
    return 'Zware weerstandsprikkel; best wanneer de loper snel werk goed verdraagt.';
  }
  if (categoryId === 'vo2max') {
    if (distanceMeters <= 400) return 'Verhoogt zuurstofopname met minder lokale spiervermoeidheid.';
    if (distanceMeters <= 800) return 'Kernafstand voor VO2max: lang genoeg zonder overdreven verval.';
    return 'Lange VO2max-herhaling; vermoeidheidscorrectie houdt ze realistisch.';
  }
  if (categoryId === 'threshold') {
    if (distanceMeters <= 600) return 'Korte cruise-herhaling voor ritme, controle en lage herstelkost.';
    if (distanceMeters <= 1200) return 'Klassieke drempelafstand om gecontroleerd werk op te bouwen.';
    return 'Lange drempelherhaling voor uithouding; tempo moet duurzaam blijven.';
  }
  if (categoryId === 'extensive') {
    if (distanceMeters <= 400) return 'Techniekvriendelijke aerobe herhaling met beperkte lactaatdruk.';
    if (distanceMeters <= 1000) return 'Belangrijkste aerobe intervalafstand voor herhaalbaar ritme.';
    return 'Lange aerobe interval voor uithouding zonder wedstrijdinspanning.';
  }
  if (distanceMeters <= 400) return 'Laagdrempelig ritmewerk, drills en loopeconomie aan gecontroleerde snelheid.';
  if (distanceMeters <= 1000) return 'Aerobe controle en ontspannen techniek over herhaalbare herhalingen.';
  return 'Lange gecontroleerde aerobe herhaling voor tempodiscipline.';
}
