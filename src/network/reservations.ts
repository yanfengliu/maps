/** Compatibility export: reservation and signal compounds now share route-aware admission and clearance. */
export { JunctionAdmissions as JunctionReservations, STOP_DWELL_SECONDS } from "./admissions.ts";
export type { AdmissionRequest as ReservationRequest, AdmissionSnapshot as ReservationLease, ActorFootprint } from "./admissions.ts";
