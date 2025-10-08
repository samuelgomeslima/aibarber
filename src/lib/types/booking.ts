export type DbBooking = {
  id: string;
  date: string;
  start: string;
  end: string;
  service_id: string;
  barber: string;
  customer_id?: string | null;
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
};
