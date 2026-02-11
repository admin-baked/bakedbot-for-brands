/**
 * Authorize.net Payment Service
 *
 * Handles payment processing for Vibe IDE full-stack conversions.
 * Uses Authorize.net Accept.js for PCI-compliant card tokenization.
 */

// @ts-expect-error - No type definitions available for authorizenet
import ApiContracts from 'authorizenet/lib/apicontracts';
// @ts-expect-error - No type definitions available for authorizenet
import ApiControllers from 'authorizenet/lib/apicontrollers';
import { logger } from '@/lib/logger';

// Get credentials from environment
const API_LOGIN_ID = process.env.AUTHORIZENET_API_LOGIN_ID || '';
const TRANSACTION_KEY = process.env.AUTHORIZENET_TRANSACTION_KEY || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface PaymentRequest {
  amount: number;
  opaqueDataDescriptor: string; // From Accept.js
  opaqueDataValue: string; // From Accept.js
  customerEmail: string;
  description: string;
  invoiceNumber?: string;
  customerId?: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  amount?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Process payment using Accept.js tokenized data
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  try {
    logger.info('[AUTHNET] Processing payment', {
      amount: request.amount,
      email: request.customerEmail,
    });

    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(API_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(TRANSACTION_KEY);

    const opaqueData = new ApiContracts.OpaqueDataType();
    opaqueData.setDataDescriptor(request.opaqueDataDescriptor);
    opaqueData.setDataValue(request.opaqueDataValue);

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(request.amount);

    // Add customer info
    const customerData = new ApiContracts.CustomerDataType();
    customerData.setEmail(request.customerEmail);
    transactionRequestType.setCustomer(customerData);

    // Add order info
    const orderType = new ApiContracts.OrderType();
    orderType.setDescription(request.description);
    if (request.invoiceNumber) {
      orderType.setInvoiceNumber(request.invoiceNumber);
    }
    transactionRequestType.setOrder(orderType);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    // Set endpoint (sandbox vs production)
    if (IS_PRODUCTION) {
      ctrl.setEnvironment('https://api.authorize.net/xml/v1/request.api');
    } else {
      ctrl.setEnvironment('https://apitest.authorize.net/xml/v1/request.api');
    }

    return new Promise((resolve) => {
      ctrl.execute(function () {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);

        if (!response) {
          logger.error('[AUTHNET] No response from Authorize.net');
          resolve({
            success: false,
            error: 'No response from payment gateway',
          });
          return;
        }

        const messages = response.getMessages();
        const transactionResponse = response.getTransactionResponse();

        if (
          messages.getResultCode() === ApiContracts.MessageTypeEnum.OK &&
          transactionResponse
        ) {
          const errors = transactionResponse.getErrors();
          if (errors && errors.length > 0) {
            const error = errors[0];
            logger.error('[AUTHNET] Transaction error', {
              code: error.getErrorCode(),
              text: error.getErrorText(),
            });
            resolve({
              success: false,
              error: error.getErrorText(),
              errorCode: error.getErrorCode(),
            });
            return;
          }

          logger.info('[AUTHNET] Transaction approved', {
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
          });

          resolve({
            success: true,
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
            amount: request.amount,
          });
        } else {
          const messageArray = messages.getMessage();
          const errorMessage = messageArray.length > 0
            ? `${messageArray[0].getCode()}: ${messageArray[0].getText()}`
            : 'Transaction failed';

          logger.error('[AUTHNET] Transaction failed', { errorMessage });

          resolve({
            success: false,
            error: errorMessage,
            errorCode: messageArray.length > 0 ? messageArray[0].getCode() : undefined,
          });
        }
      });
    });
  } catch (error) {
    logger.error('[AUTHNET] Payment processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Payment processing failed',
    };
  }
}

/**
 * Get Accept.js client key for frontend
 */
export function getAcceptJsConfig() {
  return {
    apiLoginID: API_LOGIN_ID,
    clientKey: process.env.AUTHORIZENET_CLIENT_KEY || '',
    isProduction: IS_PRODUCTION,
  };
}

/**
 * Refund a transaction
 */
export async function refundTransaction(
  transactionId: string,
  amount: number,
  lastFourDigits: string
): Promise<PaymentResult> {
  try {
    logger.info('[AUTHNET] Processing refund', { transactionId, amount });

    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(API_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(TRANSACTION_KEY);

    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(lastFourDigits);
    creditCard.setExpirationDate('XXXX');

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setRefTransId(transactionId);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    if (IS_PRODUCTION) {
      ctrl.setEnvironment('https://api.authorize.net/xml/v1/request.api');
    } else {
      ctrl.setEnvironment('https://apitest.authorize.net/xml/v1/request.api');
    }

    return new Promise((resolve) => {
      ctrl.execute(function () {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);

        if (!response) {
          resolve({ success: false, error: 'No response from payment gateway' });
          return;
        }

        const messages = response.getMessages();
        if (messages.getResultCode() === ApiContracts.MessageTypeEnum.OK) {
          logger.info('[AUTHNET] Refund approved', { transactionId });
          resolve({ success: true, transactionId });
        } else {
          const messageArray = messages.getMessage();
          const errorMessage = messageArray.length > 0
            ? messageArray[0].getText()
            : 'Refund failed';
          logger.error('[AUTHNET] Refund failed', { errorMessage });
          resolve({ success: false, error: errorMessage });
        }
      });
    });
  } catch (error) {
    logger.error('[AUTHNET] Refund error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Refund processing failed' };
  }
}
