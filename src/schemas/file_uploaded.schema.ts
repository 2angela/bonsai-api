import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Invoice } from './invoice.schema';

export type FileDocument = FileUploaded & Document;

@Schema({ collection: 'file_uploaded' })
export class FileUploaded {
  @Prop({ type: String })
  invoiceNumber: string;

  @Prop({ type: String })
  file_name: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String })
  bank: string;

  @Prop({ type: String })
  remark: string;

  @Prop({ type: String })
  fileUrl: string;

  @Prop({ type: Types.ObjectId, ref: Invoice.name })
  invoiceId: Types.ObjectId;
}

export const FileSchema = SchemaFactory.createForClass(FileUploaded);
FileSchema.index({ remark: 1, amount: 1 }, { unique: true });