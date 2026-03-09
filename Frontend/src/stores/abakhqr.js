import { ref } from "vue";
import { defineStore } from "pinia";
import api from "../api/api";
import QRCode from "qrcode";
import products from "../../products.json";

export const useAbaKhqrStore = defineStore("abakhqr", () => {
    const enteredCode = ref("");
    const selectedProduct = ref(null);
    const qrData = ref(null);
    const loading = ref(false);
    const error = ref("");
    const showSuccessModal = ref(false);
    const paymentStatus = ref("");
    const checkingPayment = ref(false);
    const qrTimeRemaining = ref(0);

    let pollTimer = null;
    let qrExpireTimer = null;
    let countdownTimer = null;
    let pollRequestRunning = false;
    let pollAttempts = 0;
    const maxPollAttempts = 120;
    const pollIntervalMs = 5000;

    /* QR code timeout in 2 minutes if not paid */
    const qrTimeoutMs = 2 * 60 * 1000;
    const qrTotalSeconds = qrTimeoutMs / 1000;
    

    /* Get item form products.json format is JSON */
    const formatItems = (product) => {
        return [
            {
                name: product.product,
                quantity: 1,
                price: product.price,
            }
        ];
    };

    const findProductByCode = (code) => {
        return products.find((item) => item.code === code) ?? null;
    };

    const updateCode = (value) => {
        enteredCode.value = String(value ?? "").replace(/\D/g, "").slice(0, 2);
    };

    const clearCode = () => {
        enteredCode.value = "";
    };

    const backspaceCode = () => {
        enteredCode.value = enteredCode.value.slice(0, -1);
    };

    const appendCode = (digit) => {
        if (!/^\d$/.test(String(digit))) return;
        if (enteredCode.value.length >= 2) return;
        enteredCode.value += String(digit);

        /* Check if 2-digit is generate khqr auto */
        if (enteredCode.value.length === 2 && !loading.value) {
            void submitCode();
        }
    };

    const stopPaymentPolling = () => {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        pollAttempts = 0;
        pollRequestRunning = false;
        checkingPayment.value = false;
    };

    const stopCountdown = () => {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        qrTimeRemaining.value = 0;
    };

    const startCountdown = () => {
        stopCountdown();
        qrTimeRemaining.value = qrTotalSeconds;
        countdownTimer = setInterval(() => {
            qrTimeRemaining.value -= 1;
            if (qrTimeRemaining.value <= 0) {
                stopCountdown();
            }
        }, 1000);
    };

    /* Stop QR expiration timer */
    const stopQrExpireTimer = () => {
        if (qrExpireTimer) {
            clearTimeout(qrExpireTimer);
            qrExpireTimer = null;
        }
        stopCountdown();
    };

    const closeSuccessModal = () => {
        showSuccessModal.value = false;
    };

    const isPaymentSuccess = (checkResponse) => {
        const data = checkResponse?.data?.data;
        const statusCode = data?.payment_status_code;
        const statusText = String(data?.payment_status ?? "").toUpperCase();

        return statusCode === 0 || statusText === "APPROVED";
    };

    const getErrorMessage = (requestError, fallbackMessage) => {
        return requestError?.response?.data?.message
            ?? requestError?.message
            ?? fallbackMessage;
    };

    /* Check transaction status */
    const checkTransactionStatus = async (tranId) => {
        const response = await api.post("/api/payment/check-transaction", { tran_id: tranId });
        if (!response?.data?.success) {
            throw new Error(response?.data?.message ?? "Failed to check transaction.");
        }
        return response.data;
    };

    const closeTransaction = async (tranId) => {
        if (!tranId) return;
        await api.post("/api/payment/close-transaction", { tran_id: tranId });
    };

    const startQrExpireTimer = (tranId) => {
        stopQrExpireTimer();
        if (!tranId) return;

        startCountdown();

        qrExpireTimer = setTimeout(async () => {
            try {
                const latestStatus = await checkTransactionStatus(tranId);
                if (isPaymentSuccess(latestStatus)) {
                    qrData.value = null;
                    selectedProduct.value = null;
                    showSuccessModal.value = true;
                    stopPaymentPolling();
                    stopQrExpireTimer();
                    return;
                }
            } catch {
            }

            try {
                await closeTransaction(tranId);
            } catch {
            } finally {
                stopPaymentPolling();
                stopQrExpireTimer();
                qrData.value = null;
                selectedProduct.value = null;
                paymentStatus.value = "";
                error.value = "QR expired after 2 minutes. Please enter code again.";
            }
        }, qrTimeoutMs);
    };


    /* Start polling when check transaction if status success */
    const startPaymentPolling = (tranId) => {
        stopPaymentPolling();
        if (!tranId) return;

        checkingPayment.value = true;

        pollTimer = setInterval(async () => {
            if (pollRequestRunning) return;
            if (pollAttempts >= maxPollAttempts) {
                stopPaymentPolling();
                return;
            }

            pollRequestRunning = true;
            pollAttempts += 1;

            try {
                const checkResult = await checkTransactionStatus(tranId);
                paymentStatus.value = checkResult?.data?.data?.payment_status ?? "";

                if (isPaymentSuccess(checkResult)) {
                    qrData.value = null;
                    selectedProduct.value = null;
                    showSuccessModal.value = true;
                    stopPaymentPolling();
                    stopQrExpireTimer();
                }
            } catch {
            } finally {
                pollRequestRunning = false;
            }
        }, pollIntervalMs);
    };
    

    /* Generate QRcode after enter numKey */
    const submitCode = async () => {
        error.value = "";
        qrData.value = null;
        paymentStatus.value = "";
        showSuccessModal.value = false;
        stopPaymentPolling();
        stopQrExpireTimer();

        if (!enteredCode.value) {
            selectedProduct.value = null;
            error.value = "Please enter product code.";
            return;
        }

        const product = findProductByCode(enteredCode.value);
        selectedProduct.value = product;

        if (!product) {
            error.value = "Product code not found!. Code have (1-60) only.";
            return;
        }

        loading.value = true;
        try {
            const payload = {
                amount: product.price,
                currency: "KHR",
                first_name: "Khon",
                last_name: "Chanpheara",
                payment_option: "abapay_khqr",
                item: product.product,
                slot: product.code,
                lifetime: 3,
                items: formatItems(product),
            };

            const response = await api.post("/api/payment/generate-qrcode", payload);
            const responseData = response?.data;
            if (!responseData?.success) {
                throw new Error(responseData?.message ?? "Failed to generate QR code.");
            }

            // qrData.value = responseData;
            const currency = String(responseData.currency ?? "").toUpperCase();
            const amount = Number(responseData.amount);
            const formattedAmount = currency === "KHR"
            ? `\u17DB${amount.toLocaleString("en-US")}`
            : `$${amount.toFixed(2)}`;
            
            const qrBarcode = responseData.qrString
            ? await QRCode.toDataURL(responseData.qrString, { width: 220, margin: 1 })
            : null;
            
            qrData.value = { ...responseData, formattedAmount, qrBarcode };
            console.log("QR Data:", qrData.value);
            
            enteredCode.value = "";
            startPaymentPolling(responseData?.tran_id);
            startQrExpireTimer(responseData?.tran_id);
        } catch (requestError) {
            error.value = getErrorMessage(requestError, "Unable to connect to backend API.");
        } finally {
            loading.value = false;
        }
    };

    return {
        enteredCode,
        selectedProduct,
        qrData,
        loading,
        error,
        showSuccessModal,
        paymentStatus,
        checkingPayment,
        qrTimeRemaining,
        qrTotalSeconds,
        updateCode,
        clearCode,
        backspaceCode,
        appendCode,
        closeSuccessModal,
        stopPaymentPolling,
        stopQrExpireTimer,
        submitCode,
    };
})