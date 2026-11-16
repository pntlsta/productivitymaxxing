// Trip content: Philippines Dec 22, 2026 – Jan 11, 2027, with a Thailand leg Jan 3–8.
// Only what was provided; nothing invented. Booking codes, seats and exact private addresses are
// deliberately NOT here (this repo is public) — they belong in the encrypted Private details box.

export const TRIP_ID = 'trip-ph-th-2026';
export const TRIP = { name: 'Philippines + Thailand', start: '2026-12-22', end: '2027-01-11', travelers: ['Jae', 'Jannica'] };

// kind: flight | stay | activity | transit | tbd | note. flags: ids from FLAGS.
export const DAYS = [
  { date: '2026-12-22', place: 'Manila', items: [
    { time: '', kind: 'tbd', text: 'Arrive in Manila (arrival flight not listed yet)', flags: ['arrival'] },
    { time: '', kind: 'activity', text: 'SM mall, Avengers movie, street food' },
    { time: '', kind: 'stay', text: 'Airbnb near Manila (details TBD)' },
  ] },
  { date: '2026-12-23', place: 'Manila → Pangasinan', items: [
    { time: '', kind: 'transit', text: 'Manila to Pangasinan' },
    { time: '2:00 PM', kind: 'stay', text: 'Check in: Cozy Haven Dagupan (Airbnb condo room), Arellano Street, Dagupan, beside Region 1 Medical Center. Building staff check-in; entry and wifi details appear in Airbnb 48 hours before. Booked Dec 23–29, paid $226.98' },
    { time: '', kind: 'activity', text: 'Then Anolid' },
  ] },
  { date: '2026-12-24', place: 'Anolid, Pangasinan', items: [{ time: '', kind: 'activity', text: 'Christmas Eve in Anolid' }] },
  { date: '2026-12-25', place: 'Pangasinan', items: [{ time: '', kind: 'activity', text: 'Beach day' }] },
  { date: '2026-12-26', place: 'Manila', items: [
    { time: '', kind: 'activity', text: 'Manila, Mall of Asia (a same-day round trip from Dagupan)', flags: ['dec26'] },
    { time: 'Night', kind: 'stay', text: 'Cozy Haven Dagupan' },
  ] },
  { date: '2026-12-27', place: 'Open', items: [
    { time: '', kind: 'tbd', text: 'Open day. Ideas: Intramuros and Fort Santiago, Manila Bay sunset, BGC street art and food, Tagaytay day trip (Taal view, bulalo)', flags: ['dagupan-base'] },
    { time: 'Night', kind: 'stay', text: 'Cozy Haven Dagupan' },
  ] },
  { date: '2026-12-28', place: 'Open', items: [
    { time: '', kind: 'tbd', text: 'Open day (same ideas as Dec 27)', flags: ['dagupan-base'] },
    { time: 'Night', kind: 'stay', text: 'Cozy Haven Dagupan (last night)' },
    { time: '2:00 PM', kind: 'note', text: 'Free cancellation ends on the Parañaque Airbnb' },
  ] },
  { date: '2026-12-29', place: 'Baguio', items: [
    { time: 'Before 7:00 AM', kind: 'stay', text: 'Check out of Cozy Haven Dagupan (checkout is 12:00 PM, so leaving early is fine)' },
    { time: '7:00 AM', kind: 'transit', text: 'Leave Dagupan for Baguio', flags: ['dec29-early', 'baguio-crowds'] },
    { time: '2:00 PM', kind: 'stay', text: 'Check in: Sunset View Guest House (Airbnb), Naguilian Road, Baguio' },
    { time: 'Evening', kind: 'activity', text: 'Night Market' },
  ] },
  { date: '2026-12-30', place: 'Baguio', items: [
    { time: '', kind: 'activity', text: 'Baguio open day' },
    { time: '11:59 PM TH', kind: 'note', text: "Free cancellation ends on Chillin' Guest House (THB 2,200 fee from Dec 31)" },
  ] },
  { date: '2026-12-31', place: 'Baguio', items: [
    { time: 'Midnight', kind: 'activity', text: 'New Year fireworks in Baguio' },
    { time: '', kind: 'note', text: 'Thailand Digital Arrival Card window opens today (Dec 31 to Jan 3)', flags: ['tdac'] },
  ] },
  { date: '2027-01-01', place: 'Baguio → Anolid', items: [
    { time: '11:00 AM', kind: 'stay', text: 'Check out of Sunset View Guest House. Leave early: peak-season traffic' },
    { time: '', kind: 'transit', text: 'Back to Anolid', flags: ['back-to-back'] },
  ] },
  { date: '2027-01-02', place: 'Anolid → Manila', items: [
    { time: '', kind: 'activity', text: 'Pack, weigh bags (20 kg checked each, 7 kg carry-on)' },
    { time: '', kind: 'transit', text: 'To Manila, lunch at MOA, rest', flags: ['back-to-back'] },
    { time: '', kind: 'note', text: 'Message Centre Point Plus about an airport pickup for Jan 5', flags: ['pickup-72h'] },
    { time: '2:00 PM', kind: 'stay', text: 'Check in: 2BDR Deluxe Suite, SunnyPlace Residences, 724 Quirino Ave, Parañaque (Airbnb, Jan 2–11). Booked for 5 guests; house allows up to 6 overnight. Building staff check-in: message the host for instructions. Total $547.10' },
    { time: '', kind: 'tbd', text: 'Where Jae and Jannica sleep tonight is TBD', flags: ['gap-jan2'] },
  ] },
  { date: '2027-01-03', place: 'Manila → Chiang Mai', items: [
    { time: '~6:00 AM', kind: 'transit', text: 'Be at NAIA Terminal 1 (3 hours before the 9:00 AM flight). Ask at check-in whether bags are tagged through to Chiang Mai', flags: ['gap-jan2'] },
    { time: '9:00 AM', kind: 'flight', text: 'Z2 285 Philippines AirAsia, MNL T1 → Bangkok Don Mueang (DMK) T1, lands 11:40 AM' },
    { time: '11:40 AM', kind: 'transit', text: 'DMK: immigration (TDAC done), then Terminal 1 → Terminal 2. Re-check bags if not tagged through', flags: ['dmk-layover'] },
    { time: '2:00 PM', kind: 'flight', text: 'FD 3433 Thai AirAsia, DMK T2 → Chiang Mai (CNX), lands 3:20 PM (rescheduled from 1:45 PM)' },
    { time: '2–8 PM', kind: 'stay', text: "Check in: Chillin' 闲 Guest House, 2/1 Tha Phae Soi 4 (near Tha Phae Gate). Pay THB 4,400 at the property; bring photo ID and a credit card" },
    { time: 'Evening', kind: 'activity', text: 'Sunday Walking Street (it is a Sunday)' },
    { time: '11:59 PM TH', kind: 'note', text: 'Free cancellation ends on Centre Point Plus Silom' },
  ] },
  { date: '2027-01-04', place: 'Chiang Mai', items: [
    { time: 'Before 7:30 AM', kind: 'note', text: "Eat breakfast before pickup (Chillin' has no breakfast)", flags: ['breakfast'] },
    { time: '7:30–8:00 AM', kind: 'activity', text: 'Elephant Nature Park pickup', flags: ['not-booked'] },
    { time: '9 AM–3 PM', kind: 'activity', text: 'Elephant Nature Park full day (3,500 THB per adult)' },
    { time: '4:30–5:00 PM', kind: 'transit', text: 'Back in town' },
  ] },
  { date: '2027-01-05', place: 'Chiang Mai → Bangkok', items: [
    { time: '7:00–8:30 AM', kind: 'activity', text: 'Doi Suthep (cool morning: bring a layer)', flags: ['doi-suthep'] },
    { time: '', kind: 'activity', text: 'Wat Phra Singh and Wat Chedi Luang' },
    { time: 'Lunch', kind: 'activity', text: 'Khao soi' },
    { time: 'By 2:00 PM', kind: 'stay', text: "Check out of Chillin' and store bags" },
    { time: '~5:45 PM', kind: 'transit', text: 'At Chiang Mai airport (check-in desk closes 7:05 PM, 40 min before departure)' },
    { time: '7:45 PM', kind: 'flight', text: 'Bangkok Airways PG220, CNX → Bangkok Suvarnabhumi (BKK), lands 9:10 PM. Free Boutique Lounge; Blue Ribbon is a paid add-on (~950 THB each)' },
    { time: '9:10 PM', kind: 'transit', text: 'Grab or hotel transfer to Silom', flags: ['pickup-72h'] },
    { time: 'Night', kind: 'stay', text: 'Check in: Centre Point Plus Hotel Silom, 1522/2 Soi Kaysorn 1 (Charoenkrung 50), Charoenkrung Rd, Bangrak. Deluxe Plus with breakfast buffet; prepaid via Expedia ($455.28) with Stay Protection Plan. Check-in from 2 PM with no end time, so a late arrival is fine. Deposit THB 1,000 per night at the property. Hotel: +66 2 266 0521' },
    { time: 'Late', kind: 'activity', text: 'Easy dinner' },
  ] },
  { date: '2027-01-06', place: 'Bangkok', items: [
    { time: '~10:00 AM', kind: 'activity', text: 'Grand Palace (500 THB each, last entry 3:30 PM). Strict dress code', flags: ['palace-scam'] },
    { time: '', kind: 'activity', text: 'Wat Pho (200 THB each)' },
    { time: '', kind: 'transit', text: 'Ferry across to Wat Arun (~4 THB)', flags: ['wat-arun-fee'] },
    { time: 'Evening', kind: 'tbd', text: 'Free evening: suggested new slot for the Yaowarat food crawl', flags: ['jan7-conflict'] },
  ] },
  { date: '2027-01-07', place: 'Bangkok', items: [
    { time: '', kind: 'activity', text: 'Chinatown: Wat Traimit, Talad Noi, Sampeng Lane' },
    { time: '6:30 PM', kind: 'activity', text: 'Yaowarat food crawl', flags: ['jan7-conflict'] },
    { time: '', kind: 'activity', text: 'ICONSIAM' },
    { time: '6:00–7:30 PM', kind: 'activity', text: 'Opulence dinner cruise check-in, ICONSIAM Pier 1 (1,800 THB per adult)', flags: ['jan7-conflict', 'not-booked'] },
    { time: '8:00 PM', kind: 'activity', text: 'Cruise boards, back about 10:15 PM' },
  ] },
  { date: '2027-01-08', place: 'Bangkok → Manila', items: [
    { time: 'Morning', kind: 'activity', text: 'Free: Jim Thompson House, Lumpini Park, Thai massage, MBK or Siam shopping' },
    { time: '12:00 PM', kind: 'stay', text: 'Check out of Centre Point Plus, store bags' },
    { time: '2:30–3:00 PM', kind: 'transit', text: 'Leave hotel (Friday traffic is heavy)' },
    { time: '~4:45 PM', kind: 'transit', text: 'At BKK airport' },
    { time: '7:50 PM', kind: 'flight', text: 'Philippine Airlines PR737, BKK → Manila NAIA T1, lands 12:10 AM Sat Jan 9. 20 kg prepaid bag each' },
  ] },
  { date: '2027-01-09', place: 'Manila', items: [
    { time: '12:10 AM', kind: 'transit', text: 'Land at NAIA T1. Ride arranged in advance', flags: ['late-arrival'] },
    { time: '', kind: 'activity', text: 'Family at the Parañaque Airbnb' },
    { time: '', kind: 'tbd', text: 'Where Jae and Jannica sleep (Jan 9–10) is TBD', flags: ['late-arrival'] },
  ] },
  { date: '2027-01-10', place: 'Manila', items: [{ time: '', kind: 'tbd', text: 'Plans TBD (family in Parañaque)' }] },
  { date: '2027-01-11', place: 'Manila', items: [{ time: '12:00 PM', kind: 'stay', text: 'Check out of the Parañaque Airbnb' }] },
];

// severity: conflict (two things can't both happen) | tight | gap (missing info) | todo
export const FLAGS = {
  'jan7-conflict': { severity: 'conflict', title: 'Jan 7: food crawl clashes with the dinner cruise',
    text: 'The Yaowarat food crawl starts at 6:30 PM, but Opulence check-in at ICONSIAM Pier 1 is 6:00–7:30 PM, and it is a dinner cruise. Suggest moving the Yaowarat crawl to the evening of Jan 6 (free after Wat Arun, and Chinatown is close to the temples), and keep Jan 7 for daytime Chinatown, ICONSIAM, then the cruise.' },
  'dmk-layover': { severity: 'tight', title: 'Jan 3: 2h20m connection at Don Mueang',
    text: 'You land 11:40 AM and the next flight leaves 2:00 PM. In that window: Thai immigration (long lines in peak season), Terminal 1 → Terminal 2, and possibly collecting and re-checking bags. Do the TDAC beforehand, ask at MNL check-in whether bags are tagged through to Chiang Mai, keep pens and printed bookings handy, and move straight to immigration.' },
  'dec26': { severity: 'tight', title: 'Dec 26: Mall of Asia is a same-day round trip from Dagupan',
    text: 'You are booked in Dagupan Dec 23–29, so the Dec 26 Manila / MOA day means Pangasinan to Manila and back in one day, in holiday traffic. Leave early, or move MOA to Jan 2 (already planned: lunch at MOA) and keep Dec 26 local.' },
  'dagupan-base': { severity: 'tight', title: 'Dec 27–28 ideas are Manila-area, but you are based in Dagupan',
    text: 'Intramuros, Manila Bay, BGC and Tagaytay are all long day trips from Dagupan. Either pick Pangasinan plans for these days or save the Manila ideas for Jan 2 or Jan 9–10, when you are back near Manila.' },
  'dec29-early': { severity: 'todo', title: 'Dec 29: 7:00 AM departure from Dagupan',
    text: 'The 7:00 AM plan was written before the Dagupan booking. From Dagupan the drive to Baguio is much shorter than from Manila, so you could leave later and still make the 2:00 PM check-in, but peak-season traffic up the mountain is heavy, so early is still the safe choice.' },
  'dagupan-cancel': { severity: 'todo', title: 'Dagupan Airbnb: free cancellation is only 24 hours',
    text: 'Cozy Haven Dagupan is free to cancel for 24 hours after booking, then non-refundable ($226.98 paid). If anything about Dec 23–29 might change, decide now.' },
  'gap-jan2': { severity: 'gap', title: 'Jan 2: no bed listed, with a ~6:00 AM airport arrival next day',
    text: 'You need to be at NAIA T1 around 6:00 AM on Jan 3. The Parañaque Airbnb (from Jan 2, near the airport) is booked for 5 guests and the house allows up to 6 overnight. If you two stay there, check the head count with your family and update the guest number on Airbnb so you are covered. Otherwise confirm where you sleep and how you get to T1 at ~5:00 AM.' },
  'back-to-back': { severity: 'tight', title: 'Jan 1–2: two long drives before an early flight',
    text: 'Baguio → Anolid on New Year’s Day (heavy traffic), then Anolid → Manila on Jan 2, then a ~6:00 AM airport arrival on Jan 3. Doable, but it leaves little slack; pack in Baguio or Anolid so Jan 2 is light.' },
  'pickup-72h': { severity: 'tight', title: 'Hotel pickup needs 72 hours’ notice',
    text: 'You land at BKK 9:10 PM Thai time on Jan 5, so the Centre Point Plus transfer must be arranged by about 9:10 PM Thai time on Jan 2 (10:10 PM Philippine time). Your plan says message them on Jan 2, a travel day. Send it earlier, e.g. Jan 1 or before, and ask the price: Expedia says surcharges may apply. Hotel: +66 2 266 0521.' },
  'tdac': { severity: 'todo', title: 'TDAC falls over New Year in Baguio',
    text: 'The Thailand Digital Arrival Card window is Dec 31 – Jan 3 (official site tdac.immigration.go.th only). Plan to do both cards on Jan 1 evening or Jan 2 rather than during the fireworks.' },
  'not-booked': { severity: 'todo', title: 'Elephant Nature Park and the Opulence cruise are not booked',
    text: 'Both are listed as to-dos and availability is limited in peak season. Book soon: elephantnaturepark.org/book-now and GetYourGuide for the cruise.' },
  'breakfast': { severity: 'todo', title: 'Jan 4: breakfast before a 7:30 AM pickup',
    text: "Chillin' is room-only. Buy something the night before so you can eat before pickup." },
  'doi-suthep': { severity: 'todo', title: 'Jan 5: 7:00 AM at Doi Suthep',
    text: 'The temple is up the mountain from the Old City, so arrange a Grab or songthaew the night before and allow travel time to arrive by 7:00 AM.' },
  'late-arrival': { severity: 'gap', title: 'Jan 9: 12:10 AM landing, bed not listed',
    text: 'You land just after midnight and where you sleep Jan 9–10 is TBD. The Parañaque Airbnb (booked for 5, up to 6 overnight) runs until Jan 11, so it may be the answer; confirm the head count and late-night check-in with the host. Also do eTravel within 72 hours before arrival (from about Jan 6, 12:10 AM).' },
  'arrival': { severity: 'gap', title: 'Dec 22 arrival flight not listed',
    text: 'Needed for eTravel (submit within 72 hours before arrival) and for the Dec 22 plans.' },
  'wat-arun-fee': { severity: 'gap', title: 'Wat Arun entry fee not in your notes',
    text: 'Only the ferry (~4 THB) is listed. Check the current entry fee before you go so the budget is complete.' },
  'palace-scam': { severity: 'todo', title: 'Grand Palace: ignore "it’s closed today"',
    text: 'Walk to the entrance yourself. Palace hours are about 8:30 AM to 3:30 PM. Cover shoulders and knees; it is the strictest dress code.' },
  'baguio-crowds': { severity: 'todo', title: 'Baguio peak season',
    text: 'Dec 29 – Jan 1 is very crowded: expect heavy traffic up and down, book dinners ahead, and leave early on Jan 1.' },
};

// due: ISO date (+ optional time label). link: official URL when given.
export const CHECKLIST = [
  { id: 'book-enp', due: '2026-11-20', when: 'ASAP', text: 'Book Elephant Nature Park for Jan 4 (3,500 THB per adult)', link: 'https://www.elephantnaturepark.org/book-now', flag: 'not-booked' },
  { id: 'book-cruise', due: '2026-11-20', when: 'ASAP', text: 'Book the Opulence dinner cruise on GetYourGuide (1,800 THB per adult). Decide the Jan 7 food-crawl clash first', flag: 'jan7-conflict' },
  { id: 'passports', due: '2026-11-20', when: 'ASAP', text: 'Check both passports are valid at least 6 months past entry (past Jul 3, 2027)' },
  { id: 'dagupan-cancel', due: '2026-11-14', when: '24 h after booking', text: 'Cozy Haven Dagupan: last chance for free cancellation (non-refundable after)', flag: 'dagupan-cancel' },
  { id: 'baguio-cancel', due: '2026-11-29', when: 'Nov 29, 2:00 PM', text: 'Last day for free cancellation on the Baguio Airbnb: confirm you are keeping it' },
  { id: 'fill-gaps', due: '2026-12-15', when: 'Before the trip', text: 'Settle open stays: night of Dec 22 (Manila), Jan 2, Jan 9–10', flag: 'gap-jan2' },
  { id: 'dec26-27-28', due: '2026-12-15', when: 'Before the trip', text: 'Decide Dec 26–28 plans now that you are based in Dagupan', flag: 'dagupan-base' },
  { id: 'arrival-flight', due: '2026-12-15', when: 'Before the trip', text: 'Add the Dec 22 arrival flight to your notes', flag: 'arrival' },
  { id: 'apps', due: '2026-12-20', when: 'Before Dec 22', text: 'Download Grab and offline Google Maps (Chiang Mai, Bangkok)' },
  { id: 'esim', due: '2026-12-20', when: 'Before Dec 22', text: 'Get a Thailand eSIM or plan to buy a Thai SIM' },
  { id: 'card', due: '2026-12-20', when: 'Before Dec 22', text: 'Have a card with no foreign transaction fees; a universal power adapter; photos or copies of passports and bookings' },
  { id: 'etravel-in', due: '2026-12-19', when: 'Within 72 h before Dec 22 arrival', text: 'eTravel registration for arriving in the Philippines (each of you)', link: 'https://etravel.gov.ph' },
  { id: 'paranaque-guests', due: '2026-12-15', when: 'Before the trip', text: 'Parañaque Airbnb: confirm who sleeps there (booked for 5, up to 6 allowed) and update the guest count if you two stay Jan 2 or Jan 9–10', flag: 'gap-jan2' },
  { id: 'paranaque-cancel', due: '2026-12-28', when: 'Dec 28, 2:00 PM', text: 'Last day for free cancellation on the Parañaque Airbnb (partial refund until check-in, Jan 2 at 2:00 PM)' },
  { id: 'chillin-cancel', due: '2026-12-30', when: 'Dec 30, 11:59 PM Thai time', text: "Last day for free cancellation on Chillin' (THB 2,200 fee from Dec 31)" },
  { id: 'pickup', due: '2027-01-01', when: 'By Jan 1 (deadline ~Jan 2, 9 PM Thai time)', text: 'Contact Centre Point Plus (+66 2 266 0521) to arrange the Jan 5 airport pickup and ask the surcharge (needs 72 h notice)', flag: 'pickup-72h' },
  { id: 'tdac-jae', due: '2027-01-01', when: 'Dec 31 – Jan 3 (plan Jan 1–2)', text: 'Thailand Digital Arrival Card: Jae (free, official site only)', link: 'https://tdac.immigration.go.th', flag: 'tdac' },
  { id: 'tdac-jannica', due: '2027-01-01', when: 'Dec 31 – Jan 3 (plan Jan 1–2)', text: 'Thailand Digital Arrival Card: Jannica (free, official site only)', link: 'https://tdac.immigration.go.th', flag: 'tdac' },
  { id: 'tell-chillin', due: '2027-01-02', when: 'Before Jan 3', text: "Tell Chillin' your arrival time (CNX lands 3:20 PM). Phone +66 64 209 9521" },
  { id: 'weigh-bags', due: '2027-01-02', when: 'Jan 2', text: 'Weigh bags: 20 kg checked each on every leg, 7 kg carry-on' },
  { id: 'through-tag', due: '2027-01-03', when: 'Jan 3 at MNL check-in', text: 'Ask whether bags are tagged through to Chiang Mai', flag: 'dmk-layover' },
  { id: 'silom-cancel', due: '2027-01-03', when: 'Jan 3, 11:59 PM Thai time', text: 'Last day for free cancellation on Centre Point Plus Silom' },
  { id: 'aqi', due: '2027-01-03', when: 'Jan 3 evening', text: 'Check Chiang Mai air quality (AQI) before the elephant park and Doi Suthep; pack a mask' },
  { id: 'etravel-out', due: '2027-01-06', when: 'From Jan 6 (72 h before 12:10 AM Jan 9)', text: 'eTravel registration for arriving back in the Philippines (each of you)', link: 'https://etravel.gov.ph' },
  { id: 'ride-jan9', due: '2027-01-07', when: 'Before Jan 8', text: 'Arrange a ride from NAIA T1 for the 12:10 AM Jan 9 landing', flag: 'late-arrival' },
];

export const PACKING = [
  { group: 'Documents & money', items: ['Passports (6+ months validity)', 'Photos or copies of passports and bookings', 'Proof of onward/return flights and hotel bookings', 'Credit card with no foreign transaction fees', 'Some baht in small bills and coins', 'Photo ID + credit card for Chillin\' check-in'] },
  { group: 'Electronics', items: ['Phone + charger', 'Power bank', 'Universal plug adapter (Thailand is 220V, mixed plugs)', 'eSIM / Thai SIM set up', 'Offline maps downloaded'] },
  { group: 'Baguio (cold nights)', items: ['Warm jacket', 'Long pants', 'Socks and closed shoes', 'Layer for evenings at the Night Market and fireworks'] },
  { group: 'Chiang Mai (warm days ~27–28°C, nights ~16°C)', items: ['Light layer for early mornings (Doi Suthep, pickup at 7:30 AM)', 'Light day clothes', 'Comfortable walking shoes', 'Mask (check AQI)'] },
  { group: 'Elephant Nature Park day', items: ['Closed shoes or sandals that can get muddy', 'Quick-dry clothes', 'Change of clothes', 'Sunscreen', 'Mosquito repellent', 'Hat', 'Reusable bottle'] },
  { group: 'Bangkok (hot and humid)', items: ['Light, breathable clothes', 'Sunscreen', 'Hat', 'Sandals'] },
  { group: 'Temples (Grand Palace is strictest)', items: ['Tops that cover shoulders', 'Pants or skirts below the knee (no see-through or tight leggings)', 'Light scarf or sarong', 'Easy slip-off shoes'] },
  { group: 'Day bag', items: ['Small day bag', 'Tissues / small change for markets and songthaews', 'Pen (arrival forms)'] },
  { group: 'Do NOT pack', items: ['Vapes or e-cigarettes (illegal in Thailand)'] },
];

// Planned costs from the notes only. currency: THB | USD | PHP. optional: not counted by default.
export const PLANNED = [
  { id: 'dagupan', label: 'Cozy Haven Dagupan Airbnb, Dec 23–29 (already paid)', amount: 226.98, currency: 'USD' },
  { id: 'chillin', label: "Chillin' Guest House, 2 nights (pay at property)", amount: 4400, currency: 'THB' },
  { id: 'silom', label: 'Centre Point Plus Silom, 3 nights with breakfast (prepaid via Expedia)', amount: 455.28, currency: 'USD' },
  { id: 'paranaque', label: 'Parañaque Airbnb, Jan 2–11, 5 guests (family stay)', amount: 547.10, currency: 'USD' },
  { id: 'silom-deposit', label: 'Centre Point deposit, THB 1,000 × 3 nights (refundable)', amount: 3000, currency: 'THB', refundable: true },
  { id: 'enp', label: 'Elephant Nature Park, 2 adults × 3,500', amount: 7000, currency: 'THB' },
  { id: 'cruise', label: 'Opulence dinner cruise, 2 adults × 1,800', amount: 3600, currency: 'THB' },
  { id: 'palace', label: 'Grand Palace, 2 × 500', amount: 1000, currency: 'THB' },
  { id: 'wat-pho', label: 'Wat Pho, 2 × 200', amount: 400, currency: 'THB' },
  { id: 'ferry', label: 'Ferry to Wat Arun, 2 × ~4', amount: 8, currency: 'THB' },
  { id: 'lounge', label: 'Blue Ribbon lounge, 2 × ~950 (optional add-on)', amount: 1900, currency: 'THB', optional: true },
];
export const BUDGET_NOTES = 'Flights are confirmed but their prices aren’t in your notes, and neither are the Baguio Airbnb cost, the airport pickup surcharge or the Wat Arun entry fee, so they are not counted. Add them below as expenses.';

export const GUIDE = [
  { title: 'Entry & documents (Thailand)', items: ['Passports valid at least 6 months past entry.', 'Carry onward/return flight proof, hotel bookings, and a card or some cash. Immigration can ask.', 'At Don Mueang on Jan 3, go straight to immigration with the TDAC done ahead.', 'Ask at MNL check-in whether bags are tagged through to Chiang Mai. If not, collect and re-check at Terminal 2.'] },
  { title: 'Money, phone, power', items: ['Pay in baht. Decline if a card terminal or ATM offers to charge in your home currency.', 'ATMs charge a fee per withdrawal: take out larger amounts less often.', 'Carry small bills and coins for night markets, songthaews, temples and street food.', 'Use a card with no foreign transaction fees.', '220V, mixed plugs: bring a universal adapter.', 'Tipping isn’t expected; rounding up or 20–50 THB for good service is fine.'] },
  { title: 'Getting around', items: ['Grab works in both cities and avoids haggling.', 'Chiang Mai Old City is walkable. Agree the price before getting in a red songthaew.', 'Bangkok: BTS and MRT for long hops. From Silom, the river boat from Sathorn Pier reaches the Grand Palace and Wat Pho area.', 'ICONSIAM: BTS Gold Line or the free shuttle boat from Sathorn Pier (verify the current schedule).', 'Taxis: insist on the meter. Avoid renting scooters.'] },
  { title: 'Food to try', items: ['Chiang Mai: khao soi (Khao Soi Khun Yai, Khao Soi Lam Duan Fah Ham), sai oua sausage, nam prik ong, Warorot Market snacks, Sunday Walking Street stalls, Ristr8to coffee.', 'Bangkok: Yaowarat Chinatown crawl (roasted duck, noodles, seafood, mango sticky rice), Thai milk tea, boat noodles, Silom street food.', 'Pangasinan: Dagupan bangus, pigar-pigar, Calasiao puto.', 'Baguio: strawberry taho, ube jam, Session Road cafes, Night Market street food.', 'Pick busy stalls, drink bottled water, ask the price before ordering seafood in Chinatown.'] },
  { title: 'What to avoid', items: ['"The Grand Palace is closed today" scam: ignore it and walk to the entrance.', 'Tuk-tuk detours to gem shops and tailors, "50 baht tours", taxis that refuse the meter.', 'Gem shops and "special government promotion" offers.', 'Bird-food and "free" photo stunts that ask for money after.', 'Elephant riding, shows and painting. The waterfall tour’s "elephant cafe" is only a short, optional feeding stop.', 'Vapes and e-cigarettes are illegal. Skip cannabis shops; rules shift.', 'Chiang Mai burning season usually worsens from mid/late January: check the AQI the day before and pack a mask.'] },
  { title: 'Temple rules', items: ['Cover shoulders and knees; no see-through or tight leggings. Bring a light scarf or sarong.', 'Remove shoes before entering buildings.', 'Don’t touch heads, don’t point feet at Buddha images, be respectful around monks.', 'Be respectful of the Thai royal family. Disrespect is a crime.'] },
  { title: 'Peak season', items: ['Baguio Dec 29 – Jan 1: heavy traffic, book dinners ahead, leave early on Jan 1.', 'Chiang Mai and Bangkok are busy late Dec to early Jan: book the cruise and elephant park early; expect long Grand Palace lines.'] },
  { title: 'Open questions', items: ['Where do Jae and Jannica sleep Dec 22, Jan 2 and Jan 9–10? (The Parañaque Airbnb is booked for 5 and allows 6.)', 'The Dec 22 arrival flight.', 'Dec 26–28 plans (now based in Dagupan) and Jan 10 plans.', 'Optional: private Sticky Waterfall and Land of Angels tour, Capybara Coffee Chiang Mai. No free day assigned yet.'] },
];
