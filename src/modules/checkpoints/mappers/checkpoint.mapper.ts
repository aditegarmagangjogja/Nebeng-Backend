export class CheckpointMapper {
  static toResponse(log: any) {
    if (!log) return null;

    return {
      id: log.id.toString(),
      tripId: log.tripId ? log.tripId.toString() : null,
      orderId: log.orderId ? log.orderId.toString() : null,
      posId: log.posId ? log.posId.toString() : null,
      scannedByUserId: log.scannedByUserId
        ? log.scannedByUserId.toString()
        : null,
      ScanType: log.scanType,
      createdAt: log.createdAt,
      trip: log.trip
        ? {
            id: log.trip.id.toString(),
            qrCodeTrip: log.trip.qrCodeTrip,
            status: log.trip.status,
          }
        : undefined,
      order: log.order
        ? {
            id: log.order.id.toString(),
            qrCodeTicket: log.order.qrCodeTicket,
            status: log.order.status,
            escrowStatus: log.order.escrowStatus,
          }
        : undefined,
      pos: log.pos
        ? {
            id: log.pos.id.toString(),
            name: log.pos.name,
            qrCodePos: log.pos.qrCodePos,
          }
        : undefined,
    };
  }

  static toResponseList(logs: any[]) {
    return logs.map((l) => this.toResponse(l));
  }
}
