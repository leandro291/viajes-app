export type TodayDepartureRow = {
  id: string;
  packageTitle: string;
  startsAt: Date;
  capacity: number;
  bookedSeats: number;
  // Excluye "cancelled": si departure_status suma un valor, tsc avisa en el servicio.
  status: "scheduled" | "en_route" | "completed";
};

export type TodayDeparturesDto = {
  departuresCount: number;
  travelersCount: number;
  items: TodayDepartureRow[];
};
