import bakongConfig from '../config/bakong.config.js';
import { BakongKHQR, IndividualInfo, khqrData } from "bakong-khqr";
import logger from '../utils/logger.js';


class BakongController {

    /* Generate Bakong khqr */
    async generateBakongkhqr(req, res) {
        try {
            const {
                amount,
                currency = "USD",
                merchant_name = bakongConfig.bakong.merchantName,
                description,
            } = req.body;

            /* Checking validation required files, If not set Bakong env */
            if (!bakongConfig.bakong.accountId) {
                return res.status(500).json({
                    success: false,
                    message: 'Bakong accountId is not found in bakongConfig.json',
                })
            }

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount is required',
                })
            }

            /* Only support USD and KHR*/
            const currency_code = currency.toUpperCase() === "USD"
                ? khqrData.currency.USD
                : khqrData.currency.KHR;


            /* Build IndividualInfo (Personal Account) using the offical Bakong-SDK */
            const individualInfo = new IndividualInfo(
                bakongConfig.bakong.accountId,
                merchant_name,
                bakongConfig.bakong.merchantCity,
                {
                    currency: currency_code,
                    amount: Number(amount),
                    expirationTimestamp: Date.now() + (bakongConfig.bakong.qrExpirationSeconds * 1000),
                    purposeOfTransaction: description ?? "",
                });


            /* SDK generate khqr EMVCo handle all tags, CRC, timestamp */
            const khqr = new BakongKHQR();
            const response = khqr.generateIndividual(individualInfo);

            if (response.status.code !== 0) {
                logger.error('Bakong SDK error:', response.status);
                return res.status(500).json({
                    success: false,
                    message: response.status.message,
                })
            }

            const qrString = response.data.qr;
            const mdHash = response.data.md5;


            /* Render khqr image as base64 PNG can running on browser 
            for generate khqr scanning, Is not defult template QRCode Bakong */
            const qrImage = await QRCode.toDataURL(qrString, {
                errorCorrectionLevel: "M",
                type: "image/png",
                width: 300,
                margin: 2,
            })

            const expiresAt = new Date(Date.now() + bakongConfig.bakong.qrExpirationSeconds * 1000);

            return res.status(200).json({
                success: true,
                mdHash,
                qrString,
                qrImage,
                expiresAt: expiresAt.toISOString(),
                currency: currency.toUpperCase(),
                amount: Number(amount),
            })

        } catch (error) {
            logger.error('Error generating Bakong khqr:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }
    }



}