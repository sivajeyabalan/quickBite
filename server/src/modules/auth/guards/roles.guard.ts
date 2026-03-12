import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from '@prisma/client'
import { ROLES_KEY } from "../decorators/roles.decorators";



@Injectable()
export class RolesGuard implements CanActivate {
    constructor( private reflector : Reflector){}

    canActivate(context: ExecutionContext){
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            ROLES_KEY,[
                context.getHandler(),
                context.getClass(),
            ]
        );

        if(!requiredRoles) return true ;

        const {user} = context.switchToHttp().getRequest();
        const hasRole = requiredRoles.includes(user?.role);

        if (!hasRole) throw new ForbiddenException("Insufficent permissions");
        return true ;
        
    }
}