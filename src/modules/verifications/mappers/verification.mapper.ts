export class VerificationMapper {
  static toResponse(verification: any) {
    if (!verification) return null;

    return {
      id: verification.id.toString(),
      userId: verification.userId.toString(),
      approvedByUserId: verification.approvedByUserId
        ? verification.approvedByUserId.toString()
        : null,
      type: verification.type,
      status: verification.status,
      rejectionReason: verification.rejectionReason,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      files: verification.files
        ? verification.files.map((file: any) => ({
            id: file.id.toString(),
            verificationId: file.verificationId.toString(),
            filePath: file.filePath,
            fileType: file.fileType,
            createdAt: file.createdAt,
          }))
        : [],
      user: verification.user
        ? {
            id: verification.user.id.toString(),
            name: verification.user.name,
            email: verification.user.email,
            phone: verification.user.phone,
            statusVerification: verification.user.statusVerification,
            // TAMBAHKAN BARIS INI AGAR REGIONID TERSEDIA PADA OBJEK USER MAPPING
            regionId: verification.user.regionId
              ? verification.user.regionId.toString()
              : null,
            profile: verification.user.profile
              ? {
                  ktpNumber: verification.user.profile.ktpNumber,
                  fullNameKtp: verification.user.profile.fullNameKtp,
                  addressKtp: verification.user.profile.addressKtp,
                  faceImageUrl: verification.user.profile.faceImageUrl,
                  bankName: verification.user.profile.bankName,
                  bankAccountNumber:
                    verification.user.profile.bankAccountNumber,
                  bankAccountHolder:
                    verification.user.profile.bankAccountHolder,
                }
              : null,
            vehicles: verification.user.vehicles
              ? verification.user.vehicles.map((v: any) => ({
                  id: v.id.toString(),
                  type: v.type,
                  model: v.model,
                  plateNumber: v.plateNumber,
                  color: v.color,
                }))
              : [],
          }
        : undefined,
    };
  }
}
