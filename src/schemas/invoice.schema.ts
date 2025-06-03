import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ collection: 'invoice' })
export class Invoice {
  @Prop({ type: String })
  invoiceNumber: string;

  @Prop({ type: String })
  invoiceDate: string;

  @Prop({ type: String })
  status: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String })
  senderAccountName: string;

  @Prop({ type: String })
  senderAccountNumber: string;

  @Prop({ type: String })
  beneficiaryAccountName: string;

  @Prop({ type: String })
  beneficiaryAccountNumber: string;

  @Prop({ type: Date })
  valueDate: Date;

  @Prop({ type: String })
  referenceNumber: string;

  @Prop({ type: String })
  remark: string;

  @Prop({ type: String })
  customerRefNumber: string;

  @Prop({ type: String })
  transactionId: string;

  @Prop({ type: String })
  transactionType: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
