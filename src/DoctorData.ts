export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  branchId: string;
  days: string;
}

export const doctors: Doctor[] = [
  { id: 'd1', name: 'Dr. Maria Santos', specialty: 'General Medicine', branchId: 'calamba', days: 'Mon, Wed, Fri' },
  { id: 'd2', name: 'Dr. Jose Reyes', specialty: 'Internal Medicine', branchId: 'calamba', days: 'Tue, Thu' },
  { id: 'd3', name: 'Dr. Ana Cruz', specialty: 'General Medicine', branchId: 'alaminos', days: 'Mon to Sat' },
  { id: 'd4', name: 'Dr. Paolo Garcia', specialty: 'Family Medicine', branchId: 'gma-cavite', days: 'Mon, Thu, Fri' },
  { id: 'd5', name: 'Dr. Liza Mendoza', specialty: 'Pediatrics', branchId: 'quezon-city', days: 'Mon to Fri' },
  { id: 'd6', name: 'Dr. Carlo Bautista', specialty: 'General Medicine', branchId: 'quezon-city', days: 'Mon, Wed' },
  { id: 'd7', name: 'Dr. Rina Flores', specialty: 'Animal Bite Care', branchId: 'malabon', days: 'Weekdays' },
  { id: 'd8', name: 'Dr. Miguel Torres', specialty: 'Vaccination and Wound Care', branchId: 'caloocan', days: 'Tue to Sun' }
];