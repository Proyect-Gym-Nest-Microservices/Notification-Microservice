import { IsNotEmpty, IsString } from "class-validator";


export class PasswordResetEmailDto{

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    resetToken: string;
}