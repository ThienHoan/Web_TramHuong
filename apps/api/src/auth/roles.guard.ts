import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();

    if (!user || !user.role) return false;

    // Admin has access to everything usually, but strict RBAC might require explicit check.
    // Let's assume ADMIN is a superuser or included in requiredRoles.
    // If requiredRoles includes User's role, pass.

    // Also handle granular staff roles if they map to base 'STAFF' requirement?
    // Requirement said: "GET /orders -> @Roles(Role.ADMIN, Role.STAFF)"

    return requiredRoles.some((role) => user.role === role);
  }
}
