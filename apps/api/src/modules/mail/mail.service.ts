import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface SendPrescriptionEmailDto {
  to: string;
  patientName: string;
  prescriptionNo: string;
  doctorName: string;
  pdfBase64: string;
  filename: string;
}

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  private createTransport() {
    const user = this.config.get<string>("MAIL_USER");
    const pass = this.config.get<string>("MAIL_PASS");
    if (!user || !pass) {
      throw new InternalServerErrorException(
        "Email service not configured. Add MAIL_USER and MAIL_PASS to .env"
      );
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  }

  async sendPrescriptionEmail(dto: SendPrescriptionEmailDto): Promise<void> {
    const transport = this.createTransport();
    const from = this.config.get<string>("MAIL_USER");

    await transport.sendMail({
      from: `"${dto.doctorName}" <${from}>`,
      to: dto.to,
      subject: `Prescription – ${dto.patientName} (${dto.prescriptionNo})`,
      html: `
        <p>Dear ${dto.patientName},</p>
        <p>Please find your prescription attached as a PDF.</p>
        <p><strong>Prescription No:</strong> ${dto.prescriptionNo}<br>
        <strong>Doctor:</strong> ${dto.doctorName}</p>
        <p>Regards,<br>${dto.doctorName}</p>
      `,
      attachments: [
        {
          filename: dto.filename,
          content: Buffer.from(dto.pdfBase64, "base64"),
          contentType: "application/pdf"
        }
      ]
    });
  }
}
