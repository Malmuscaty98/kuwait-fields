export type FieldSize = '5v5' | '7v7' | '11v11';
export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';

export interface Field {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  locationAr: string;
  pricePerHour: number;
  size: FieldSize;
  description: string;
  features: string[];
  gradient: string;
}

export interface Slot {
  id: string;
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  bookingId?: string;
}

export interface Booking {
  id: string;
  ref: string;
  fieldId: string;
  slotId: string;
  customerName: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
}

export interface BookingWithDetails extends Booking {
  field: Field;
  slot: Slot;
}
