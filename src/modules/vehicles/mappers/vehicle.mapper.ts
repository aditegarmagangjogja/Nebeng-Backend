export class VehicleMapper {
  static toResponse(vehicle: any) {
    if (!vehicle) return null;

    return {
      id: vehicle.id ? vehicle.id.toString() : null,
      userId: vehicle.userId ? vehicle.userId.toString() : null,
      type: vehicle.type,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      capacitySeats: Number(vehicle.capacitySeats),
      maxWeightCapacityKg: Number(vehicle.maxWeightCapacityKg),
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  static toResponseList(vehicles: any[]) {
    return vehicles.map((v) => this.toResponse(v));
  }
}
