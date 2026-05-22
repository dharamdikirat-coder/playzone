import { pgTable, text, timestamp, integer, numeric, serial, boolean, date, primaryKey, jsonb } from 'drizzle-orm/pg-core';

// 1. Business Profile
export const businessProfile = pgTable('business_profile', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().default('FunkyLand'),
  subName: text('sub_name').default(''),
  unitName: text('unit_name').default(''),
  address: text('address').default(''),
  gstNo: text('gst_no').default(''),
  mobile: text('mobile').default(''),
  email: text('email').default(''),
  logo: text('logo').default(''),
  accountingYearStart: text('accounting_year_start').default('01-04'),
  gracePeriodMinutes: integer('grace_period_minutes').default(10),
  overtimeRatePerMinute: numeric('overtime_rate_per_minute').default('2'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Staff
export const staff = pgTable('staff', {
  id: text('id').primaryKey(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').default('Cashier'),
  phone: text('phone'),
  status: text('status').default('active'),
  joinedDate: timestamp('joined_date').defaultNow(),
});

// 3. Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
});

// 4. Plans
export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  price: numeric('price').notNull(),
  type: text('type').default('Hourly'),
  validationDays: integer('validation_days').default(0),
  validationTimeMin: integer('validation_time_min').default(60),
  description: text('description'),
  gstSlab: integer('gst_slab').default(18),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Members
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  parentName: text('parent_name').notNull(),
  mobileNumber: text('mobile_number').notNull(),
  childName: text('child_name'),
  childAge: integer('child_age'),
  planId: text('plan_id').references(() => plans.id),
  medicalNotes: text('medical_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});


// 6. Services
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  price: numeric('price').default('0'),
  gstSlab: integer('gst_slab').default(18),
});

// 7. Catalogue
export const catalogue = pgTable('catalogue', {
  id: serial('id').primaryKey(),
  designName: text('design_name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  imageUrl: text('image_url'),
  estimatePrice: numeric('estimate_price').default('0'),
  description: text('description'),
});

// 8. Socks Types
export const socksTypes = pgTable('socks_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price').notNull(),
  gstSlab: integer('gst_slab').default(5),
});

// 9. Billings (Entries)
export const billings = pgTable('billings', {
  id: serial('id').primaryKey(),
  customerId: text('customer_id').references(() => members.id),
  customerName: text('customer_name'),
  handledBy: text('handled_by').references(() => staff.id),
  mobileNo: text('mobile_no'),
  planId: text('plan_id').references(() => plans.id),
  durationMin: integer('duration_min'),
  personCount: integer('person_count').default(1),
  socksCounts: jsonb('socks_counts').default({}),
  items: jsonb('items').default([]),
  subtotal: numeric('subtotal').notNull(),
  totalGst: numeric('total_gst').notNull(),
  payable: numeric('payable').notNull(),
  paymentMode: text('payment_mode'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Events
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  customerId: text('customer_id').references(() => members.id),
  customerName: text('customer_name'),
  mobileNumber: text('phone_number'),
  bookingCharges: numeric('booking_charges').default('0'),
  grandTotal: numeric('grand_total').default('0'),
  gstPercent: integer('gst_percent').default(18),
  advanceAmount: numeric('advance_amount').default('0'),
  paymentMode: text('payment_mode'),
  paymentStatus: text('payment_status').default('Pending'),
  bookingDate: date('booking_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});


// 11. Expenses
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  amount: numeric('amount').notNull(),
  description: text('description'),
  vendorName: text('vendor_name'),
  date: timestamp('date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. Play Entries (Active sessions - Not in provided SQL but needed for app logic)
export const playEntries = pgTable('play_entries', {
  id: text('id').primaryKey(),
  childName: text('child_name').notNull(),
  parentName: text('parent_name'),
  mobileNumber: text('mobile_number'),
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  planId: text('plan_id').references(() => plans.id),
  planName: text('plan_name'),
  amount: numeric('amount').default('0'),
  status: text('status').default('active'),
  memberId: text('member_id').references(() => members.id),
  personCount: integer('person_count').default(1),
  socksCounts: jsonb('socks_counts').default({}),
  invoiceId: text('invoice_id'),
  overtimeAmount: numeric('overtime_amount').default('0'),
  staffId: text('staff_id').references(() => staff.id),
  handledBy: text('handled_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. System Settings
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 14. Event Services Mapping
export const eventServices = pgTable('event_services', {
  eventId: text('event_id').notNull().references(() => events.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.serviceId] }),
}));

// 15. Historical Data V1
export const walkInCustomers = pgTable('walk_in_customers', {
  id: serial('id').primaryKey(),
  billNo: text('billno'),
  cid: text('cid'),
  mode: text('mode'),
  grandTotal: numeric('grandtotal'),
  subTotal: numeric('subtotal'),
  payableAmount: numeric('paybleamount'),
  discount: numeric('discount'),
  planAmount: numeric('planamount'),
  socksPrice: numeric('shokesprice'),
  extraAmount: numeric('extraamount'),
  noOfPerson: integer('noofperson'),
  insDate: timestamp('insdate'),
});

// 16. Historical Data V2
export const walkInMembers = pgTable('walk_in_members', {
  id: serial('id').primaryKey(),
  memberId: text('memberid'),
  name: text('name'),
  mno: text('mno'),
  gender: text('gender'),
  age: text('age'),
  date: text('date'),
  status: text('status'),
  planId: text('planid'),
  socksPrice: numeric('shokesprice'),
  validationDate: text('validationdate'),
});

