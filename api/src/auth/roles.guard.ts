import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => {
  const decorator = (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata('roles', roles, descriptor?.value || target);
    return descriptor || target;
  };
  return decorator;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;
    if (user.role === 'master') return true;
    if (roles.includes(user.role)) return true;

    if (user.role === 'supervisor' && roles.includes('admin')) {
      return this.checkSupervisorPermission(user, request.method);
    }

    return false;
  }

  private checkSupervisorPermission(user: any, method: string): boolean {
    if (user.pode_editar && (method === 'PATCH' || method === 'POST')) return true;
    if (user.pode_excluir && method === 'DELETE') return true;
    return false;
  }
}
