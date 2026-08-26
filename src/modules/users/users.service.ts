import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserMapper } from './mappers/user.mapper';
import { UserStatus } from '../../generated/prisma/enums';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const exsistingEmail = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (exsistingEmail) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const exsistingPhone = await this.userRepository.findByPhone(
      createUserDto.phone,
    );

    if (exsistingPhone) {
      throw new ConflictException('Nomor telepon sudah terdaftar');
    }

    if (createUserDto.regionId) {
      const region = await this.userRepository.findRegionById(
        createUserDto.regionId,
      );
      if (!region) {
        throw new NotFoundException(
          `Region dengan ID ${createUserDto.regionId} tidak ditemukan`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: hashedPassword,
      role: createUserDto.role,
      status: createUserDto.status,
      region: createUserDto.regionId
        ? { connect: { id: BigInt(createUserDto.regionId) } }
        : undefined,
    });

    return UserMapper.toResponse(newUser);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return UserMapper.toResponseList(users);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }
    return UserMapper.toResponse(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    await this.findOne(id);

    let hashedPassword: string | undefined = undefined;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updateUser = await this.userRepository.update(id, {
      name: updateUserDto.name,
      email: updateUserDto.email,
      phone: updateUserDto.phone,
      password: hashedPassword,
      role: updateUserDto.role,
      status: updateUserDto.status,
      region: updateUserDto.regionId
        ? { connect: { id: BigInt(updateUserDto.regionId) } }
        : undefined,
    });

    return UserMapper.toResponse(updateUser);
  }

  async setPin(userId: string, pin: string): Promise<{ message: string }> {
    const hashedPin = await bcrypt.hash(pin, 10);
    await this.userRepository.updatePin(userId, hashedPin);
    return { message: 'PIN keamanan berhasil diperbarui' };
  }

  async verifyPin(userId: string, pin: string): Promise<{ valid: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.pinHash) {
      throw new NotFoundException('PIN belum diatur untuk akun ini');
    }

    const isValid = await bcrypt.compare(pin, user.pinHash);
    if (!isValid) {
      throw new BadRequestException('PIN yang dimasukkan salah');
    }

    return { valid: true };
  }

  async updateStatus(
    id: string,
    updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    await this.findOne(id);
    const updatedUser = await this.userRepository.update(id, {
      status: updateUserStatusDto.status,
    });
    return UserMapper.toResponse(updatedUser);
  }

  // Soft Delete & Anonisasi Akun (Default untuk User Hapus Akun Mandiri)
  async remove(id: string): Promise<UserResponseDto> {
    await this.findOne(id);

    const anonymousId = `deleted_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const anonymizedUser = await this.userRepository.anonymize(id, anonymousId);

    return UserMapper.toResponse(anonymizedUser);
  }

  // Hard Delete Guard (Hanya menghapus fisik jika belum ada transaksi)
  async forceRemoveByAdmin(
    id: string,
  ): Promise<UserResponseDto | { message: string }> {
    await this.findOne(id);

    const { ordersCount, tripsCount, walletTransactionsCount } =
      await this.userRepository.countUserRelations(id);

    const hasFinancialHistory =
      ordersCount > 0 || tripsCount > 0 || walletTransactionsCount > 0;

    if (hasFinancialHistory) {
      // Jika ada riwayat transaksi, alihkan ke Soft Delete Anonisasi
      const anonymizedUser = await this.remove(id);
      return anonymizedUser;
    }

    // Jika akun benar-benar baru dan belum pernah bertransaksi, aman untuk Hard Delete
    const deletedUser = await this.userRepository.delete(id);
    return UserMapper.toResponse(deletedUser);
  }
}
