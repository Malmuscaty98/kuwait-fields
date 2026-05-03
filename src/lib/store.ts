import type { Field, Slot, Booking, BookingStatus } from './types';

const FIELDS: Field[] = [
  {
    id: 'f1',
    name: 'Qadisiyah Sports Field',
    nameAr: 'ملعب نادي القادسية',
    location: 'Hawalli, Kuwait',
    locationAr: 'حولي، الكويت',
    pricePerHour: 8,
    size: '5v5',
    description: 'ملعب مضاء بالكامل مع عشب اصطناعي عالي الجودة وتسهيلات حديثة.',
    features: ['إضاءة ليلية', 'عشب اصطناعي', 'غرف تبديل', 'موقف سيارات'],
    gradient: 'from-green-800 to-green-600',
  },
  {
    id: 'f2',
    name: 'Salmiya Sports Complex',
    nameAr: 'المجمع الرياضي السالمية',
    location: 'Salmiya, Kuwait',
    locationAr: 'السالمية، الكويت',
    pricePerHour: 12,
    size: '7v7',
    description: 'مجمع رياضي متكامل مع ملاعب متعددة ومرافق درجة أولى.',
    features: ['ملاعب متعددة', 'كافيتيريا', 'معدات تأجير', 'مدرب متاح'],
    gradient: 'from-emerald-700 to-teal-500',
  },
  {
    id: 'f3',
    name: 'Fahaheel Sports Arena',
    nameAr: 'ملعب الفحيحيل الرياضي',
    location: 'Fahaheel, Ahmadi',
    locationAr: 'الفحيحيل، الأحمدي',
    pricePerHour: 20,
    size: '11v11',
    description: 'ملعب كرة قدم بمقاس دولي كامل مناسب للدوريات والفعاليات الكبرى.',
    features: ['مقياس دولي', 'مدرجات للجماهير', 'غرف تغيير VIP', 'نظام صوتي'],
    gradient: 'from-green-700 to-lime-500',
  },
];

function generateSlots(fields: Field[]): Slot[] {
  const result: Slot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < 7; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);
    const dateStr = day.toISOString().split('T')[0];

    for (const f of fields) {
      for (let h = 7; h < 23; h++) {
        const start = `${String(h).padStart(2, '0')}:00`;
        const end = `${String(h + 1).padStart(2, '0')}:00`;
        result.push({
          id: `slot-${f.id}-${dateStr}-${h}`,
          fieldId: f.id,
          date: dateStr,
          startTime: start,
          endTime: end,
          isOpen: true,
        });
      }
    }
  }
  return result;
}

function randomRef() {
  return 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initData() {
  const fields = FIELDS;
  const slots = generateSlots(fields);
  const bookings: Booking[] = [];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Pre-create a few sample bookings
  const sampleBookings: Array<{ fieldId: string; hour: number; name: string; phone: string; status: BookingStatus; dayOffset: number }> = [
    { fieldId: 'f1', hour: 9, name: 'أحمد الكندري', phone: '96512345678', status: 'confirmed', dayOffset: 0 },
    { fieldId: 'f1', hour: 11, name: 'فهد العتيبي', phone: '96598765432', status: 'pending', dayOffset: 0 },
    { fieldId: 'f2', hour: 10, name: 'محمد الرشيدي', phone: '96565432198', status: 'confirmed', dayOffset: 0 },
    { fieldId: 'f3', hour: 15, name: 'خالد المطيري', phone: '96550123456', status: 'done', dayOffset: -1 },
    { fieldId: 'f1', hour: 18, name: 'عبدالله الأنصاري', phone: '96555987654', status: 'cancelled', dayOffset: -1 },
    { fieldId: 'f2', hour: 14, name: 'سعد الحربي', phone: '96566112233', status: 'pending', dayOffset: 1 },
  ];

  for (const sb of sampleBookings) {
    const d = new Date(today);
    d.setDate(today.getDate() + sb.dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const slotId = `slot-${sb.fieldId}-${dateStr}-${sb.hour}`;
    const slot = slots.find(s => s.id === slotId);
    if (!slot) continue;
    const id = `booking-${bookings.length + 1}`;
    const ref = randomRef();
    bookings.push({
      id,
      ref,
      fieldId: sb.fieldId,
      slotId,
      customerName: sb.name,
      phone: sb.phone,
      status: sb.status,
      createdAt: new Date().toISOString(),
    });
    slot.isOpen = sb.status !== 'cancelled';
    if (sb.status !== 'cancelled') {
      slot.bookingId = id;
    }
  }

  return { fields, slots, bookings };
}

declare global {
  // eslint-disable-next-line no-var
  var __store: ReturnType<typeof initData> | undefined;
}

if (!global.__store) {
  global.__store = initData();
}

const store = global.__store;

// --- Field helpers ---
export function getFields() {
  return store.fields;
}

export function getFieldById(id: string) {
  return store.fields.find(f => f.id === id) ?? null;
}

// --- Slot helpers ---
export function getSlots(fieldId?: string, date?: string) {
  return store.slots.filter(s =>
    (!fieldId || s.fieldId === fieldId) &&
    (!date || s.date === date)
  );
}

export function getSlotById(id: string) {
  return store.slots.find(s => s.id === id) ?? null;
}

export function updateSlot(id: string, patch: Partial<Slot>) {
  const slot = store.slots.find(s => s.id === id);
  if (!slot) return null;
  Object.assign(slot, patch);
  return slot;
}

// --- Booking helpers ---
export function getBookings(date?: string, status?: BookingStatus) {
  return store.bookings.filter(b =>
    (!status || b.status === status) &&
    (!date || (() => {
      const slot = store.slots.find(s => s.id === b.slotId);
      return slot?.date === date;
    })())
  );
}

export function getBookingById(id: string) {
  return store.bookings.find(b => b.id === id) ?? null;
}

export function getBookingByRef(ref: string) {
  return store.bookings.find(b => b.ref === ref) ?? null;
}

export function createBooking(data: Omit<Booking, 'id' | 'ref' | 'createdAt' | 'status'>) {
  const slot = store.slots.find(s => s.id === data.slotId);
  if (!slot || !slot.isOpen || slot.bookingId) return null;

  const id = `booking-${Date.now()}`;
  const ref = randomRef();
  const booking: Booking = {
    id,
    ref,
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.bookings.push(booking);
  slot.bookingId = id;
  return booking;
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  const booking = store.bookings.find(b => b.id === id);
  if (!booking) return null;
  booking.status = status;
  if (status === 'cancelled') {
    const slot = store.slots.find(s => s.id === booking.slotId);
    if (slot) {
      slot.bookingId = undefined;
    }
  }
  return booking;
}

export function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const todaySlots = store.slots.filter(s => s.date === today);
  const todayBookings = store.bookings.filter(b => {
    const slot = store.slots.find(s => s.id === b.slotId);
    return slot?.date === today;
  });
  const revenue = todayBookings
    .filter(b => b.status === 'confirmed' || b.status === 'done')
    .reduce((sum, b) => {
      const field = store.fields.find(f => f.id === b.fieldId);
      return sum + (field?.pricePerHour ?? 0);
    }, 0);
  return {
    totalBookings: todayBookings.length,
    confirmedBookings: todayBookings.filter(b => b.status === 'confirmed').length,
    openSlots: todaySlots.filter(s => s.isOpen && !s.bookingId).length,
    revenue,
  };
}
