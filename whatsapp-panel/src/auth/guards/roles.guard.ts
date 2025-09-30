// roles.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException, // <-- cambio
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si el rol del usuario no está en los roles requeridos, lanzamos excepción
    if (!requiredRoles.includes(user.role)) {
      throw new UnauthorizedException('No tienes acceso con tu rol actual');
    }
    return true;
  }
}
