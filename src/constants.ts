
import { PlayPlan } from './types';

export const COLORS = {
  primary: '#FF6F61', // Fun Coral
  secondary: '#6C5CE7', // Playful Purple
  accent: '#00CEC9', // Bright Aqua
  background: '#FFF8F0',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
};

export const GST_RATES = [0, 5, 12, 18];

export const PLANS: PlayPlan[] = [
  // Weekday Plans
  { id: 'wd-30', title: 'Weekday - 30 Min (Kids < 3y)', validationTimeMin: 30, validationDays: 0, price: 300, gstSlab: 18, type: 'hourly' },
  { id: 'wd-1h', title: 'Weekday - 1 Hour', validationTimeMin: 60, validationDays: 0, price: 450, gstSlab: 18, type: 'hourly' },
  { id: 'wd-1.5h', title: 'Weekday - 1.5 Hour', validationTimeMin: 90, validationDays: 0, price: 550, gstSlab: 18, type: 'hourly' },
  { id: 'wd-2h', title: 'Weekday - 2 Hour (+Coke/Fries)', validationTimeMin: 120, validationDays: 0, price: 700, gstSlab: 18, type: 'hourly' },
  { id: 'wd-3h', title: 'Weekday - 3 Hour (+Coke/Fries)', validationTimeMin: 180, validationDays: 0, price: 900, gstSlab: 18, type: 'hourly' },

  // Weekend Plans
  { id: 'we-30', title: 'Weekend - 30 Min (Kids < 3y)', validationTimeMin: 30, validationDays: 0, price: 400, gstSlab: 18, type: 'hourly' },
  { id: 'we-1h', title: 'Weekend - 1 Hour', validationTimeMin: 60, validationDays: 0, price: 550, gstSlab: 18, type: 'hourly' },
  { id: 'we-1.5h', title: 'Weekend - 1.5 Hour', validationTimeMin: 90, validationDays: 0, price: 650, gstSlab: 18, type: 'hourly' },
  { id: 'we-2h', title: 'Weekend - 2 Hour (+Coke/Fries)', validationTimeMin: 120, validationDays: 0, price: 800, gstSlab: 18, type: 'hourly' },
  { id: 'we-3h', title: 'Weekend - 3 Hour (+Coke/Fries)', validationTimeMin: 180, validationDays: 0, price: 1000, gstSlab: 18, type: 'hourly' },

  // Superstar Packages (Monthly)
  { id: 'ss-wd', title: 'Superstar Weekdays (Mon-Thu)', validationTimeMin: 120, validationDays: 30, price: 3900, gstSlab: 18, type: 'monthly', description: '2 Hours session (11am-8pm)' },
  { id: 'ss-we', title: 'Superstar Weekends (Fri-Sun/Hols)', validationTimeMin: 120, validationDays: 30, price: 3900, gstSlab: 18, type: 'monthly', description: '2 Hours session (11am-8pm)' },
  { id: 'ss-any', title: 'Superstar Any Day Any Time', validationTimeMin: 120, validationDays: 30, price: 4900, gstSlab: 18, type: 'monthly', description: '2 Hours session (11am-8pm)' },
];

export const APP_NAME = 'KIDS MANAGEMENT FUN ZONE';
export const BUSINESS_DETAILS = {
  NAME: 'Kids Fun Zone',
  SUB_NAME: 'Zone Management System',
  UNIT_NAME: 'Digital Communique Private Limited',
  ADDRESS: '2nd Floor, Plot 17, Sector-6, Channi Himmat, Jammu, J&K',
  GST_NO: '01AF1FS7527R1ZD',
  MOBILE: '9596913030, 9796220727',
  EMAIL: 'funky@funky-land.com'
};
export const FOOTER_TEXT = '© 2024 Digital Communique Private Limited';

export const GST_LOGIC = {
  SERVICES: 18,
  FOOD: 5,
  PRODUCTS: 12,
};
