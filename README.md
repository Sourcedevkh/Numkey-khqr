# Eroxi Vending Machine

This project defines Numberkey buy payment products in vending machine auto that integrate with 
ABA Payway payment gateway 

---

## Process preview
<table>
  <tr>
    <td><img src="assets/generate_qr.png" alt="generateqr" width="350"></td>
    <td><img src="assets/payment_success.png" alt="paymentsucess" width="350"></td>
  </tr>
</table>


---

## Check transaction

#### Payment Success

- Status payment ```APPROVED```

```bash
"tran_id": "TX1776667858401"
```

Response

```bash
{
    "success": true,
    "data": {
        "data": {
            "payment_status_code": 0,
            "total_amount": 2500,
            "original_amount": 2500,
            "refund_amount": 0,
            "discount_amount": 0,
            "payment_amount": 0.63,
            "payment_currency": "USD",
            "apv": "645619",
            "payment_status": "APPROVED",
            "transaction_date": "2026-04-20 13:51:14"
        },
        "status": {
            "code": "00",
            "message": "Success!",
            "tran_id": "TX1776667858401"
        }
    }
}
```

---

#### Payment Failed

- Status payment ```PENDING```

```bash
"tran_id": "TX1776667532079"
```

Response

```bash
{
    "success": true,
    "data": {
        "data": {
            "payment_status_code": 2,
            "total_amount": 2500,
            "original_amount": 2500,
            "refund_amount": 0,
            "discount_amount": 0,
            "payment_amount": 0,
            "payment_currency": "",
            "apv": "",
            "payment_status": "PENDING",
            "transaction_date": "2026-04-20 13:45:32"
        },
        "status": {
            "code": "00",
            "message": "Success!",
            "tran_id": "TX1776667532079"
        }
    }
}
```
---


## Enums Reference


### Currency supported
|   Value    | Constant |
|------------|----------|
| `Currency` |  `KHR`   |
| `Currency` |  `USD`   |


## Scope Project 

- [x] Generate QRCode
- [x] Check Transaction
- [x] Close Transaction

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability in this feature, please report it responsibly by emailing:

📧 **khonchanphearaa@gmail.com**