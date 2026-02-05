// Airport coordinates for route network visualization
export interface AirportData {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string; // IANA timezone
}

export const airportCoordinates: Record<string, AirportData> = {
  // === MIDDLE EAST ===
  DOH: { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', lat: 25.2731, lng: 51.6081, timezone: 'Asia/Qatar' },
  DXB: { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', lat: 25.2532, lng: 55.3657, timezone: 'Asia/Dubai' },
  AUH: { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE', lat: 24.4330, lng: 54.6511, timezone: 'Asia/Dubai' },
  MCT: { code: 'MCT', name: 'Muscat International Airport', city: 'Muscat', country: 'Oman', lat: 23.5933, lng: 58.2844, timezone: 'Asia/Muscat' },
  BAH: { code: 'BAH', name: 'Bahrain International Airport', city: 'Manama', country: 'Bahrain', lat: 26.2708, lng: 50.6336, timezone: 'Asia/Bahrain' },
  KWI: { code: 'KWI', name: 'Kuwait International Airport', city: 'Kuwait City', country: 'Kuwait', lat: 29.2267, lng: 47.9689, timezone: 'Asia/Kuwait' },
  RUH: { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia', lat: 24.9576, lng: 46.6988, timezone: 'Asia/Riyadh' },
  JED: { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia', lat: 21.6796, lng: 39.1565, timezone: 'Asia/Riyadh' },
  DMM: { code: 'DMM', name: 'King Fahd International Airport', city: 'Dammam', country: 'Saudi Arabia', lat: 26.4712, lng: 49.7979, timezone: 'Asia/Riyadh' },
  AMM: { code: 'AMM', name: 'Queen Alia International Airport', city: 'Amman', country: 'Jordan', lat: 31.7226, lng: 35.9932, timezone: 'Asia/Amman' },
  BEY: { code: 'BEY', name: 'Beirut–Rafic Hariri International Airport', city: 'Beirut', country: 'Lebanon', lat: 33.8209, lng: 35.4884, timezone: 'Asia/Beirut' },
  TLV: { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'Israel', lat: 32.0114, lng: 34.8867, timezone: 'Asia/Jerusalem' },
  
  // === EUROPE ===
  LHR: { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK', lat: 51.4700, lng: -0.4543, timezone: 'Europe/London' },
  LGW: { code: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'UK', lat: 51.1537, lng: -0.1821, timezone: 'Europe/London' },
  STN: { code: 'STN', name: 'London Stansted Airport', city: 'London', country: 'UK', lat: 51.8850, lng: 0.2350, timezone: 'Europe/London' },
  MAN: { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'UK', lat: 53.3537, lng: -2.2750, timezone: 'Europe/London' },
  EDI: { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'UK', lat: 55.9500, lng: -3.3725, timezone: 'Europe/London' },
  CDG: { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479, timezone: 'Europe/Paris' },
  ORY: { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', lat: 48.7233, lng: 2.3794, timezone: 'Europe/Paris' },
  FRA: { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622, timezone: 'Europe/Berlin' },
  MUC: { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', lat: 48.3537, lng: 11.7750, timezone: 'Europe/Berlin' },
  AMS: { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lng: 4.7683, timezone: 'Europe/Amsterdam' },
  MAD: { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', lat: 40.4983, lng: -3.5676, timezone: 'Europe/Madrid' },
  BCN: { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833, timezone: 'Europe/Madrid' },
  FCO: { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', lat: 41.8003, lng: 12.2389, timezone: 'Europe/Rome' },
  MXP: { code: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', lat: 45.6306, lng: 8.7281, timezone: 'Europe/Rome' },
  ZRH: { code: 'ZRH', name: 'Zürich Airport', city: 'Zurich', country: 'Switzerland', lat: 47.4647, lng: 8.5492, timezone: 'Europe/Zurich' },
  GVA: { code: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland', lat: 46.2381, lng: 6.1089, timezone: 'Europe/Zurich' },
  VIE: { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', lat: 48.1103, lng: 16.5697, timezone: 'Europe/Vienna' },
  DUB: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4264, lng: -6.2499, timezone: 'Europe/Dublin' },
  CPH: { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', lat: 55.6180, lng: 12.6560, timezone: 'Europe/Copenhagen' },
  OSL: { code: 'OSL', name: 'Oslo Gardermoen Airport', city: 'Oslo', country: 'Norway', lat: 60.1976, lng: 11.1004, timezone: 'Europe/Oslo' },
  ARN: { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', lat: 59.6498, lng: 17.9238, timezone: 'Europe/Stockholm' },
  HEL: { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland', lat: 60.3172, lng: 24.9633, timezone: 'Europe/Helsinki' },
  IST: { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lng: 28.7519, timezone: 'Europe/Istanbul' },
  ATH: { code: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece', lat: 37.9364, lng: 23.9445, timezone: 'Europe/Athens' },
  LIS: { code: 'LIS', name: 'Lisbon Airport', city: 'Lisbon', country: 'Portugal', lat: 38.7813, lng: -9.1359, timezone: 'Europe/Lisbon' },
  BRU: { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium', lat: 50.9014, lng: 4.4844, timezone: 'Europe/Brussels' },
  WAW: { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', lat: 52.1657, lng: 20.9671, timezone: 'Europe/Warsaw' },
  PRG: { code: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic', lat: 50.1008, lng: 14.2600, timezone: 'Europe/Prague' },
  BUD: { code: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary', lat: 47.4298, lng: 19.2611, timezone: 'Europe/Budapest' },
  
  // === AMERICAS ===
  JFK: { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', lat: 40.6413, lng: -73.7781, timezone: 'America/New_York' },
  EWR: { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA', lat: 40.6895, lng: -74.1745, timezone: 'America/New_York' },
  LAX: { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', lat: 33.9425, lng: -118.4081, timezone: 'America/Los_Angeles' },
  SFO: { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA', lat: 37.6213, lng: -122.3790, timezone: 'America/Los_Angeles' },
  ORD: { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'USA', lat: 41.9742, lng: -87.9073, timezone: 'America/Chicago' },
  MIA: { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA', lat: 25.7959, lng: -80.2870, timezone: 'America/New_York' },
  ATL: { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA', lat: 33.6407, lng: -84.4277, timezone: 'America/New_York' },
  DFW: { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA', lat: 32.8998, lng: -97.0403, timezone: 'America/Chicago' },
  DEN: { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'USA', lat: 39.8561, lng: -104.6737, timezone: 'America/Denver' },
  SEA: { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'USA', lat: 47.4502, lng: -122.3088, timezone: 'America/Los_Angeles' },
  BOS: { code: 'BOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'USA', lat: 42.3656, lng: -71.0096, timezone: 'America/New_York' },
  IAD: { code: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington D.C.', country: 'USA', lat: 38.9531, lng: -77.4565, timezone: 'America/New_York' },
  PHX: { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'USA', lat: 33.4373, lng: -112.0078, timezone: 'America/Phoenix' },
  YYZ: { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248, timezone: 'America/Toronto' },
  YVR: { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', lat: 49.1947, lng: -123.1792, timezone: 'America/Vancouver' },
  YUL: { code: 'YUL', name: 'Montréal–Trudeau International Airport', city: 'Montreal', country: 'Canada', lat: 45.4706, lng: -73.7408, timezone: 'America/Montreal' },
  MEX: { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', lat: 19.4363, lng: -99.0721, timezone: 'America/Mexico_City' },
  GRU: { code: 'GRU', name: 'São Paulo–Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lng: -46.4731, timezone: 'America/Sao_Paulo' },
  GIG: { code: 'GIG', name: 'Rio de Janeiro–Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.8099, lng: -43.2506, timezone: 'America/Sao_Paulo' },
  EZE: { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lng: -58.5358, timezone: 'America/Argentina/Buenos_Aires' },
  SCL: { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile', lat: -33.3930, lng: -70.7858, timezone: 'America/Santiago' },
  BOG: { code: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lng: -74.1469, timezone: 'America/Bogota' },
  LIM: { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', lat: -12.0219, lng: -77.1143, timezone: 'America/Lima' },
  
  // === ASIA ===
  SIN: { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', lat: 1.3644, lng: 103.9915, timezone: 'Asia/Singapore' },
  HKG: { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', lat: 22.3080, lng: 113.9185, timezone: 'Asia/Hong_Kong' },
  PEK: { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', lat: 40.0799, lng: 116.6031, timezone: 'Asia/Shanghai' },
  PVG: { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', lat: 31.1443, lng: 121.8083, timezone: 'Asia/Shanghai' },
  CAN: { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', lat: 23.3924, lng: 113.2988, timezone: 'Asia/Shanghai' },
  BKK: { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lng: 100.7501, timezone: 'Asia/Bangkok' },
  KUL: { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lng: 101.7072, timezone: 'Asia/Kuala_Lumpur' },
  CGK: { code: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta', country: 'Indonesia', lat: -6.1256, lng: 106.6559, timezone: 'Asia/Jakarta' },
  NRT: { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', lat: 35.7720, lng: 140.3929, timezone: 'Asia/Tokyo' },
  HND: { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', lat: 35.5494, lng: 139.7798, timezone: 'Asia/Tokyo' },
  KIX: { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan', lat: 34.4347, lng: 135.2441, timezone: 'Asia/Tokyo' },
  ICN: { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', lat: 37.4602, lng: 126.4407, timezone: 'Asia/Seoul' },
  TPE: { code: 'TPE', name: 'Taiwan Taoyuan International Airport', city: 'Taipei', country: 'Taiwan', lat: 25.0777, lng: 121.2325, timezone: 'Asia/Taipei' },
  MNL: { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines', lat: 14.5086, lng: 121.0194, timezone: 'Asia/Manila' },
  
  // === INDIA ===
  DEL: { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', lat: 28.5562, lng: 77.1000, timezone: 'Asia/Kolkata' },
  BOM: { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', lat: 19.0896, lng: 72.8656, timezone: 'Asia/Kolkata' },
  BLR: { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India', lat: 13.1986, lng: 77.7066, timezone: 'Asia/Kolkata' },
  MAA: { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', lat: 12.9941, lng: 80.1709, timezone: 'Asia/Kolkata' },
  HYD: { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India', lat: 17.2403, lng: 78.4294, timezone: 'Asia/Kolkata' },
  CCU: { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'India', lat: 22.6547, lng: 88.4467, timezone: 'Asia/Kolkata' },
  COK: { code: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India', lat: 10.1520, lng: 76.4019, timezone: 'Asia/Kolkata' },
  CCJ: { code: 'CCJ', name: 'Calicut International Airport', city: 'Kozhikode', country: 'India', lat: 11.1368, lng: 75.9553, timezone: 'Asia/Kolkata' },
  TRV: { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram', country: 'India', lat: 8.4821, lng: 76.9200, timezone: 'Asia/Kolkata' },
  AMD: { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', country: 'India', lat: 23.0772, lng: 72.6347, timezone: 'Asia/Kolkata' },
  GOI: { code: 'GOI', name: 'Goa International Airport', city: 'Goa', country: 'India', lat: 15.3808, lng: 73.8314, timezone: 'Asia/Kolkata' },
  PNQ: { code: 'PNQ', name: 'Pune Airport', city: 'Pune', country: 'India', lat: 18.5821, lng: 73.9197, timezone: 'Asia/Kolkata' },
  JAI: { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur', country: 'India', lat: 26.8242, lng: 75.8122, timezone: 'Asia/Kolkata' },
  LKO: { code: 'LKO', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', country: 'India', lat: 26.7606, lng: 80.8893, timezone: 'Asia/Kolkata' },
  GAU: { code: 'GAU', name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', country: 'India', lat: 26.1061, lng: 91.5859, timezone: 'Asia/Kolkata' },
  IXC: { code: 'IXC', name: 'Chandigarh International Airport', city: 'Chandigarh', country: 'India', lat: 30.6735, lng: 76.7885, timezone: 'Asia/Kolkata' },
  SXR: { code: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar', country: 'India', lat: 33.9871, lng: 74.7742, timezone: 'Asia/Kolkata' },
  VNS: { code: 'VNS', name: 'Lal Bahadur Shastri International Airport', city: 'Varanasi', country: 'India', lat: 25.4524, lng: 82.8593, timezone: 'Asia/Kolkata' },
  IXE: { code: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore', country: 'India', lat: 12.9612, lng: 74.8900, timezone: 'Asia/Kolkata' },
  
  // === AFRICA ===
  CAI: { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', lat: 30.1219, lng: 31.4056, timezone: 'Africa/Cairo' },
  JNB: { code: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', lat: -26.1392, lng: 28.2460, timezone: 'Africa/Johannesburg' },
  CPT: { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', lat: -33.9715, lng: 18.6021, timezone: 'Africa/Johannesburg' },
  ADD: { code: 'ADD', name: 'Addis Ababa Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia', lat: 8.9779, lng: 38.7993, timezone: 'Africa/Addis_Ababa' },
  NBO: { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', lat: -1.3192, lng: 36.9278, timezone: 'Africa/Nairobi' },
  CMN: { code: 'CMN', name: 'Mohammed V International Airport', city: 'Casablanca', country: 'Morocco', lat: 33.3675, lng: -7.5898, timezone: 'Africa/Casablanca' },
  ALG: { code: 'ALG', name: 'Houari Boumediene Airport', city: 'Algiers', country: 'Algeria', lat: 36.6910, lng: 3.2154, timezone: 'Africa/Algiers' },
  TUN: { code: 'TUN', name: 'Tunis–Carthage International Airport', city: 'Tunis', country: 'Tunisia', lat: 36.8510, lng: 10.2272, timezone: 'Africa/Tunis' },
  LOS: { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', lat: 6.5774, lng: 3.3212, timezone: 'Africa/Lagos' },
  ACC: { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana', lat: 5.6052, lng: -0.1668, timezone: 'Africa/Accra' },
  DAR: { code: 'DAR', name: 'Julius Nyerere International Airport', city: 'Dar es Salaam', country: 'Tanzania', lat: -6.8781, lng: 39.2026, timezone: 'Africa/Dar_es_Salaam' },
  MRU: { code: 'MRU', name: 'Sir Seewoosagur Ramgoolam International Airport', city: 'Mauritius', country: 'Mauritius', lat: -20.4302, lng: 57.6836, timezone: 'Indian/Mauritius' },
  SEZ: { code: 'SEZ', name: 'Seychelles International Airport', city: 'Mahé', country: 'Seychelles', lat: -4.6743, lng: 55.5218, timezone: 'Indian/Mahe' },
  
  // === OCEANIA ===
  SYD: { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', lat: -33.9399, lng: 151.1753, timezone: 'Australia/Sydney' },
  MEL: { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', lat: -37.6690, lng: 144.8410, timezone: 'Australia/Melbourne' },
  BNE: { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', lat: -27.3942, lng: 153.1218, timezone: 'Australia/Brisbane' },
  PER: { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia', lat: -31.9403, lng: 115.9668, timezone: 'Australia/Perth' },
  AKL: { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lng: 174.7850, timezone: 'Pacific/Auckland' },
  CHC: { code: 'CHC', name: 'Christchurch Airport', city: 'Christchurch', country: 'New Zealand', lat: -43.4894, lng: 172.5319, timezone: 'Pacific/Auckland' },
  NAN: { code: 'NAN', name: 'Nadi International Airport', city: 'Nadi', country: 'Fiji', lat: -17.7553, lng: 177.4431, timezone: 'Pacific/Fiji' },
  
  // === SRI LANKA & MALDIVES ===
  CMB: { code: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka', lat: 7.1808, lng: 79.8841, timezone: 'Asia/Colombo' },
  MLE: { code: 'MLE', name: 'Velana International Airport', city: 'Malé', country: 'Maldives', lat: 4.1918, lng: 73.5290, timezone: 'Indian/Maldives' },
  
  // === PAKISTAN ===
  KHI: { code: 'KHI', name: 'Jinnah International Airport', city: 'Karachi', country: 'Pakistan', lat: 24.9065, lng: 67.1608, timezone: 'Asia/Karachi' },
  LHE: { code: 'LHE', name: 'Allama Iqbal International Airport', city: 'Lahore', country: 'Pakistan', lat: 31.5216, lng: 74.4036, timezone: 'Asia/Karachi' },
  ISB: { code: 'ISB', name: 'Islamabad International Airport', city: 'Islamabad', country: 'Pakistan', lat: 33.5607, lng: 72.8495, timezone: 'Asia/Karachi' },
  
  // === CENTRAL ASIA ===
  TAS: { code: 'TAS', name: 'Tashkent International Airport', city: 'Tashkent', country: 'Uzbekistan', lat: 41.2577, lng: 69.2812, timezone: 'Asia/Tashkent' },
  ALA: { code: 'ALA', name: 'Almaty International Airport', city: 'Almaty', country: 'Kazakhstan', lat: 43.3521, lng: 77.0405, timezone: 'Asia/Almaty' },
  
  // === RUSSIA ===
  SVO: { code: 'SVO', name: 'Sheremetyevo International Airport', city: 'Moscow', country: 'Russia', lat: 55.9726, lng: 37.4146, timezone: 'Europe/Moscow' },
  DME: { code: 'DME', name: 'Moscow Domodedovo Airport', city: 'Moscow', country: 'Russia', lat: 55.4088, lng: 37.9063, timezone: 'Europe/Moscow' },
  LED: { code: 'LED', name: 'Pulkovo Airport', city: 'Saint Petersburg', country: 'Russia', lat: 59.8003, lng: 30.2625, timezone: 'Europe/Moscow' },
  
  // === CARIBBEAN ===
  HAV: { code: 'HAV', name: 'José Martí International Airport', city: 'Havana', country: 'Cuba', lat: 22.9892, lng: -82.4091, timezone: 'America/Havana' },
  SJU: { code: 'SJU', name: 'Luis Muñoz Marín International Airport', city: 'San Juan', country: 'Puerto Rico', lat: 18.4394, lng: -66.0018, timezone: 'America/Puerto_Rico' },
  BGI: { code: 'BGI', name: 'Grantley Adams International Airport', city: 'Bridgetown', country: 'Barbados', lat: 13.0746, lng: -59.4925, timezone: 'America/Barbados' },
  NAS: { code: 'NAS', name: 'Lynden Pindling International Airport', city: 'Nassau', country: 'Bahamas', lat: 25.0390, lng: -77.4662, timezone: 'America/Nassau' },
  MBJ: { code: 'MBJ', name: 'Sangster International Airport', city: 'Montego Bay', country: 'Jamaica', lat: 18.5037, lng: -77.9134, timezone: 'America/Jamaica' },
};

export function getAirportCoordinates(code: string): AirportData | null {
  return airportCoordinates[code] || null;
}
