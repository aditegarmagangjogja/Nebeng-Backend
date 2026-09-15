import { VehicleMapper } from '../../vehicles/mappers/vehicle.mapper';

export class TripMapper {
  static toResponse(trip: any) {
    if (!trip) return null;

    return {
      id: trip.id.toString(),
      mitraId: trip.mitraId ? trip.mitraId.toString() : null,
      vehicleId: trip.vehicleId ? trip.vehicleId.toString() : null,
      originPointId: trip.originPointId ? trip.originPointId.toString() : null,
      destinationPointId: trip.destinationPointId
        ? trip.destinationPointId.toString()
        : null,
      vehicleType: trip.vehicleType,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      price: Number(trip.price),
      seatTotal: Number(trip.seatTotal),
      seatAvailable: Number(trip.seatAvailable),
      maxWeightCapacityKg: Number(trip.maxWeightCapacityKg),
      remainingWeightCapacityKg: Number(trip.remainingWeightCapacityKg),
      qrCodeTrip: trip.qrCodeTrip,
      status: trip.status,
      mapsPolyline: trip.mapsPolyline ?? null,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      // Relasi opsional
      mitra: trip.mitra
        ? {
            id: trip.mitra.id.toString(),
            name: trip.mitra.name,
            phone: trip.mitra.phone,
            avatar: trip.mitra.avatar ?? null,
          }
        : undefined,
      vehicle: trip.vehicle
        ? VehicleMapper.toResponse(trip.vehicle)
        : undefined,
      originPoint: trip.originPoint
        ? {
            id: trip.originPoint.id.toString(),
            name: trip.originPoint.name,
            qrCodePos: trip.originPoint.qrCodePos,
            address: trip.originPoint.address,
          }
        : undefined,
      destinationPoint: trip.destinationPoint
        ? {
            id: trip.destinationPoint.id.toString(),
            name: trip.destinationPoint.name,
            qrCodePos: trip.destinationPoint.qrCodePos,
            address: trip.destinationPoint.address,
          }
        : undefined,
      serviceType: trip.serviceType,
    };
  }

  static toResponseList(trips: any[]): any[] {
    if (!Array.isArray(trips)) return [];
    return trips.map((t) => this.toResponse(t));
  }
}
