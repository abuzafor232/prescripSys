import {
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, Prisma, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string | string[];
};

const userInclude = Prisma.validator<Prisma.UserInclude>()({
  doctor: { select: { id: true } },
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } }
        }
      }
    }
  }
});

type LoadedUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.findUserForLogin(dto.email.toLowerCase());
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.issueTokens(user, meta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.LOGIN,
        entityType: "user",
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: this.asString(meta.userAgent)
      }
    });

    return {
      user: this.toPublicUser(user),
      ...tokens
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenantId: string;
        sessionId: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET")
      });

      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId }
      });

      if (
        !session ||
        session.revokedAt ||
        session.expiresAt < new Date() ||
        session.refreshTokenHash !== this.hashToken(refreshToken)
      ) {
        throw new ForbiddenException("Refresh token is no longer valid");
      }

      const user = await this.findUserForLoginById(payload.sub);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException("User is no longer active");
      }

      const accessToken = await this.signAccessToken(user);
      return { accessToken };
    } catch {
      throw new ForbiddenException("Refresh token is no longer valid");
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sessionId: string }>(
        refreshToken,
        { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET") }
      );
      await this.prisma.session.updateMany({
        where: {
          id: payload.sessionId,
          refreshTokenHash: this.hashToken(refreshToken),
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    } catch {
      // Logout should be idempotent from the client perspective.
    }

    return { ok: true };
  }

  private async issueTokens(user: LoadedUser, meta: RequestMeta) {
    const sessionId = randomBytes(16).toString("hex");
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, tenantId: user.tenantId, sessionId },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "30d")
      }
    );

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await this.prisma.session.create({
      data: {
        id: sessionId,
        tenantId: user.tenantId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: this.asString(meta.userAgent)
      }
    });

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken
    };
  }

  private async signAccessToken(user: LoadedUser) {
    return this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map(
              (rolePermission) => rolePermission.permission.name
            )
          )
        )
      ],
      doctorId: user.doctor?.id
    });
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private toPublicUser(user: LoadedUser) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map(
              (rolePermission) => rolePermission.permission.name
            )
          )
        )
      ],
      doctorId: user.doctor?.id
    };
  }

  private asString(value?: string | string[]) {
    return Array.isArray(value) ? value.join(", ") : value;
  }

  private findUserForLogin(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: userInclude
    });
  }

  private findUserForLoginById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude
    });
  }
}
