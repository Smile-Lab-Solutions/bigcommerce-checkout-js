import { type Coupon, type Fee, type GiftCertificate, type OrderFee, type Tax } from '@bigcommerce/checkout-sdk';
import React, { type FunctionComponent, memo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import OrderSummaryDiscount from './OrderSummaryDiscount';
import OrderSummaryPrice from './OrderSummaryPrice';

export interface OrderSummarySubtotalsProps {
    coupons: Coupon[];
    giftCertificates?: GiftCertificate[];
    discountAmount?: number;
    isTaxIncluded?: boolean;
    taxes?: Tax[];
    fees?: Fee[] | OrderFee[];
    giftWrappingAmount?: number;
    shippingAmount?: number;
    shippingAmountBeforeDiscount?: number;
    handlingAmount?: number;
    storeCreditAmount?: number;
    subtotalAmount: number;
    onRemovedGiftCertificate?(code: string): void;
    onRemovedCoupon?(code: string): void;
    isReorder?: boolean;
}

const OrderSummarySubtotals: FunctionComponent<OrderSummarySubtotalsProps> = ({
    discountAmount,
    giftCertificates,
    giftWrappingAmount,
    shippingAmount,
    shippingAmountBeforeDiscount,
    subtotalAmount,
    handlingAmount,
    storeCreditAmount,
    coupons,
    onRemovedGiftCertificate,
    onRemovedCoupon,
    isReorder
}) => {
    return (
        <>
            <OrderSummaryPrice
                amount={subtotalAmount}
                className="cart-priceItem--subtotal"
                label={<TranslatedString id="cart.subtotal_text" />}
                testId="cart-subtotal"
            />

            {(coupons || []).map((coupon, index) => (
                <OrderSummaryDiscount
                    amount={coupon.discountedAmount}
                    code={coupon.code}
                    key={index}
                    label={coupon.displayName}
                    onRemoved={onRemovedCoupon}
                    testId="cart-coupon"
                />
            ))}

            {!!discountAmount && (
                <OrderSummaryDiscount
                    amount={discountAmount}
                    label={<TranslatedString id="cart.discount_text" />}
                    testId="cart-discount"
                />
            )}

            {(giftCertificates || []).map((giftCertificate, index) => (
                <OrderSummaryDiscount
                    amount={giftCertificate.used}
                    code={giftCertificate.code}
                    key={index}
                    label={<TranslatedString id="cart.gift_certificate_text" />}
                    onRemoved={onRemovedGiftCertificate}
                    remaining={giftCertificate.remaining}
                    testId="cart-gift-certificate"
                />
            ))}

            {!!giftWrappingAmount && (
                <OrderSummaryPrice
                    amount={giftWrappingAmount}
                    label={<TranslatedString id="cart.gift_wrapping_text" />}
                    testId="cart-gift-wrapping"
                />
            )}

            <OrderSummaryPrice
                amount={shippingAmount}
                amountBeforeDiscount={shippingAmountBeforeDiscount}
                label={isReorder ? (<TranslatedString id="cart.shipping_text_reorder" />) : (<TranslatedString id="cart.shipping_text" />)}
                testId="cart-shipping"
                zeroLabel={<TranslatedString id="cart.free_text" />}
            />

            {!!handlingAmount && (
                <OrderSummaryPrice
                    amount={handlingAmount}
                    label={<TranslatedString id="cart.handling_text" />}
                    testId="cart-handling"
                />
            )}

            {!!storeCreditAmount && (
                <OrderSummaryDiscount
                    amount={storeCreditAmount}
                    label={<TranslatedString id="cart.store_credit_text" />}
                    testId="cart-store-credit"
                />
            )}
        </>
    );
};

export default memo(OrderSummarySubtotals);
