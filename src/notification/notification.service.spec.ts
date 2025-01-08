import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import * as sendgrid from '@sendgrid/mail';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { PasswordResetEmailDto } from './dto/password-reset-email.dto';
import { envs } from '../config/envs.config';

// Mock sendgrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    const mockPasswordResetEmailDto: PasswordResetEmailDto = {
      email: 'test@example.com',
      resetToken: 'mock-reset-token',
    };

    const expectedEmailMsg = {
      to: mockPasswordResetEmailDto.email,
      from: {
        email: envs.SENDGRID_FROM_EMAIL,
        name: envs.SENDGRID_FROM_NAME,
      },
      subject: 'Restablecer contraseña',
      text: `Usa este token para restablecer tu contraseña: ${mockPasswordResetEmailDto.resetToken}`,
      html: expect.stringContaining(mockPasswordResetEmailDto.resetToken),
    };

    it('should send email successfully', async () => {
      const mockResponse = [{ statusCode: 202, body: {}, headers: {} }];
      (sendgrid.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.sendEmail(mockPasswordResetEmailDto);

      expect(sendgrid.send).toHaveBeenCalledWith(expect.objectContaining(expectedEmailMsg));
      expect(result).toEqual({
        message: 'Email sent successfully',
        statusCode: 202,
      });
    });

    it('should throw RpcException when sendgrid returns non-success status code', async () => {
      const mockResponse = [{ statusCode: 400, body: {}, headers: {} }];
      (sendgrid.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(service.sendEmail(mockPasswordResetEmailDto)).rejects.toThrow(
        new RpcException({
          message: 'Unexpected status code: 400',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
    });

    it('should throw RpcException when sendgrid throws an error', async () => {
      const mockError = new Error('SendGrid API error');
      (sendgrid.send as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(service.sendEmail(mockPasswordResetEmailDto)).rejects.toThrow(
        new RpcException({
          message: 'Failed to send email: SendGrid API error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
    });

    it('should rethrow RpcException when caught error is RpcException', async () => {
      const rpcError = new RpcException({
        message: 'Original RPC error',
        status: HttpStatus.BAD_REQUEST,
      });
      (sendgrid.send as jest.Mock).mockRejectedValueOnce(rpcError);

      await expect(service.sendEmail(mockPasswordResetEmailDto)).rejects.toThrow(rpcError);
    });

    it('should verify email template content', async () => {
      const mockResponse = [{ statusCode: 202, body: {}, headers: {} }];
      (sendgrid.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await service.sendEmail(mockPasswordResetEmailDto);

      const emailCall = (sendgrid.send as jest.Mock).mock.calls[0][0];
      
      expect(emailCall.html).toContain('Tu código de restablecimiento de contraseña es:');
      expect(emailCall.html).toContain(mockPasswordResetEmailDto.resetToken);
      expect(emailCall.html).toContain('Para restablecer tu contraseña:');
      expect(emailCall.html).toContain('Si no has solicitado un restablecimiento de contraseña');
      
      expect(emailCall.text).toContain('Usa este token para restablecer tu contraseña:');
      expect(emailCall.text).toContain(mockPasswordResetEmailDto.resetToken);
    });
  });
});