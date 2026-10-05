export type StreamFormat = 'aac' | 'hls' | 'mp3';

export interface RadioStation {
  id: string;
  name: string;
  broadcaster: string;
  streamUrl: string;
  format: StreamFormat;
  sourceHomepage: string | null;
  sourceAttribution: string;
  verifiedAt: string;
  verificationNote: string;
}

export interface RadioChannel {
  id: string;
  languageIdentifier: string;
  languageName: string;
  nativeName: string;
  regionLabel: string;
  displayName: string;
  primaryStation: RadioStation;
  fallbackStations: RadioStation[];
}

const VERIFIED_ON = '2026-10-04';
const AKASHVANI_HOME = 'https://akashvani.gov.in/radio/live.php';
const currentSiteAttribution =
  'Listed in the live Timeless Frequencies station catalogue; no broadcaster homepage was supplied.';

function station(
  id: string,
  name: string,
  broadcaster: string,
  streamUrl: string,
  format: StreamFormat,
  sourceHomepage: string | null,
  sourceAttribution: string,
): RadioStation {
  return {
    id,
    name,
    broadcaster,
    streamUrl,
    format,
    sourceHomepage,
    sourceAttribution,
    verifiedAt: VERIFIED_ON,
    verificationNote:
      format === 'hls'
        ? 'HTTPS playlist and a media segment were fetched successfully.'
        : 'HTTPS live-audio response and audio bytes were fetched successfully.',
  };
}

const akashvani = (
  id: string,
  name: string,
  streamUrl: string,
): RadioStation =>
  station(
    id,
    name,
    'Akashvani · Prasar Bharati',
    streamUrl,
    'hls',
    AKASHVANI_HOME,
    'Direct live stream listed by Akashvani; Timeless Frequencies does not provide the broadcast.',
  );

export const RADIO_CATALOG: RadioChannel[] = [
  {
    id: 'en-global',
    languageIdentifier: 'en',
    languageName: 'English',
    nativeName: 'English',
    regionLabel: 'Worldwide',
    displayName: 'English · Global',
    primaryStation: station(
      'nonstop-oldies',
      'Non-Stop Oldies',
      'Non-Stop Oldies',
      'https://ais-sa2.cdnstream1.com/2383_128.mp3',
      'mp3',
      'https://www.nonstopoldies.com/',
      'Direct stream published by the broadcaster.',
    ),
    fallbackStations: [
      station(
        'retro-50s-60s',
        '50s / 60s Retro Hits',
        '50s 60s RETRO HITS',
        'https://node-31.zeno.fm/pxzwykxbluitv',
        'mp3',
        'https://zeno.fm/radio/50s-60s-retro-hits/',
        'Station page and direct stream supplied by Zeno.fm.',
      ),
      station(
        'groovy-radio',
        '60s / 70s Groove',
        "Groovy Radio - 60's and 70's Oldies",
        'https://r1.comcities.com/proxy/emogddug/stream',
        'mp3',
        'https://groovyradio.us/',
        'Direct stream published by the broadcaster.',
      ),
      station(
        'flower-power',
        'Flower Power',
        'Flower Power Radio',
        'https://nl1.streamingpulse.com/ssl/flowerpowerradio',
        'mp3',
        'https://www.flowerpowerradio.com/',
        'Direct stream published by the broadcaster.',
      ),
    ],
  },
  {
    id: 'hi-in',
    languageIdentifier: 'hi',
    languageName: 'Hindi',
    nativeName: 'हिन्दी',
    regionLabel: 'India',
    displayName: 'Hindi · India',
    primaryStation: station(
      'hindi-retro',
      'Hindi Retro',
      'Radio Retro Bollywood',
      'https://node-31.zeno.fm/v2zfmxef798uv',
      'mp3',
      null,
      currentSiteAttribution,
    ),
    fallbackStations: [
      station(
        'radio-gaana',
        'Hindi Retro Nights',
        'Radio Gaana',
        'https://sp14.instainternet.com/8044/stream',
        'aac',
        'https://radiohotstar.com/radiogaana.php',
        'Station and direct stream listed in the live Timeless Frequencies catalogue.',
      ),
      akashvani(
        'vividh-bharati',
        'Vividh Bharati',
        'https://radio.wavespb.com/live/146ed6ec6dea5a24/146ed6ec6dea5a24.m3u8',
      ),
    ],
  },
  {
    id: 'ml-in',
    languageIdentifier: 'ml',
    languageName: 'Malayalam',
    nativeName: 'മലയാളം',
    regionLabel: 'India',
    displayName: 'Malayalam · India',
    primaryStation: station(
      'kj-yesudas-malayalam',
      'Malayalam Evergreen',
      'KJ Yesudas Malayalam Songs',
      'https://node-31.zeno.fm/9x1sw687nf9uv',
      'mp3',
      null,
      currentSiteAttribution,
    ),
    fallbackStations: [
      akashvani(
        'akashvani-malayalam',
        'VB Malayalam',
        'https://radio.wavespb.com/live/ad3a8436a329e2d6/ad3a8436a329e2d6.m3u8',
      ),
    ],
  },
  {
    id: 'ta-in',
    languageIdentifier: 'ta',
    languageName: 'Tamil',
    nativeName: 'தமிழ்',
    regionLabel: 'India',
    displayName: 'Tamil · India',
    primaryStation: station(
      'vanavil-fm',
      'Tamil Classics',
      'VanavilFM · Radio Maestro',
      'https://s7.yesstreaming.net:8092/stream',
      'aac',
      'https://vanavilfm.com/',
      'Direct stream published by VanavilFM.',
    ),
    fallbackStations: [
      akashvani(
        'akashvani-tamil-nadu',
        'Akashvani Tamil Nadu',
        'https://radio.wavespb.com/live/d533f2af4f49bd6f/d533f2af4f49bd6f.m3u8',
      ),
      akashvani(
        'akashvani-kodai-fm',
        'AIR Kodai FM',
        'https://air.pc.cdn.bitgravity.com/air/live/pbaudio051/playlist.m3u8',
      ),
    ],
  },
  {
    id: 'te-in',
    languageIdentifier: 'te',
    languageName: 'Telugu',
    nativeName: 'తెలుగు',
    regionLabel: 'India',
    displayName: 'Telugu · India',
    primaryStation: station(
      'london-telugu-radio',
      'Telugu Classics',
      'London Telugu Radio',
      'https://c8.radioboss.fm/stream/33',
      'mp3',
      'https://www.londonteluguradio.com/',
      'Direct stream published by London Telugu Radio.',
    ),
    fallbackStations: [
      akashvani(
        'vb-telugu-vijayawada',
        'VB Telugu Vijayawada',
        'https://radio.wavespb.com/live/0beac8e921bbfdbb/0beac8e921bbfdbb.m3u8',
      ),
      akashvani(
        'vb-telugu-hyderabad',
        'VB Telugu Hyderabad',
        'https://radio.wavespb.com/live/89969ad91f106dde/89969ad91f106dde.m3u8',
      ),
    ],
  },
  {
    id: 'kn-in',
    languageIdentifier: 'kn',
    languageName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    regionLabel: 'India',
    displayName: 'Kannada · India',
    primaryStation: station(
      'radio-suno-kannada',
      'Kannada Melody',
      'Radio Suno Kannada',
      'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_SUNO_MELODY_S06.mp3',
      'mp3',
      null,
      currentSiteAttribution,
    ),
    fallbackStations: [
      akashvani(
        'rainbow-kannada-kaamanbilu',
        'Rainbow Kannada Kaamanbilu',
        'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio027/hlspbaudio027_Auto.m3u8',
      ),
      akashvani(
        'vb-kannada',
        'VB Kannada',
        'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio026/hlspbaudio026_Auto.m3u8',
      ),
    ],
  },
  {
    id: 'bn-in',
    languageIdentifier: 'bn',
    languageName: 'Bengali',
    nativeName: 'বাংলা',
    regionLabel: 'India',
    displayName: 'Bengali · India',
    primaryStation: akashvani(
      'akashvani-bangla',
      'Akashvani Bangla',
      'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio137/hlspbaudio137_Auto.m3u8',
    ),
    fallbackStations: [
      akashvani(
        'fm-gold-kolkata',
        'FM Gold Kolkata',
        'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio057/hlspbaudio057_Auto.m3u8',
      ),
      akashvani(
        'akashvani-maitree',
        'Akashvani Maitree Kolkata',
        'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio245/hlspbaudio24564kbps.m3u8',
      ),
    ],
  },
  {
    id: 'bn-bd',
    languageIdentifier: 'bn',
    languageName: 'Bengali',
    nativeName: 'বাংলা',
    regionLabel: 'Bangladesh',
    displayName: 'Bengali · Bangladesh',
    primaryStation: station(
      'mellow-bangla',
      'Bengali Hits',
      'Mellow Bangla',
      'https://radio.mellowbangla.com/stream',
      'mp3',
      'https://www.mellowbangla.com/',
      'Direct stream published by Mellow Bangla.',
    ),
    fallbackStations: [
      station(
        'radio-foorti',
        'Radio Foorti',
        'Radio Foorti',
        'https://radiofoorti.fm/api/stream',
        'mp3',
        'https://radiofoorti.fm/',
        'Direct stream published by Radio Foorti.',
      ),
    ],
  },
  {
    id: 'mr-in',
    languageIdentifier: 'mr',
    languageName: 'Marathi',
    nativeName: 'मराठी',
    regionLabel: 'India',
    displayName: 'Marathi · India',
    primaryStation: akashvani(
      'akashvani-mumbai-ashmita',
      'Akashvani Marathi Mumbai Ashmita',
      'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio010/hlspbaudio010_Auto.m3u8',
    ),
    fallbackStations: [
      akashvani(
        'akashvani-kolhapur',
        'Akashvani Kolhapur',
        'https://radio.wavespb.com/live/c0040b54233d76a1/c0040b54233d76a1.m3u8',
      ),
      akashvani(
        'akashvani-nanded',
        'Akashvani Nanded',
        'https://radio.wavespb.com/live/111df0bc650820de/111df0bc650820de.m3u8',
      ),
    ],
  },
  {
    id: 'gu-in',
    languageIdentifier: 'gu',
    languageName: 'Gujarati',
    nativeName: 'ગુજરાતી',
    regionLabel: 'India',
    displayName: 'Gujarati · India',
    primaryStation: akashvani(
      'akashvani-gujarati',
      'Akashvani Gujarati',
      'https://radio.wavespb.com/live/8a1bb2ca9d2a6741/8a1bb2ca9d2a6741.m3u8',
    ),
    fallbackStations: [
      akashvani(
        'akashvani-rajkot',
        'Akashvani Rajkot',
        'https://radio.wavespb.com/live/3fa69e2c950b70e8/3fa69e2c950b70e8.m3u8',
      ),
      akashvani(
        'akashvani-vadodara',
        'Akashvani Vadodara',
        'https://radio.wavespb.com/live/e1c63b2c2b58921f/e1c63b2c2b58921f.m3u8',
      ),
    ],
  },
  {
    id: 'pa-in',
    languageIdentifier: 'pa',
    languageName: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    regionLabel: 'India',
    displayName: 'Punjabi · India',
    primaryStation: station(
      'bol-punjabi',
      'Punjabi Radio',
      'Bol Punjabi Radio',
      'https://bolpunjabi-ekamsoftware.radioca.st/stream',
      'mp3',
      null,
      currentSiteAttribution,
    ),
    fallbackStations: [
      akashvani(
        'akashvani-punjabi',
        'Akashvani Punjabi',
        'https://radio.wavespb.com/live/5adc4acbbdd1f6cf/5adc4acbbdd1f6cf.m3u8',
      ),
    ],
  },
  {
    id: 'ur-in',
    languageIdentifier: 'ur',
    languageName: 'Urdu',
    nativeName: 'اُردُو',
    regionLabel: 'India',
    displayName: 'Urdu · India',
    primaryStation: station(
      'air-urdu',
      'AIR Urdu',
      'Akashvani Urdu Service',
      'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio006/hlspbaudio00632kbps.m3u8',
      'hls',
      'https://prasarbharati.gov.in/homepage-air/',
      'Direct live stream listed for Akashvani; Timeless Frequencies does not provide the broadcast.',
    ),
    fallbackStations: [],
  },
  {
    id: 'ur-pk',
    languageIdentifier: 'ur',
    languageName: 'Urdu',
    nativeName: 'اُردُو',
    regionLabel: 'Pakistan',
    displayName: 'Urdu · Pakistan',
    primaryStation: station(
      'radio-pakistan-islamabad',
      'Radio Pakistan Islamabad',
      'Radio Pakistan',
      'https://whmsonic.radio.gov.pk:7003/stream',
      'mp3',
      'https://radio.gov.pk/',
      'Direct stream published by Radio Pakistan.',
    ),
    fallbackStations: [
      station(
        'radio-pakistan-lahore',
        'Radio Pakistan Lahore',
        'Radio Pakistan',
        'https://whmsonic.radio.gov.pk:8026/relay?type=http&nocache=9',
        'mp3',
        'https://radio.gov.pk/',
        'Direct stream published by Radio Pakistan.',
      ),
      station(
        'radio-pakistan-multan',
        'Radio Pakistan Multan',
        'Radio Pakistan',
        'https://whmsonic.radio.gov.pk:8034/stream?type=http&nocache=12',
        'mp3',
        'https://radio.gov.pk/',
        'Direct stream published by Radio Pakistan.',
      ),
    ],
  },
  {
    id: 'or-in',
    languageIdentifier: 'or',
    languageName: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    regionLabel: 'India',
    displayName: 'Odia · India',
    primaryStation: akashvani(
      'akashvani-cuttack',
      'Akashvani Cuttack',
      'https://radio.wavespb.com/live/fbcc67ea837b6ea7/fbcc67ea837b6ea7.m3u8',
    ),
    fallbackStations: [
      akashvani(
        'akashvani-berhampur',
        'Akashvani Berhampur',
        'https://radio.wavespb.com/live/9ff9e2581893d28d/9ff9e2581893d28d.m3u8',
      ),
      akashvani(
        'akashvani-jeypore',
        'Akashvani Jeypore',
        'https://air.pc.cdn.bitgravity.com/air/live/pbaudio112/playlist.m3u8',
      ),
    ],
  },
  {
    id: 'as-in',
    languageIdentifier: 'as',
    languageName: 'Assamese',
    nativeName: 'অসমীয়া',
    regionLabel: 'India',
    displayName: 'Assamese · India',
    primaryStation: akashvani(
      'akashvani-guwahati-mahabahu',
      'Akashvani Guwahati Mahabahu',
      'https://radio.wavespb.com/live/d1712a1355f27abb/d1712a1355f27abb.m3u8',
    ),
    fallbackStations: [
      akashvani(
        'akashvani-guwahati-pragjyotishpur',
        'Akashvani Guwahati Pragjyotishpur',
        'https://radio.wavespb.com/live/c8a130239e27ded0/c8a130239e27ded0.m3u8',
      ),
      akashvani(
        'akashvani-dibrugarh',
        'Akashvani Dibrugarh',
        'https://radio.wavespb.com/live/6db6683f71f6df13/6db6683f71f6df13.m3u8',
      ),
    ],
  },
  {
    id: 'si-lk',
    languageIdentifier: 'si',
    languageName: 'Sinhala',
    nativeName: 'සිංහල',
    regionLabel: 'Sri Lanka',
    displayName: 'Sinhala · Sri Lanka',
    primaryStation: station(
      'rangiri-sri-lanka',
      'Rangiri Sri Lanka',
      'Rangiri Radio',
      'https://rangiri.radioca.st/stream',
      'mp3',
      'https://rangirisrilanka.lk/radio/',
      'Direct stream published by Rangiri Radio.',
    ),
    fallbackStations: [
      station(
        'siyatha-fm',
        'Siyatha FM',
        'Siyatha FM',
        'https://srv01.onlineradio.voaplus.com/siyathafm',
        'mp3',
        'https://siyathafm.lk/',
        'Station homepage and public stream listing identify Siyatha FM.',
      ),
      station(
        'ran-fm',
        'Ran FM',
        'Ran FM',
        'https://a3.asurahosting.com/listen/ranfm/radio.mp3',
        'mp3',
        'http://ranfm.lk/',
        'Station homepage and public stream listing identify Ran FM.',
      ),
    ],
  },
  {
    id: 'ar-world',
    languageIdentifier: 'ar',
    languageName: 'Arabic',
    nativeName: 'العربية',
    regionLabel: 'International',
    displayName: 'Arabic · International',
    primaryStation: station(
      'bbc-arabic-radio',
      'BBC Arabic Radio',
      'BBC News Arabic',
      'https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio',
      'mp3',
      'https://www.bbc.com/arabic',
      'Direct BBC live-audio stream.',
    ),
    fallbackStations: [],
  },
  {
    id: 'ne-np',
    languageIdentifier: 'ne',
    languageName: 'Nepali',
    nativeName: 'नेपाली',
    regionLabel: 'Nepal',
    displayName: 'Nepali · Nepal',
    primaryStation: station(
      'bbc-nepali',
      'BBC Nepali',
      'BBC News Nepali',
      'https://stream.live.vc.bbcmedia.co.uk/bbc_nepali_radio',
      'mp3',
      'https://www.bbc.com/nepali',
      'Direct BBC live-audio stream.',
    ),
    fallbackStations: [],
  },
  {
    id: 'kok-in',
    languageIdentifier: 'kok',
    languageName: 'Konkani',
    nativeName: 'कोंकणी',
    regionLabel: 'India',
    displayName: 'Konkani · India',
    primaryStation: station(
      'amchi-konkani',
      'Radio AmchiKONKANI',
      'Radio AmchiKONKANI',
      'https://eu9.fastcast4u.com/proxy/alfagodwin?mp=/1',
      'mp3',
      'https://amchikonkani.com/',
      'Station homepage and public stream listing identify Radio AmchiKONKANI.',
    ),
    fallbackStations: [],
  },
  {
    id: 'sa-in',
    languageIdentifier: 'sa',
    languageName: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    regionLabel: 'India',
    displayName: 'Sanskrit · India',
    primaryStation: station(
      'radio-sanskrit-bharati',
      'Radio Sanskrit Bharati',
      'Radio Sanskrit Bharati',
      'https://stream.zeno.fm/c0adewsyw8quv',
      'mp3',
      'https://www.khandbahale.com/radio/sanskritbharati/',
      'Station homepage and public stream listing identify Radio Sanskrit Bharati.',
    ),
    fallbackStations: [],
  },
];

export function getChannel(channelId: string): RadioChannel | undefined {
  return RADIO_CATALOG.find((channel) => channel.id === channelId);
}

export function getStations(channelId: string): RadioStation[] {
  const channel = getChannel(channelId);
  return channel
    ? [channel.primaryStation, ...channel.fallbackStations]
    : [];
}

export function getStation(
  channelId: string,
  stationId: string,
): RadioStation | undefined {
  return getStations(channelId).find((station) => station.id === stationId);
}
