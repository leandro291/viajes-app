export { getDestinations } from "./services/destination-service";
export { getDestinationBySlug } from "./services/destination-detail-service";
export { getDestinationPage } from "./services/destination-page-service";
export { DestinationPage, generateDestinationMetadata } from "./components/destination-page";
export type {
  DestinationDto,
  DestinationDetailDto,
  DestinationPageDto,
  SightDto,
  FaqDto,
  ClimateMonthDto,
  Season,
} from "./types/destination";
export { getTopDestinations } from "./services/destination-sales-service";
export type { TopDestinationDto } from "./types/destination-sales";
