import { Injectable, HttpStatus } from '@nestjs/common';
import { FileDocument, FileUploaded } from 'src/schemas/file_uploaded.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { uploadToBucket } from 'src/modules/helper/google-storage.helper';
import { Invoice, InvoiceDocument } from 'src/schemas/invoice.schema';
import vision from '@google-cloud/vision';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private invoiceDoc: Model<InvoiceDocument>,
    @InjectModel(FileUploaded.name) private fileDoc: Model<FileDocument>
  ) {}

  public async verificationFile(payload) {
    try {
      const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString('utf8');
      const credentials = JSON.parse(keyFileContent);
      const client = new vision.ImageAnnotatorClient({ credentials });

      const [result] = await client.textDetection({
        image: { content: payload.file.buffer.toString('base64') }
      });
      const detections = result.textAnnotations;

      if (detections && detections.length > 0) {
        let query: any;
        if (payload.startDate || payload.endDate) {
          let valueDate: any;
          if (payload.startDate) {
            valueDate = {
              ...valueDate,
              $gte: new Date(payload.startDate)
            };
          }
          if (payload.endDate) {
            valueDate = {
              ...valueDate,
              $lte: new Date(payload.endDate).setUTCHours(23, 59, 59, 999)
            };
          }
          query = {
            valueDate
          };
        }

        let invList: InvoiceDocument[] = [];
        let remark = '';
        for (let i = 0; i < detections.length; i++) {
          const element = detections[i];
          // find invoices
          if (i > 0 && element.description && element.description.includes('INV')) {
            const inv = this.removeNaN(element.description);
            invList = await this.invoiceDoc.find({
              ...query,
              remark: { $regex: inv, $options: 'i' }
            });
            if (invList && invList.length > 0) {
              remark = element.description;
            }
          }
        }

        if (!remark || invList.length <= 0) {
          return {
            code: HttpStatus.NOT_FOUND,
            success: false,
            message: 'Invoice not found'
          };
        }

        // match amount
        const invDataIndex = invList.findIndex((inv) =>
          detections.some(
            (element: { description: string }, i: number) =>
              i > 0 &&
              (inv.amount.toString() == this.removeNaN(element.description) ||
                inv.amount.toString() + '00' == this.removeNaN(element.description))
          )
        );

        if (invDataIndex < 0) {
          return {
            code: HttpStatus.BAD_REQUEST,
            success: false,
            message: 'Invoice not found'
          };
        }

        const invData = invList[invDataIndex];

        const exists = await this.fileDoc.findOne({ remark: invData.remark, amount: invData.amount });

        // Upload file to bucket
        const publicUrl = await uploadToBucket(payload.file, (invData._id as Types.ObjectId).toString());

        const data = {
          remark: invData.remark,
          amount: invData.amount,
          file_name: payload.file.originalname,
          bank: invData.referenceNumber.split('VA')[0],
          referenceNumber: invData.referenceNumber,
          fileUrl: publicUrl,
          invoiceId: invData._id as Types.ObjectId
        };

        if (!exists) {
          await new this.fileDoc(data).save();
        }

        return {
          code: HttpStatus.OK,
          success: true,
          message: 'Data Verified',
          data: data
        };
      } else {
        return {
          code: HttpStatus.BAD_REQUEST,
          success: false,
          message: 'No text found in the image.'
        };
      }
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        message: error.message || 'Something went wrong'
      };
    }
  }

  removeNaN(text: string): string {
    return text
      .split('')
      .filter((char) => !isNaN(Number(char)) && char !== ' ')
      .join('');
  }

  public async getInvoice(payload: { remark?: string; status?: string }) {
    const filter: any = {};

    if (payload.remark && payload.remark.length > 0) {
      filter.remark = payload.remark;
    }

    filter.status = 'unpaid';

    const trxData = await this.invoiceDoc.find(filter);

    if (trxData && trxData.length > 0) {
      return {
        code: HttpStatus.OK,
        success: true,
        message: 'Success',
        data: trxData
      };
    } else {
      return {
        code: HttpStatus.NOT_FOUND,
        success: false,
        message: 'No invoice found'
      };
    }
  }

  public async updateStatus(invoiceNumber: string) {
    const invoice = await this.invoiceDoc.findOne({ invoiceNumber });

    if (!invoice) {
      return {
        code: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Invoice not found in collection invoice'
      };
    }

    const referenceNumber = invoice.referenceNumber;

    const fileMatched = await this.fileDoc.findOne({ remark: invoice.remark });

    if (!fileMatched) {
      return {
        code: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Remark not found in file_upload, cannot update invoice status'
      };
    }

    const updatedResult = await this.invoiceDoc.updateOne(
      { referenceNumber, status: { $ne: 'paid' } },
      { $set: { status: 'paid' } }
    );

    if (updatedResult.modifiedCount === 0) {
      return {
        code: HttpStatus.NOT_MODIFIED,
        success: false,
        message: 'All invoices already have the status paid'
      };
    }

    const updatedInvoices = await this.invoiceDoc
      .find({ referenceNumber, status: 'paid' })
      .select('invoiceNumber invoiceDate amount status referenceNumber');

    return {
      code: HttpStatus.OK,
      success: true,
      message: `${updatedResult.modifiedCount} invoice(s) updated to paid successfully.`,
      data: {
        totalMatchedInvoices: updatedResult.matchedCount,
        totalUpdatedInvoices: updatedResult.modifiedCount,
        updatedInvoices: updatedInvoices.map((invoice) => ({
          referenceNumber: invoice.referenceNumber,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          amount: invoice.amount,
          status: invoice.status
        }))
      }
    };
  }
}
