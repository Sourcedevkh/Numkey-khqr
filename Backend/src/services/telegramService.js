import axios from 'axios';
import abaConfig from '../../abaConfig.json' with { type: 'json' };


const TELEGRAM_API_URL = `https://api.telegram.org/bot${abaConfig.TELETEGRAM_BOT_TOKEN}/sendMessage`;


/* Sends a formatted payment notification to Telegram */
export const sendTelegramNotification = async (paymentData) => {
    const { amount, item, slot, time } = paymentData;

    const amountNumber = Number(amount) || 0;
    const phnomPenhTime = time ?? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Phnom_Penh',
        }).format(new Date());

    const message = `💳 PAYMENT RECEIVED
Amount: ${amountNumber.toLocaleString('en-US')} ៛
Item: ${item}
Slot: ${slot}
Time: ${phnomPenhTime}`;

    try {
        const response = await axios.post(TELEGRAM_API_URL, {
            chat_id: abaConfig.TELETEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
        });
        console.log('Telegram notification sent:', response.data);
    } catch (error) {
        console.error('Error sending Telegram notification:', error.response?.data || error.message);
    }
};
