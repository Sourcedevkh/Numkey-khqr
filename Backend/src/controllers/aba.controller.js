import logger from "../utils/logger.js";

import abaServer from "../services/abaServer.js";
import { sendTelegramNotification } from "../services/telegramService.js";
import abaConfig from "../config/aba.config.js";
import { generateRequestTime, generateQRHash, generateCheckTransactionHash, generateTransactionId } from "../utils/hashGenerator.js";
import { normalizeItemsForAba } from "../utils/abaPayload.js";

class ABAController{
    constructor() {
        this.transactionMap = new Map();
        this.transactionTtlMs = 24 * 60 * 60 * 1000;
    }

    saveTransactionContext(tranId, context) {
        if (!tranId) return;

        this.transactionMap.set(tranId, {
            ...context,
            notified: false,
            createdAt: Date.now(),
        });

        const now = Date.now();
        for (const [id, value] of this.transactionMap.entries()) {
            if (now - value.createdAt > this.transactionTtlMs) {
                this.transactionMap.delete(id);
            }
        }
    }

    /* Checking condition if payment is approved after alert in telegram */
    isPaymentApproved(abaResponse) {
        const data = abaResponse?.data ?? abaResponse ?? {};
        const statusCode = data?.payment_status_code ?? abaResponse?.payment_status_code;
        const statusText = String(data?.payment_status ?? abaResponse?.payment_status ?? "").toUpperCase();
        return statusCode === 0 || statusText === "APPROVED";
    }

    async notifyTelegramIfNeeded(tranId, abaResponse) {
        const tx = this.transactionMap.get(tranId);
        if (!tx || tx.notified || !this.isPaymentApproved(abaResponse)) return;

        await sendTelegramNotification({
            amount: tx.amount,
            item: tx.item,
            slot: tx.slot,
        });

        tx.notified = true;
        this.transactionMap.set(tranId, tx);
    }

    /* ABA generate QRCode */
    async generateQRCode(req, res){
        try {
            const{
                amount,
                currency = "KHR",
                first_name,
                last_name,
                email,
                phone,
                purchase_type = "purchase",
                payment_option = "abapay_khqr",
                items,
                callback_url,
                return_deeplink,
                custom_fields,
                return_params,
                payout,
                lifetime,
                qr_image_template,
                slot,
            } = req.body;

            const req_time = generateRequestTime();
            const tran_id = generateTransactionId();
            const normalizedItems = normalizeItemsForAba(items);

            /* Prepare request payload for ABA api */
            const payload = {
                req_time,
                merchant_id: abaConfig.merchantId,
                tran_id,
                amount,
                items: normalizedItems,
                first_name: first_name ?? "",
                last_name: last_name ?? "",
                email: email ?? "",
                phone: phone ?? "",
                purchase_type,
                payment_option,
                callback_url: callback_url ?? "",
                return_deeplink: return_deeplink ?? "",
                currency,
                custom_fields: custom_fields ?? "",
                return_params: return_params ?? "",
                payout: payout ?? "",
                lifetime: lifetime ?? abaConfig.defaultLifetime,
                qr_image_template: qr_image_template ?? abaConfig.defaultTemplate,
            };

            payload.hash = generateQRHash(payload, abaConfig.apiKey);
            const abaResponse = await abaServer.generateQRCode(payload);

            /* Check if when ABA response is success 0: success */
            if (abaResponse.status?.code === "0") {
                this.saveTransactionContext(tran_id, {
                    amount: Number(amount),
                    item: req.body.item ?? items?.[0]?.name ?? "Unknown products name",
                    slot: String(slot ?? req.body.code ?? ""),
                });

                logger.success("QRCode generated success:", abaResponse);
                return res.status(200).json({
                    success: true,
                    merchant_id: abaConfig.merchantId,
                    tran_id,
                    amount,
                    currency,
                    payment_option,
                    qrString: abaResponse.qrString,
                    qrImage: abaResponse.qrImage,
                    abapay_deeplink: abaResponse.abapay_deeplink,
                    app_store: abaResponse.app_store,
                    play_store: abaResponse.play_store,
                    status: abaResponse.status,
                });
            }
            throw new Error("Failed to generate QRCode: " + abaResponse.status?.message);

        } catch (error) {
            logger.error("Error in generateQRCode: ", error);
            return res.status(error.httpStatus || 500).json({
                success: false,
                message: error.message,
                aba_status: error.apiResponse?.status ?? null,
            });
        }
    }

    /* ABA check transaction status */
    async checkTransaction(req, res){
        try {
            const {tran_id} = req.body;
            const req_time = generateRequestTime();
            const hash = generateCheckTransactionHash(req_time, abaConfig.merchantId, tran_id, abaConfig.apiKey);

            const payload = { req_time, merchant_id: abaConfig.merchantId, tran_id, hash };
            const abaResponse = await abaServer.checkTransaction(payload);

            await this.notifyTelegramIfNeeded(tran_id, abaResponse);

            logger.info('Check transaction response: ', tran_id);
            return res.status(200).json({ success: true, data: abaResponse });
            
        } catch (error) {
            logger.error("Error checking transaction:", error);
            return res.status(error.httpStatus || 500).json({
                success: false,
                message: error.apiResponse?.status?.message || error.message,
                aba_status: error.apiResponse?.status ?? null,
            });
        }
    }


    /* ABA close transaction */
    async closeTransaction(req, res){
        try {
            const {tran_id} = req.body;
            const req_time = generateRequestTime();
            const hash = generateCheckTransactionHash(req_time, abaConfig.merchantId, tran_id, abaConfig.apiKey);

            const payload = { req_time, merchant_id: abaConfig.merchantId, tran_id, hash };
            const abaResponse = await abaServer.closeTransaction(payload);

            logger.success("ABA Close transaction response:", abaResponse);
            return res.status(200).json({ success: true, data: abaResponse });
        } catch (error) {
            logger.error("Error closing transaction:", error);
            return res.status(error.httpStatus || 500).json({
                success: false,
                message: error.apiResponse?.status?.message || error.message,
                aba_status: error.apiResponse?.status ?? null,
            })
        }
    }
}

export default new ABAController();
