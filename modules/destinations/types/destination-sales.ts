export type DestinationSalesRow = {
  id: string;
  slug: string;
  name: string;
  bookingsCount: number;
  revenueCents: number;
};

export type TopDestinationDto = DestinationSalesRow;
