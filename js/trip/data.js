// Trip content: Moline → Philippines Dec 19, 2026 – Jan 11, 2027, with a Thailand leg Jan 3–8.
// Only what was provided; nothing invented. Booking codes, seats and exact private addresses are
// deliberately NOT here (this repo is public) — they belong in the encrypted Private details box.

export const TRIP_ID = 'trip-ph-th-2026';
export const TRIP = { name: 'Philippines + Thailand', start: '2026-12-19', end: '2027-01-11', travelers: ['Jae', 'Jannica'] };

// kind: flight | stay | activity | transit | tbd | note. flags: ids from FLAGS.
// Flights also carry code + route (+ who) so the Calendar and home screen can show them on the day.
export const DAYS = [
  { date: '2026-12-19', place: 'Moline → Chicago', items: [
    { time: '4:58 PM', kind: 'flight', code: 'AA 3500', route: 'MLI → ORD', who: 'Jae + Janelle', text: 'AA 3500 (American Eagle / Envoy), Moline (MLI) → Chicago O’Hare (ORD) Terminal 3, lands 6:14 PM', flags: ['ticket-not-issued'] },
    { time: 'Night', kind: 'tbd', text: 'Night in Chicago: next flight is tomorrow 2:10 PM. Hotel not listed', flags: ['chicago-night'] },
    { time: '', kind: 'note', text: 'eTravel window for the Dec 22 arrival is open (within 72 hours). Submit before you fly', flags: [] },
  ] },
  { date: '2026-12-20', place: 'Chicago → Hong Kong', items: [
    { time: '~11:10 AM', kind: 'transit', text: 'Be at O’Hare Terminal 5 (international), about 3 hours before departure' },
    { time: '2:10 PM', kind: 'flight', code: 'CX 807', route: 'ORD → HKG', who: 'Jae + Janelle', text: 'CX 807 Cathay Pacific, Chicago ORD T5 → Hong Kong HKG T1, lands 8:05 PM Mon Dec 21 (15h55m, A350-1000, Economy Light)' },
  ] },
  { date: '2026-12-21', place: 'Hong Kong → Manila', items: [
    { time: '8:05 PM', kind: 'transit', text: 'Land at Hong Kong T1. Transfer to the Manila flight (same terminal, about 2 hours)', flags: ['hkg-connection'] },
    { time: '10:10 PM', kind: 'flight', code: 'CX 939', route: 'HKG → MNL', who: 'Jae + Janelle', text: 'CX 939 Cathay Pacific, Hong Kong T1 → Manila NAIA Terminal 3, lands 12:20 AM Tue Dec 22 (777-300)' },
  ] },
  { date: '2026-12-22', place: 'Manila', items: [
    { time: '12:20 AM', kind: 'transit', text: 'Land at NAIA Terminal 3', flags: ['arrival-late'] },
    { time: 'Morning', kind: 'activity', text: 'SM Megamall: Avengers: Doomsday showing' },
    { time: '', kind: 'activity', text: 'Street food' },
    { time: 'Night', kind: 'stay', text: 'Airbnb near Manila (details TBD)', flags: ['arrival-late'] },
  ] },
  { date: '2026-12-23', place: 'Manila → Pangasinan', items: [
    { time: '', kind: 'transit', text: 'Manila to Pangasinan' },
    { time: '2:00 PM', kind: 'stay', text: 'Check in: Cozy Haven Dagupan (Airbnb condo room), Arellano Street, Dagupan, beside Region 1 Medical Center. Building staff check-in; entry and wifi details appear in Airbnb 48 hours before. Booked Dec 23–29, paid $226.98' },
    { time: '', kind: 'activity', text: 'Then Anolid' },
  ] },
  { date: '2026-12-24', place: 'Anolid, Pangasinan', items: [{ time: '', kind: 'activity', text: 'Christmas Eve in Anolid' }] },
  { date: '2026-12-25', place: 'Pangasinan', items: [{ time: '', kind: 'activity', text: 'Beach day' }] },
  { date: '2026-12-26', place: 'Agno, Pangasinan', items: [
    { time: '', kind: 'activity', text: 'Agno' },
    { time: 'Night', kind: 'tbd', text: 'Overnight in Agno or back to the Dagupan Airbnb? Not listed', flags: ['agno'] },
  ] },
  { date: '2026-12-27', place: 'Agno, Pangasinan', items: [
    { time: '', kind: 'activity', text: 'Agno' },
    { time: 'Night', kind: 'stay', text: 'Cozy Haven Dagupan (if you head back)', flags: ['agno'] },
  ] },
  { date: '2026-12-28', place: 'Pangasinan', items: [
    { time: '', kind: 'tbd', text: 'No plans yet' },
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
  { date: '2027-01-01', place: 'Baguio → Pangasinan', items: [
    { time: '11:00 AM', kind: 'stay', text: 'Check out of Sunset View Guest House. Leave early: peak-season traffic' },
    { time: '', kind: 'transit', text: 'AC picks you up (sundo ni AC)' },
    { time: 'Afternoon', kind: 'activity', text: 'Rest for the rest of the day' },
    { time: 'Night', kind: 'activity', text: 'Pack everything. Good time to do both TDACs too', flags: ['tdac'] },
  ] },
  { date: '2027-01-02', place: 'Pangasinan', items: [
    { time: '', kind: 'activity', text: 'Continue packing, weigh bags (20 kg checked each, 7 kg carry-on)' },
    { time: '', kind: 'note', text: 'Message Centre Point Plus about an airport pickup for Jan 5', flags: ['pickup-72h'] },
    { time: '2:00 PM', kind: 'stay', text: 'Family checks in: 2BDR Deluxe Suite, SunnyPlace Residences, 724 Quirino Ave, Parañaque (Airbnb, Jan 2–11). Booked for 5 guests; house allows up to 6 overnight. Building staff check-in: message the host for instructions. Total $547.10' },
    { time: 'Late night', kind: 'transit', text: 'Leave for Manila around 1:00 AM tonight (early Jan 3)', flags: ['overnight-drive'] },
  ] },
  { date: '2027-01-03', place: 'Manila → Chiang Mai', items: [
    { time: '~1:00 AM', kind: 'transit', text: 'On the road from Pangasinan to NAIA', flags: ['overnight-drive'] },
    { time: '~6:00 AM', kind: 'transit', text: 'Be at NAIA Terminal 1 (3 hours before the 9:00 AM flight). Ask at check-in whether bags are tagged through to Chiang Mai', flags: ['overnight-drive'] },
    { time: '9:00 AM', kind: 'flight', code: 'Z2 285', route: 'MNL → DMK', who: 'Jae + Jannica', text: 'Z2 285 Philippines AirAsia, MNL T1 → Bangkok Don Mueang (DMK) T1, lands 11:40 AM' },
    { time: '11:40 AM', kind: 'transit', text: 'DMK: immigration (TDAC done), then Terminal 1 → Terminal 2. Re-check bags if not tagged through', flags: ['dmk-layover'] },
    { time: '2:00 PM', kind: 'flight', code: 'FD 3433', route: 'DMK → CNX', who: 'Jae + Jannica', text: 'FD 3433 Thai AirAsia, DMK T2 → Chiang Mai (CNX), lands 3:20 PM (rescheduled from 1:45 PM)' },
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
    { time: '7:45 PM', kind: 'flight', code: 'PG 220', route: 'CNX → BKK', who: 'Jae + Jannica', text: 'Bangkok Airways PG220, CNX → Bangkok Suvarnabhumi (BKK), lands 9:10 PM. Free Boutique Lounge; Blue Ribbon is a paid add-on (~950 THB each)' },
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
    { time: '7:50 PM', kind: 'flight', code: 'PR 737', route: 'BKK → MNL', who: 'Jae + Jannica', text: 'Philippine Airlines PR737, BKK → Manila NAIA T1, lands 12:10 AM Sat Jan 9. 20 kg prepaid bag each' },
  ] },
  { date: '2027-01-09', place: 'Manila', items: [
    { time: '12:10 AM', kind: 'transit', text: 'Land at NAIA T1. Ride arranged in advance', flags: ['late-arrival'] },
    { time: '', kind: 'activity', text: 'Family at the Parañaque Airbnb' },
    { time: '', kind: 'tbd', text: 'Where you sleep tonight is TBD', flags: ['late-arrival'] },
  ] },
  { date: '2027-01-10', place: 'Manila → Hong Kong', items: [
    { time: 'Day', kind: 'tbd', text: 'Plans TBD (family in Parañaque)' },
    { time: '~4:45 PM', kind: 'transit', text: 'Be at NAIA Terminal 3, about 3 hours before departure' },
    { time: '7:45 PM', kind: 'flight', code: 'CX 902', route: 'MNL → HKG', who: 'Jae + Janelle', text: 'CX 902 Cathay Pacific, Manila NAIA T3 → Hong Kong T1, lands 10:15 PM (777-300, Economy Light)' },
    { time: 'Night', kind: 'tbd', text: 'Overnight in Hong Kong: next flight is tomorrow 4:30 PM. Hotel not listed', flags: ['hkg-overnight'] },
  ] },
  { date: '2027-01-11', place: 'Hong Kong → Dallas → Moline', items: [
    { time: '12:00 PM', kind: 'stay', text: 'Family checks out of the Parañaque Airbnb' },
    { time: '~1:30 PM', kind: 'transit', text: 'Be at Hong Kong T1, about 3 hours before departure' },
    { time: '4:30 PM', kind: 'flight', code: 'CX 876', route: 'HKG → DFW', who: 'Jae + Janelle', text: 'CX 876 Cathay Pacific, Hong Kong T1 → Dallas/Fort Worth (DFW) Terminal D, lands 4:50 PM the same day (14h20m, A350-1000)' },
    { time: '4:50 PM', kind: 'transit', text: 'DFW: US immigration (Global Entry for Jae), collect bags, customs, re-check bags, then to the American Eagle gate', flags: ['dfw-connection'] },
    { time: '7:34 PM', kind: 'flight', code: 'AA 4034', route: 'DFW → MLI', who: 'Jae + Janelle', text: 'AA 4034 (American Eagle / Envoy), DFW → Moline (MLI), lands 9:42 PM. Seats not picked yet', flags: ['aa4034-seats'] },
  ] },
];

// severity: conflict (two things can't both happen) | tight | gap (missing info) | todo
export const FLAGS = {
  'ticket-not-issued': { severity: 'conflict', title: 'AA 3500 (Dec 19) shows "Ticket not issued"',
    text: 'On the Cathay Pacific booking page, the Moline → Chicago flight says "Ticket not issued" while every other flight says "Confirmed". Without an issued ticket you can be refused at check-in. Call Cathay Pacific (who sold the trip) and ask them to issue the AA 3500 ticket, then check it shows ticketed for both of you.' },
  'chicago-night': { severity: 'gap', title: 'Dec 19: night in Chicago, no hotel listed',
    text: 'You land at O’Hare 6:14 PM on Dec 19 and CX 807 leaves 2:10 PM the next day from Terminal 5. You need somewhere to sleep near O’Hare. If you collect bags at ORD (likely, since you stay overnight), re-check them at Terminal 5 on Dec 20.' },
  'hkg-connection': { severity: 'tight', title: 'Dec 21: about 2 hours to connect in Hong Kong',
    text: 'CX 807 lands 8:05 PM and CX 939 leaves 10:10 PM, both Cathay at Terminal 1 on one booking, so bags should go through to Manila. Two hours is normal for this transfer, but a late arrival from a 16-hour flight eats into it. Follow the transfer signs straight away.' },
  'arrival-late': { severity: 'gap', title: 'Dec 22: 12:20 AM landing, then a morning movie',
    text: 'You land at NAIA Terminal 3 just after midnight, and the Manila Airbnb for Dec 22 is still TBD. Arrange a ride and somewhere to sleep from about 1–2 AM, or plan to go straight to it, so the SM Megamall showing in the morning is realistic.' },
  'agno': { severity: 'gap', title: 'Dec 26–27 in Agno: where do you sleep?',
    text: 'The Dagupan Airbnb is paid through the night of Dec 28 and is non-refundable. If you stay overnight in Agno, that lodging is not listed; if you go back to Dagupan each night, Agno is a long day trip. Your Dec 28 has no plans yet.' },
  'overnight-drive': { severity: 'tight', title: 'Jan 3: overnight drive straight into a flight and a tight connection',
    text: 'Leaving Pangasinan around 1:00 AM to be at NAIA T1 by ~6:00 AM leaves little room for traffic, and you get no real sleep before the DMK connection and an evening walking street. Consider leaving closer to midnight, and nap on Jan 2 afternoon. Also: your confirmed flight Z2 285 leaves at 9:00 AM, not 3:30 AM.' },
  'hkg-overnight': { severity: 'gap', title: 'Jan 10: overnight in Hong Kong, no hotel listed',
    text: 'CX 902 lands 10:15 PM and CX 876 leaves 4:30 PM the next day (about 18 hours). Book a hotel (airport or city) for Jan 10, and check Hong Kong entry rules for each passport before leaving the airport. Ask Cathay whether your checked bags go through to Dallas or must be collected.' },
  'dfw-connection': { severity: 'tight', title: 'Jan 11: 2h44m at Dallas to clear US entry and re-check bags',
    text: 'DFW is your first US airport, so you go through immigration and customs there, collect and re-check bags, then reach the American Eagle gate for 7:34 PM. Global Entry speeds up Jae’s immigration step; Janelle needs her own Global Entry or can use Mobile Passport Control. Keep moving; a late CX 876 is the main risk.' },
  'aa4034-seats': { severity: 'todo', title: 'Jan 11: no seats picked on AA 4034',
    text: 'Both of you show "No preference" on the Dallas → Moline flight. Pick seats on the Cathay or American app so you sit together.' },
  'jan7-conflict': { severity: 'conflict', title: 'Jan 7: food crawl clashes with the dinner cruise',
    text: 'The Yaowarat food crawl starts at 6:30 PM, but Opulence check-in at ICONSIAM Pier 1 is 6:00–7:30 PM, and it is a dinner cruise. Suggest moving the Yaowarat crawl to the evening of Jan 6 (free after Wat Arun, and Chinatown is close to the temples), and keep Jan 7 for daytime Chinatown, ICONSIAM, then the cruise.' },
  'dmk-layover': { severity: 'tight', title: 'Jan 3: 2h20m connection at Don Mueang',
    text: 'You land 11:40 AM and the next flight leaves 2:00 PM. In that window: Thai immigration (long lines in peak season), Terminal 1 → Terminal 2, and possibly collecting and re-checking bags. Do the TDAC beforehand, ask at MNL check-in whether bags are tagged through to Chiang Mai, keep pens and printed bookings handy, and move straight to immigration.' },
  'dec29-early': { severity: 'todo', title: 'Dec 29: 7:00 AM departure from Dagupan',
    text: 'The 7:00 AM plan was written before the Dagupan booking. From Dagupan the drive to Baguio is much shorter than from Manila, so you could leave later and still make the 2:00 PM check-in, but peak-season traffic up the mountain is heavy, so early is still the safe choice.' },
  'dagupan-cancel': { severity: 'todo', title: 'Dagupan Airbnb: free cancellation is only 24 hours',
    text: 'Cozy Haven Dagupan is free to cancel for 24 hours after booking, then non-refundable ($226.98 paid). If anything about Dec 23–29 might change, decide now.' },
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
  'late-arrival': { severity: 'gap', title: 'Jan 9: 12:10 AM landing, bed not listed for that night',
    text: 'You land just after midnight and where you sleep the night of Jan 9 is TBD (you fly out Jan 10 at 7:45 PM). The Parañaque Airbnb (booked for 5, up to 6 overnight) runs until Jan 11, so it may be the answer; confirm the head count and late-night check-in with the host. Also do eTravel within 72 hours before arrival (from about Jan 6, 12:10 AM).' },
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
  { id: 'aa3500-ticket', due: '2026-11-20', when: 'ASAP', text: 'Call Cathay Pacific: AA 3500 (Moline → Chicago, Dec 19) says "Ticket not issued". Get it ticketed for both of you', flag: 'ticket-not-issued' },
  { id: 'passports', due: '2026-11-20', when: 'ASAP', text: 'Check passports are valid at least 6 months past entry (past Jul 3, 2027 for Thailand)' },
  { id: 'chicago-hotel', due: '2026-12-01', when: 'Before the trip', text: 'Book a hotel near O’Hare for the night of Dec 19', flag: 'chicago-night' },
  { id: 'hk-hotel', due: '2026-12-15', when: 'Before the trip', text: 'Book a Hong Kong hotel for Jan 10, check HK entry rules for each passport, and ask Cathay whether bags go through to Dallas', flag: 'hkg-overnight' },
  { id: 'aa4034-seats', due: '2026-12-15', when: 'Before the trip', text: 'Pick seats together on AA 4034 (Dallas → Moline, Jan 11)', flag: 'aa4034-seats' },
  { id: 'ktn', due: '2026-12-15', when: 'Before the trip', text: 'Add Jae’s Global Entry Known Traveler Number to the Cathay booking (Add membership / travel document) so TSA PreCheck can print on boarding passes', },
  { id: 'janelle-entry', due: '2026-12-15', when: 'Before the trip', text: 'Janelle: Global Entry of her own, or set up Mobile Passport Control for re-entry at Dallas on Jan 11', flag: 'dfw-connection' },
  { id: 'dagupan-cancel', due: '2026-11-14', when: '24 h after booking', text: 'Cozy Haven Dagupan: last chance for free cancellation (non-refundable after)', flag: 'dagupan-cancel' },
  { id: 'baguio-cancel', due: '2026-11-29', when: 'Nov 29, 2:00 PM', text: 'Last day for free cancellation on the Baguio Airbnb: confirm you are keeping it' },
  { id: 'fill-gaps', due: '2026-12-15', when: 'Before the trip', text: 'Settle open stays: Dec 22 in Manila (after the 12:20 AM landing) and the night of Jan 9', flag: 'arrival-late' },
  { id: 'agno-stay', due: '2026-12-15', when: 'Before the trip', text: 'Decide where you sleep during Agno (Dec 26–27) and any Dec 28 plans', flag: 'agno' },
  { id: 'apps', due: '2026-12-20', when: 'Before Dec 22', text: 'Download Grab and offline Google Maps (Chiang Mai, Bangkok)' },
  { id: 'esim', due: '2026-12-20', when: 'Before Dec 22', text: 'Get a Thailand eSIM or plan to buy a Thai SIM' },
  { id: 'card', due: '2026-12-20', when: 'Before Dec 22', text: 'Have a card with no foreign transaction fees; a universal power adapter; photos or copies of passports and bookings' },
  { id: 'etravel-in', due: '2026-12-19', when: 'Dec 19, before you fly (72 h before the 12:20 AM Dec 22 landing)', text: 'eTravel registration for arriving in the Philippines (each traveler)', link: 'https://etravel.gov.ph' },
  { id: 'paranaque-guests', due: '2026-12-15', when: 'Before the trip', text: 'Parañaque Airbnb: confirm who sleeps there (booked for 5, up to 6 allowed) and update the guest count if you stay the night of Jan 9', flag: 'late-arrival' },
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
  { id: 'ride-dec22', due: '2026-12-18', when: 'Before you leave', text: 'Arrange a ride from NAIA Terminal 3 for the 12:20 AM Dec 22 landing', flag: 'arrival-late' },
];

export const PACKING = [
  { group: 'US legs (Dec 19–20, Jan 11)', items: ['Global Entry card (Jae) and passport', 'Winter coat, hat and gloves for Moline / Chicago (wear it on the plane)', 'Something warm for long flights (15–16 h)', 'Neck pillow, earplugs'] },
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
// status: paid | due (must still be paid; `when` says when/where) | check (unclear from documents)
export const PLANNED = [
  { id: 'dagupan', label: 'Cozy Haven Dagupan Airbnb, Dec 23–29', amount: 226.98, currency: 'USD', status: 'paid', why: 'Airbnb shows "Amount paid $226.98"' },
  { id: 'silom', label: 'Centre Point Plus Silom, 3 nights with breakfast', amount: 455.28, currency: 'USD', status: 'paid', why: 'Expedia: "Collected by Expedia, Total $455.28"' },
  { id: 'paranaque', label: 'Parañaque Airbnb, Jan 2–11, 5 guests (family stay)', amount: 547.10, currency: 'USD', status: 'check', why: 'Airbnb shows "Total cost" with "Manage payment", not "Amount paid". Usually a payment plan with a balance due. Check Airbnb → Trips → Manage payment' },
  { id: 'chillin', label: "Chillin' Guest House, 2 nights", amount: 4400, currency: 'THB', status: 'due', when: 'At check-in, Jan 3 (card + photo ID)' },
  { id: 'silom-deposit', label: 'Centre Point deposit, THB 1,000 × 3 nights', amount: 3000, currency: 'THB', refundable: true, status: 'due', when: 'At check-in, Jan 5 (refundable)' },
  { id: 'enp', label: 'Elephant Nature Park, 2 adults × 3,500', amount: 7000, currency: 'THB', status: 'due', when: 'When you book (not booked yet)' },
  { id: 'cruise', label: 'Opulence dinner cruise, 2 adults × 1,800', amount: 3600, currency: 'THB', status: 'due', when: 'When you book (not booked yet)' },
  { id: 'palace', label: 'Grand Palace, 2 × 500', amount: 1000, currency: 'THB', status: 'due', when: 'At the entrance, Jan 6' },
  { id: 'wat-pho', label: 'Wat Pho, 2 × 200', amount: 400, currency: 'THB', status: 'due', when: 'At the entrance, Jan 6' },
  { id: 'ferry', label: 'Ferry to Wat Arun, 2 × ~4', amount: 8, currency: 'THB', status: 'due', when: 'On the day, Jan 6 (coins)' },
  { id: 'lounge', label: 'Blue Ribbon lounge, 2 × ~950 (optional add-on)', amount: 1900, currency: 'THB', optional: true, status: 'due', when: 'Only if you add it' },
];
export const BUDGET_NOTES = 'Status comes from your booking documents; tick Paid when something changes. Not counted because the price isn’t in your notes: the three flights (confirmed, normally paid at booking), the Baguio Airbnb (payment status unknown), the airport pickup surcharge and the Wat Arun entry fee. Add them below as expenses.';

export const GUIDE = [
  { title: 'Global Entry (US re-entry at Dallas, Jan 11)', items: ['Use the Global Entry lane or touchless portal at DFW with your passport; Global Entry covers only its own member.', 'Add your Known Traveler Number (from your Global Entry account) to the airline booking so TSA PreCheck prints on US departures.', 'A companion without Global Entry can use the free Mobile Passport Control app at DFW.', 'Keep your KTN in Private details rather than on this page.'] },
  { title: 'Entry & documents (Thailand)', items: ['Passports valid at least 6 months past entry.', 'Carry onward/return flight proof, hotel bookings, and a card or some cash. Immigration can ask.', 'At Don Mueang on Jan 3, go straight to immigration with the TDAC done ahead.', 'Ask at MNL check-in whether bags are tagged through to Chiang Mai. If not, collect and re-check at Terminal 2.'] },
  { title: 'Money, phone, power', items: ['Pay in baht. Decline if a card terminal or ATM offers to charge in your home currency.', 'ATMs charge a fee per withdrawal: take out larger amounts less often.', 'Carry small bills and coins for night markets, songthaews, temples and street food.', 'Use a card with no foreign transaction fees.', '220V, mixed plugs: bring a universal adapter.', 'Tipping isn’t expected; rounding up or 20–50 THB for good service is fine.'] },
  { title: 'Getting around', items: ['Grab works in both cities and avoids haggling.', 'Chiang Mai Old City is walkable. Agree the price before getting in a red songthaew.', 'Bangkok: BTS and MRT for long hops. From Silom, the river boat from Sathorn Pier reaches the Grand Palace and Wat Pho area.', 'ICONSIAM: BTS Gold Line or the free shuttle boat from Sathorn Pier (verify the current schedule).', 'Taxis: insist on the meter. Avoid renting scooters.'] },
  { title: 'Food to try', items: ['Chiang Mai: khao soi (Khao Soi Khun Yai, Khao Soi Lam Duan Fah Ham), sai oua sausage, nam prik ong, Warorot Market snacks, Sunday Walking Street stalls, Ristr8to coffee.', 'Bangkok: Yaowarat Chinatown crawl (roasted duck, noodles, seafood, mango sticky rice), Thai milk tea, boat noodles, Silom street food.', 'Pangasinan: Dagupan bangus, pigar-pigar, Calasiao puto.', 'Baguio: strawberry taho, ube jam, Session Road cafes, Night Market street food.', 'Pick busy stalls, drink bottled water, ask the price before ordering seafood in Chinatown.'] },
  { title: 'What to avoid', items: ['"The Grand Palace is closed today" scam: ignore it and walk to the entrance.', 'Tuk-tuk detours to gem shops and tailors, "50 baht tours", taxis that refuse the meter.', 'Gem shops and "special government promotion" offers.', 'Bird-food and "free" photo stunts that ask for money after.', 'Elephant riding, shows and painting. The waterfall tour’s "elephant cafe" is only a short, optional feeding stop.', 'Vapes and e-cigarettes are illegal. Skip cannabis shops; rules shift.', 'Chiang Mai burning season usually worsens from mid/late January: check the AQI the day before and pack a mask.'] },
  { title: 'Temple rules', items: ['Cover shoulders and knees; no see-through or tight leggings. Bring a light scarf or sarong.', 'Remove shoes before entering buildings.', 'Don’t touch heads, don’t point feet at Buddha images, be respectful around monks.', 'Be respectful of the Thai royal family. Disrespect is a crime.'] },
  { title: 'Peak season', items: ['Baguio Dec 29 – Jan 1: heavy traffic, book dinners ahead, leave early on Jan 1.', 'Chiang Mai and Bangkok are busy late Dec to early Jan: book the cruise and elephant park early; expect long Grand Palace lines.'] },
  { title: 'Open questions', items: ['Hotels: Chicago (Dec 19) and Hong Kong (Jan 10).', 'Where you sleep Dec 22 after the 12:20 AM landing, during Agno (Dec 26–27), and the night of Jan 9. (The Parañaque Airbnb is booked for 5 and allows 6.)', 'Dec 28 and Jan 10 daytime plans.', 'The US flights are booked for Jae and Janelle; the Thailand flights for Jae and Jannica. Is Jannica flying to Manila separately?', 'Optional: private Sticky Waterfall and Land of Angels tour, Capybara Coffee Chiang Mai. No free day assigned yet.'] },
];
