/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'ar';

export interface TranslationDict {
  appName: string;
  appSubtitle: string;
  satelliteDownlink: string;
  aligned: string;
  bedrockCog: string;
  connected: string;
  pixelSize: string;
  datum: string;
  error: string;
  targetSectors: string;
  sensorPivot: string;
  latitude: string;
  longitude: string;
  lockCoordinates: string;
  scanningParams: string;
  spatialWidth: string;
  minDepression: string;
  executeScan: string;
  sensingBedrock: string;
  initialisingPalsar: string;
  tpiMatrix: string;
  absoluteDem: string;
  declassifiedCorona: string;
  chronoTimeline: string;
  reconstruction: string;
  reconEarly: string;
  reconLate: string;
  timelineInfo1: string;
  timelineInfo2: string;
  timelineInfo3: string;
  timelineInfo4: string;
  colorIndicators: string;
  sandyDune: string;
  erodedSteppe: string;
  caravanTrail: string;
  anomalousCavern: string;
  highElevation: string;
  midElevation: string;
  lowElevation: string;
  gprRadarProfile: string;
  gprCeiling: string;
  gprFloor: string;
  gprFrequency: string;
  gprInfo: string;
  historicalMissionYear: string;
  missionEra: string;
  era1960: string;
  era1970: string;
  era1980: string;
  contrastMatch: string;
  contrastDesc: string;
  candidateList: string;
  intensity: string;
  confidence: string;
  depth: string;
  diameter: string;
  meters: string;
  coordinateDelta: string;
  activeAnomalyStats: string;
  geoContext: string;
  type: string;
  triggerAiReport: string;
  aiAnalyzing: string;
  aiReportAvailable: string;
  exportGeoJson: string;
  exportPdf: string;
  exportSuccess: string;
  whatIsTpiTitle: string;
  whatIsTpiDesc: string;
  palmyraName: string;
  palmyraDesc: string;
  abdulazizName: string;
  abdulazizDesc: string;
  rasAlAynName: string;
  rasAlAynDesc: string;
  alsafaName: string;
  alsafaDesc: string;
  aleppoName: string;
  aleppoDesc: string;
  zawiyaName: string;
  zawiyaDesc: string;
  terminalHeader: string;
  terminalScanning: string;
  aiDossierHeader: string;
  aiDossierClassification: string;
  aiAdvisory: string;
  geoProbability: string;
  archaeologicalRelevance: string;
  coronaOverlays: string;
  surveyInstructions: string;
  executiveSummary: string;
  emptyReportHeader: string;
  emptyReportDesc: string;
  themeDark: string;
  themeLight: string;
  dimensionsHeader: string;
  advisoryTitle: string;
  advisoryDesc: string;
  unHeritageAdvisory: string;
  detectedAnomalies: string;
  spatialVolume: string;
  surfaceArea: string;
  modeledDepth: string;
  lithology: string;
  expertAssessment: string;
  elevationProfile: string;
  exportSurvey: string;
  filterByTypeLabel: string;
  allTypesOption: string;
  typeKarsticSinkhole: string;
  typeHypogeumTomb: string;
  typeCollapseLavaTube: string;
  typeSubterraneanCistern: string;
  highResolutionMapOption: string;
  mapLegendTitle: string;
  mapLegendSelected: string;
  mapLegendScanBoundary: string;
  mapLegendCenterFocus: string;
  findNearestBtn: string;
  findNearestSuccess: string;
  autoCyclePlay: string;
  autoCyclePause: string;
  exportAllDetails: string;
  exportJson: string;
  nearestDistLabel: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    appName: 'GEO_Anas_ABdullsalam',
    appSubtitle: 'TPI Subsurface Anomaly Detection Scanner',
    satelliteDownlink: 'SATELLITE DOWNLINK',
    aligned: 'ALIGNED [KH-4B]',
    bedrockCog: 'BEDROCK COG',
    connected: 'CONNECTED',
    pixelSize: 'PIXEL SIZE: 12.5M',
    datum: 'DATUM: WGS84',
    error: 'ERROR',
    targetSectors: 'Target Syrian Sectors',
    sensorPivot: 'Exact Sensor Grid Pivot',
    latitude: 'Latitude (N)',
    longitude: 'Longitude (E)',
    lockCoordinates: 'Lock Grid Coordinates',
    scanningParams: 'Scanning Parameters',
    spatialWidth: 'Spatial Window Width',
    minDepression: 'Min Depression Limit',
    executeScan: 'Execute Subsurface Scan',
    sensingBedrock: 'Sensing Bedrock...',
    initialisingPalsar: 'Initialising ALOS PALSAR high-res elevation vectors...',
    tpiMatrix: 'TPI Deviation Matrix',
    absoluteDem: 'Absolute DEM Contour',
    declassifiedCorona: 'Declassified CORONA',
    chronoTimeline: 'CORONA Chrono-Scan Timeline',
    reconstruction: 'Reconstruction',
    reconEarly: '1960s (Early Recon)',
    reconLate: '1970s (Late Recon)',
    timelineInfo1: '🛰️ KH-4 Spy Launch: Early stereoscopic reconnaissance. Wind sand drifts.',
    timelineInfo2: '🛰️ KH-4B Orbit Peak: Maximum photogrammetric film contrast.',
    timelineInfo3: '🛰️ Program Sunset: Secondary structural pit collars expanding.',
    timelineInfo4: '🛰️ Hexagon Transition: Heavy dunes. Agricultural tilling tracks visible.',
    colorIndicators: 'Color Indicators',
    sandyDune: 'Sandy Dune / Heights',
    erodedSteppe: 'Eroded Steppe Ground',
    caravanTrail: 'Diagonal Caravan Trail',
    anomalousCavern: 'Anomalous Cavern Pits (< -2.5m)',
    highElevation: 'High Uplands Elevation',
    midElevation: 'Scree & Slopes Transition',
    lowElevation: 'Low Wadis Bedrock Elevation',
    gprRadarProfile: 'Simulated GPR Radar Profile',
    gprCeiling: 'Ceiling',
    gprFloor: 'Floor',
    gprFrequency: '250 MHz RF',
    gprInfo: 'Radar propagation paths mapped downward. Hyperbola curves indicate top contact echoes of subsurface voids.',
    historicalMissionYear: 'Historical Mission Year',
    missionEra: 'Historical Mission Year',
    era1960: '1960 Era',
    era1970: '1970 Era',
    era1980: '1980 Era',
    contrastMatch: 'Photo Contrast Match',
    contrastDesc: 'Scrub the timeline slider to monitor active sand dunes shifting, subterranean cavern weathered expansions, and modern human pathways emerging under KH-4 spy telescopes between the 1960s and 1970s.',
    candidateList: 'Identified Anomaly Candidates',
    intensity: 'TPI Intensity',
    confidence: 'Sensing Conf.',
    depth: 'Est. Depth',
    diameter: 'Est. Diameter',
    meters: 'm',
    coordinateDelta: 'Coord Delta',
    activeAnomalyStats: 'Active Anomaly Profile',
    geoContext: 'Local Geologic Setting',
    type: 'Subsurface Morphology Class',
    triggerAiReport: 'Downlink AI Specialty Intel Dossier',
    aiAnalyzing: 'Querying Specialty Models...',
    aiReportAvailable: 'AI Geospatial Report Cached',
    exportGeoJson: 'Export GIS GeoJSON',
    exportPdf: 'Export Field Walking Sheet',
    exportSuccess: 'Dossier GeoJSON payload generated to clipboard!',
    whatIsTpiTitle: 'Topographic Position Index (TPI)',
    whatIsTpiDesc: 'Calculated as the difference between cell elevation and the average of surrounding cells (Gaussian Sigma block). Large negative spikes (e.g. TPI < -2.5m) detect sunken chambers, karst collapse dolines, or escape shafts obscured by dunes or scree.',
    palmyraName: 'Palmyra Valley of Tombs',
    palmyraDesc: 'Hellenistic and Roman funerary hypogea caverns carved in limestone slopes.',
    abdulazizName: 'Mount Abdulaziz Karstic Ridge',
    abdulazizDesc: 'Highly fractured limestone anticline featuring deep collapse dolines and faults.',
    rasAlAynName: 'Ras al-Ayn Hydro-Karstic Basin',
    rasAlAynDesc: 'Active sinkholes and subterranean cavities from dissolution of thick gypsum.',
    alsafaName: 'Al-Safa Volcanic Fields',
    alsafaDesc: 'Quaternary alkali-basalt protective shelters, gas chambers, and ancient lava tubes.',
    aleppoName: 'Aleppo Citadel Bedrock System',
    aleppoDesc: 'Bronze age to Mamluk tunnels, cistern vaults, and foundation silos.',
    zawiyaName: 'Jabal Al-Zawiya Necropolis',
    zawiyaDesc: 'Dense archaeological funerary chambers and Roman cistern installations.',
    terminalHeader: 'TERMINAL CONSOLE',
    terminalScanning: 'STATUS: INTEL_SCANNING',
    aiDossierHeader: 'GEO-ARCHAEOLOGICAL ANALYSIS DOSSIER',
    aiDossierClassification: 'CLASSIFICATION: DECLASSIFIED INTEL / @GOOGLE-GENAI REPORT',
    aiAdvisory: 'UN Human Rights & Heritage Advisory',
    geoProbability: 'Geological Probability',
    archaeologicalRelevance: 'Archaeological Relevance',
    coronaOverlays: 'CORONA Spy Satellite Overlays',
    surveyInstructions: 'Survey Field Instructions',
    executiveSummary: 'Executive Site Summary',
    emptyReportHeader: 'UNESCO / UNESCO-aligned Spacecraft Intel Report',
    emptyReportDesc: 'Select an anomaly target on the map grid from the candidate list, then trigger the specialist report to initiate geological synthesis and CORONA spy-satellite correlation.',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    dimensionsHeader: 'Aperture Dimensions',
    advisoryTitle: 'UNESCO / UNESCO-aligned Spacecraft Intel Report',
    advisoryDesc: 'Select an anomaly target on the map grid from the candidate list, then trigger the specialist report to initiate geological synthesis and CORONA spy-satellite correlation.',
    unHeritageAdvisory: 'UN Human Rights & Heritage Advisory',
    detectedAnomalies: 'Detected Anomalies',
    spatialVolume: 'Spatial Cavity Volume',
    surfaceArea: 'Estimated Surface Area',
    modeledDepth: 'Estimated Ceiling Depth',
    lithology: 'Inferred Bedrock Lithology',
    expertAssessment: 'Request Expert Geological Assessment',
    elevationProfile: 'Topographic Position/Elevation Profile',
    exportSurvey: 'Export Site Survey Vector Data',
    filterByTypeLabel: 'Filter by Type',
    allTypesOption: 'All Anomalies',
    typeKarsticSinkhole: 'Karstic Sinkholes',
    typeHypogeumTomb: 'Hypogeum Tombs',
    typeCollapseLavaTube: 'Collapse Lava Tubes',
    typeSubterraneanCistern: 'Subterranean Cisterns',
    highResolutionMapOption: 'High-Res Satellite Map',
    mapLegendTitle: 'Anomaly Map Legend',
    mapLegendSelected: 'Selected Target Anomaly',
    mapLegendScanBoundary: '500m Survey Horizon',
    mapLegendCenterFocus: 'Downlink Focus Center',
    findNearestBtn: 'Find Nearest Target',
    findNearestSuccess: 'Centered on nearest anomaly target',
    autoCyclePlay: 'Auto-Cycle Anomaly Tour',
    autoCyclePause: 'Pause Anomaly Tour',
    exportAllDetails: 'Export Complete PDF / Site Print Out',
    exportJson: 'Download GeoJSON / Data Package',
    nearestDistLabel: 'Distance to Sector Reference Focus:',
  },
  ar: {
    appName: 'GEO_Anas_ABdullsalam',
    appSubtitle: 'ماسح كشف الفجوات تحت السطحية (TPI)',
    satelliteDownlink: 'ارتباط القمر الصناعي الهابط',
    aligned: 'اتصال محاذي [KH-4B]',
    bedrockCog: 'نظام الأساس المحوري',
    connected: 'متصل بنجاح',
    pixelSize: 'دقة الصورة: 12.5 م',
    datum: 'المرجع الجيوديسي: WGS84',
    error: 'خطأ في النظام',
    targetSectors: 'القطاعات السورية المستهدفة',
    sensorPivot: 'إحداثيات شبكة الاستشعار الدقيقة',
    latitude: 'عرض جغرافي (شمالاً)',
    longitude: 'طول جغرافي (شرقاً)',
    lockCoordinates: 'تأمين إحداثيات الشبكة',
    scanningParams: 'معلمات تحديد المسح',
    spatialWidth: 'اتساع النافذة المكانية',
    minDepression: 'الحد الأدنى للانخفاض الطبوغرافي',
    executeScan: 'بدء مسح طبقات الأرض',
    sensingBedrock: 'جاري استشعار الصخور الأساسية...',
    initialisingPalsar: 'تأكيد البيانات وتنزيل معلومات الارتفاع ALOS PALSAR...',
    tpiMatrix: 'مصفوفة انحراف TPI للسطح',
    absoluteDem: 'الكنتور المطلق لنموذج الارتفاع',
    declassifiedCorona: 'أرشيف كورونا السري الملغى',
    chronoTimeline: 'شريط كورونا الزمني للتجسس',
    reconstruction: 'إعادة بناء المسار',
    reconEarly: 'الستينيات (مسح أولي)',
    reconLate: 'السبعينيات (مسح متأخر)',
    timelineInfo1: '🛰️ إطلاق تجسس KH-4: استطلاع مجسم مبكر. رصد حركة الكثبان الرملية الكثيفة.',
    timelineInfo2: '🛰️ ذروة مدار KH-4B: تباين فوتوغرافي فائق الدقة بالتصوير الكوروني الموجه.',
    timelineInfo3: '🛰️ نهاية البرنامج: تمديد وتآكل فوهات الانهيار الهيكلي للكهوف السفلية.',
    timelineInfo4: '🛰️ تحول الهكسان: كثبان رملية كثيفة بفعل الرياح. ظهور مسارات حراثة زراعية.',
    colorIndicators: 'مؤشرات الألوان والبيانات',
    sandyDune: 'كثبان رملية / مرتفعات طبوغرافية',
    erodedSteppe: 'أراضي السهوب المتآكلة',
    caravanTrail: 'مسارات القوافل الأثرية المائلة',
    anomalousCavern: 'فجوات وشذوذ كهفي حاد (< -2.5م)',
    highElevation: 'أراضي المرتفعات الجبلية العالية',
    midElevation: 'منحدرات التآكل والركام الصخري',
    lowElevation: 'أودية منخفضة والصخور الرسوبية',
    gprRadarProfile: 'مقطع الرادار الأرضي المخترق (GPR)',
    gprCeiling: 'سقف الكهف المتوقع',
    gprFloor: 'أرضية تجويف الكهف',
    gprFrequency: 'تردد راداري 250 ميجاهرتز',
    gprInfo: 'مسارات انتشار انعكاس الرادار لأسفل الأرض. الأقواس القطعية تمثل الملامسات الفراغية العليا.',
    historicalMissionYear: 'تاريخ المهمة الاستطلاعية',
    missionEra: 'تاريخ المهمة الاستطلاعية',
    era1960: 'عهد الستينيات',
    era1970: 'عهد السبعينيات',
    era1980: 'عهد الثمانينيات',
    contrastMatch: 'تطابق تباين الصور الفوتوغرافية',
    contrastDesc: 'اسحب شريط التمرير الزمني لمراقبة الكثبان الرملية النشطة التي تزيحها الرياح، والتوسعات الطبيعية لفوهات الكهوف وهياكل التمدد الطبوغرافي تحت تلسكوبات KH-4 للتجسس.',
    candidateList: 'العينات والكهوف المكتشفة',
    intensity: 'شدة انحراف TPI',
    confidence: 'دقة الاستشعار',
    depth: 'العمق التقريبي',
    diameter: 'القطر الأفقي',
    meters: 'متر',
    coordinateDelta: 'تغير الإحداثيات',
    activeAnomalyStats: 'تفاصيل العينة الطبوغرافية النشطة',
    geoContext: 'السياق الجيولوجي المحلي للطبقات',
    type: 'تصنيف الهيكل وتحت السطح',
    triggerAiReport: 'توليد ملف الذكاء الاصطناعي الاستكشافي',
    aiAnalyzing: 'يقوم الذكاء الاصطناعي بتحليل الارتفاعات والموقع الاصطلاحي...',
    aiReportAvailable: 'تم حفظ تقرير الذكاء الاصطناعي للقطاع',
    exportGeoJson: 'تصدير ملف الخرائط GIS GeoJSON',
    exportPdf: 'تصدير وثيقة المسح الميدانية',
    exportSuccess: 'تم توليد تصدير كتل البيانات وحفظها بنجاح في الحافظة!',
    whatIsTpiTitle: 'مؤشر الموضع الطبوغرافي (TPI)',
    whatIsTpiDesc: 'يتم حسابه كفرق بين ارتفاع نقطة معينة ومتوسط الارتفاع للمساحة المحيطة بها. القيم السالبة الحادة (TPI < -2.5م) تحدد التجاويف العميقة، بالوعات الانهيار الكارستية، والأنفاق التاريخية التي تغطيها الكثبان الرملية.',
    palmyraName: 'تدمر - وادي القبور الأثري',
    palmyraDesc: 'مدافن وتجاويف جنائزية هيلينستية ورومانية محفورة في منحدرات صخرية جيرية.',
    abdulazizName: 'سلسلة جبل عبدالعزيز الكارستية',
    abdulazizDesc: 'جسم محدب للجرانيت الكلسي المنكسر يضم بالوعات انخساف طبيعية وتصدعات هيكلية عميقة.',
    rasAlAynName: 'حوض كارسيت مائي برأس العين',
    rasAlAynDesc: 'تجاويف وبالوعات عميقة تحت الأرض تشكلت بفعل ذوبان الصخور الجبسية السميكة بواسطة المياه الجوفية.',
    alsafaName: 'حقول الصفا الطفيلية البركانية',
    alsafaDesc: 'غرف غاز طبيعية ملتوية ولابات بركانية من العصر الرباعي بازلتية صلدة حمت البشر قديماً.',
    aleppoName: 'خزان قلعة حلب والصخر الأساسي',
    aleppoDesc: 'أنفاق دفاعية تمتد من العصر البرونزي للمملوكي وصوامع الحبوب والماء المنحوتة قديماً.',
    zawiyaName: 'أضرحة ومدافن جبل الزاوية',
    zawiyaDesc: 'غرف جنائزية رومانية وخزانات مياه جيرية تحت سطح الأرض فائقة التداخل الجيولوجي.',
    terminalHeader: 'شاشة التحكم والعملية الفنية',
    terminalScanning: 'الحالة: استقصاء الاستشعار النشط',
    aiDossierHeader: 'ملف التحليل الجيو-أثري الفائق',
    aiDossierClassification: 'التصنيف: وثيقة سرية ملغى حظرها / تقرير الذكاء الاصطناعي الجغرافي',
    aiAdvisory: 'استشاري حقوق الإنسان والتراث العالمي للأمم المتحدة',
    geoProbability: 'الاحتمالية الجيولوجية للهيكل',
    archaeologicalRelevance: 'العلاقة الجيولوجية للتراث والأثر',
    coronaOverlays: 'تراكب صور التجسس لقمر كورونا',
    surveyInstructions: 'تعليمات المسح الميدانية الموجهة',
    executiveSummary: 'الخلاصة التنفيذية المستهدفة للقطاع',
    emptyReportHeader: 'تقرير المسبار الفضائي والذكاء الاصطناعي لليونسكو',
    emptyReportDesc: 'حدد عينة من قائمة الكهوف المكتشفة في الشبكة ثم اضغط على زر توليد التقرير لتفعيل نموذج الترابط الجيو-أثري لصور كورونا الفضائية وتوليد البيانات الاستخباراتية.',
    themeDark: 'الوضع الداكن',
    themeLight: 'الوضع المضيء',
    dimensionsHeader: 'أبعاد الفتحة السطحية',
    advisoryTitle: 'تقرير المسبار الفضائي والذكاء الاصطناعي لليونسكو',
    advisoryDesc: 'حدد عينة من قائمة الكهوف المكتشفة في الشبكة ثم اضغط على زر توليد التقرير لتفعيل نموذج الترابط الجيو-أثري لصور كورونا الفضائية وتوليد البيانات الاستخباراتية.',
    unHeritageAdvisory: 'استشاري حقوق الإنسان والتراث العالمي للأمم المتحدة',
    detectedAnomalies: 'العيينات والشذوذات المكتشفة',
    spatialVolume: 'حجم الفراغ الجوفي المقدر',
    surfaceArea: 'مساحة السطح المقدرة',
    modeledDepth: 'العمق المقدر للسقف',
    lithology: 'نوع الصخور الأساسية تحت السطحية',
    expertAssessment: 'طلب تقرير جيولوجي استكشافي فوري',
    elevationProfile: 'مقطع الارتفاع والانحراف الطبوغرافي',
    exportSurvey: 'تصدير بيانات المسح الجغرافي بالكامل',
    filterByTypeLabel: 'تصفية حسب النوع',
    allTypesOption: 'جميع الشذوذات',
    typeKarsticSinkhole: 'البالوعات الكارستية',
    typeHypogeumTomb: 'المدافن الجنائزية',
    typeCollapseLavaTube: 'القنوات البركانية المنهارة',
    typeSubterraneanCistern: 'خزانات المياه الجوفية',
    highResolutionMapOption: 'خرائط أقمار صناعية عالية الدقة',
    mapLegendTitle: 'دليل الخريطة للشذوذات',
    mapLegendSelected: 'الشذوذ المحدد المستهدف',
    mapLegendScanBoundary: 'أفق المسح بنطاق ٥٠٠م',
    mapLegendCenterFocus: 'بؤرة التركيز لمستقبل محطة الفضاء',
    findNearestBtn: 'البحث عن أقرب شذوذ',
    findNearestSuccess: 'تم التوسيط والتكبير بنجاح على أقرب شذوذ جغرافي مكتشف في القطاع اليوم',
    autoCyclePlay: 'تشغيل الجولة الاستكشافية التلقائية',
    autoCyclePause: 'إيقاف الجولة الاستكشافية التلقائية مؤقتاً',
    exportAllDetails: 'تصدير وطباعة ملف الموقع بالكامل (PDF / طباعة مخصصة)',
    exportJson: 'تحميل حزمة البيانات الإحصائية الجغرافية (JSON/GeoJSON)',
    nearestDistLabel: 'المسافة إلى بؤرة الاتصال المرجعية للقمر الصناعي:',
  },
};
