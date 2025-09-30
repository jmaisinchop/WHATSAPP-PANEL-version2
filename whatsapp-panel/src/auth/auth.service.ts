import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email no encontrado');
    }
    const isValid = await this.userService.validatePassword(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    return user; // Retorna el usuario
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName   };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
